import { $Dom } from "./$Dom.js";
import { TUtil } from "./TUtil.js";
import { getRunScheduler } from "./App.js";

/**
 * It provides a central place for managing fetching of external APIs and images. 
 */
class LoadingManager {
    constructor() {
        this.resultMap = {};
        
        this.fetchingAPIMap = {};
        this.fetchingImageMap = {};
    }

    fetchCommon(fetchId, tmodel, fetchMap, fetchFn) {
        if (this.isFetched(fetchId)) {
            if (typeof tmodel.targets[tmodel.key]?.onSuccess === 'function' && tmodel.isTargetEnabled(tmodel.key)) {
                tmodel.targets[tmodel.key].onSuccess.call(tmodel, this.resultMap[fetchId]);
            }            
        } else if (fetchMap[fetchId]) {
            fetchMap[fetchId].targets.push({ tmodel, targetName: tmodel.key });
        } else {
            fetchMap[fetchId] = {
                fetchId,
                fetchingFlag: true,
                startTime: TUtil.now(),
                fetchTime: undefined,
                targets: [ { tmodel, targetName: tmodel.key } ],
                fetchMap
            };            
            fetchFn();
        }

        return this.getFetchingPeriod(fetchId);
    }

    fetch(tmodel, url, query, fetchId) {
        fetchId = fetchId || `${tmodel.oid}_${url}_${JSON.stringify(query)}`;
        return this.fetchCommon(fetchId, tmodel, this.fetchingAPIMap, () => {
            this.ajaxAPI(url, query, this.fetchingAPIMap[fetchId]);
        });
    }

    fetchImage(tmodel, src, fetchId) {
        fetchId = fetchId || `${tmodel.oid}_${src}`;
        return this.fetchCommon(fetchId, tmodel, this.fetchingImageMap, () => {
            this.loadImage(src, this.fetchingImageMap[fetchId]);
        });
    }

    isFetching(fetchId) {
        return this.fetchingAPIMap[fetchId]?.fetchingFlag ?? false;
    }

    isFetched(fetchId) {
        return this.resultMap[fetchId]?.success ?? false;
    }

    getFetchingPeriod(fetchId) {
        if (this.fetchingAPIMap[fetchId]) {
            const { startTime, fetchTime } = this.fetchingAPIMap[fetchId];
            return fetchTime === undefined ? TUtil.now() - startTime : fetchTime - startTime;
        }
    } 

    fetchResult(fetchId) {
        return this.resultMap[fetchId];
    }

    getFetchErrors(fetchId) {
        return this.resultMap[fetchId]?.result?.errors;
    }

    handleSuccess(fetchStatus, result) {
        fetchStatus.fetchingFlag = false;
        fetchStatus.fetchTime = fetchStatus.fetchTime || TUtil.now();
        const { fetchId, fetchTime, startTime, targets, fetchMap } = fetchStatus;

        this.resultMap[fetchId] = {
            fetchingPeriod: fetchTime - startTime,
            success: true,
            result
        };

        targets.forEach(({ tmodel, targetName }) => {
            if (typeof tmodel.targets[targetName]?.onSuccess === 'function' && tmodel.isTargetEnabled(targetName)) {
                tmodel.targets[targetName].onSuccess.call(tmodel, this.resultMap[fetchId]);
            }
        });
        
        delete fetchMap.fetchId;

        getRunScheduler().schedule(0, `api_success_${fetchId}`);
    }

    handleError(fetchStatus, error) {
        fetchStatus.fetchingFlag = false;
        fetchStatus.fetchTime = fetchStatus.fetchTime || TUtil.now();
        const { fetchId, fetchTime, startTime, targets, fetchMap } = fetchStatus;

        this.resultMap[fetchId] = {
            fetchingPeriod: fetchTime - startTime,
            success: false,
            error
        };

        targets.forEach(({ tmodel, targetName }) => {
            if (typeof tmodel.targets[targetName]?.onError === 'function') {
                tmodel.targets[targetName].onError.call(tmodel, this.resultMap[fetchId]);
            }
        });
        
        delete fetchMap.fetchId;

        getRunScheduler().schedule(0, `api_error_${fetchId}`);
    }

    ajaxAPI(url, query, fetchStatus) {
        const defaultQuery = {
            dataType: "json",
            type: "GET",
            success: dataList => this.handleSuccess(fetchStatus, dataList),
            error: textStatus => this.handleError(fetchStatus, textStatus)
        };

        $Dom.ajax({ ...defaultQuery, url, ...{ data: query } });
    }

    loadImage(src, fetchStatus) {
        const image = new Image();
        image.src = src;

        image.onload = () => {
            const result = {
                width: image.width,
                height: image.height,
                src: image.src
            };
            this.handleSuccess(fetchStatus, result);
        };

        image.onerror = image.onerror = () => {
            this.handleError(fetchStatus, "not found");
        };
    }
}

export { LoadingManager };
