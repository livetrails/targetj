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
        this.currentOidFetchIds = {};
        this.allOidFetchIds = {};        
    }
   
    initializeFetchEntry(fetchId, tmodel, targetMap) {
        targetMap[fetchId] = {
            fetchId,
            fetchingFlag: true,
            startTime: TUtil.now(),
            fetchTime: undefined,
            success: undefined,
            attempts: targetMap[fetchId]?.attempts ?? 0,
            tmodel: targetMap[fetchId]?.tmodel || tmodel,
            targetName: targetMap[fetchId]?.targetName || tmodel.key,
        };

        this.currentOidFetchIds[tmodel.oid] ||= {};
        this.currentOidFetchIds[tmodel.oid][fetchId] ||= true;
        
        this.allOidFetchIds[tmodel.oid] ||= {};
        this.allOidFetchIds[tmodel.oid][fetchId] ||= true;        
    }

    fetchCommon(fetchId, tmodel, fetchMap, fetchFn) {
        if (this.isFetched(fetchId)) {
            this.handleSuccess(fetchMap[fetchId], this.resultMap[fetchId].result);
        } else if (!this.isFetching(fetchId)) {
            this.initializeFetchEntry(fetchId, tmodel, fetchMap);
            fetchFn();
        }

        return this.getFetchingPeriod(fetchId);
    }

    fetch(tmodel, url, query) {
        const fetchId = `${url}_${JSON.stringify(query)}`;
        return this.fetchCommon(fetchId, tmodel, this.fetchingAPIMap, () => {
            this.ajaxAPI(url, query, this.fetchingAPIMap[fetchId]);
        });
    }

    fetchImage(tmodel, src) {
        const fetchId = src;
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
    
    getCurrentFetchIds(oid) {
        return this.currentOidFetchIds[oid] ? Object.keys(this.currentOidFetchIds[oid]) : []; 
    }
    
    getAllFetchIds(oid) {
        return this.allOidFetchIds[oid] ? Object.keys(this.allOidFetchIds[oid]) : []; 
    }    

    fetchResult(fetchId) {
        return this.resultMap[fetchId];
    }

    isFetchSuccessful(fetchId) {
        return this.resultMap[fetchId]?.success || false;
    }

    getFetchErrors(fetchId) {
        return this.resultMap[fetchId]?.result?.errors;
    }

    handleSuccess(fetchStatus, result) {
        fetchStatus.fetchingFlag = false;
        fetchStatus.success = true;
        fetchStatus.fetchTime = fetchStatus.fetchTime || TUtil.now();
        const { fetchId, fetchTime, startTime, tmodel, targetName } = fetchStatus;
        fetchStatus.attempts++;
        delete this.currentOidFetchIds[tmodel.oid][fetchId];

        this.resultMap[fetchId] = {
            fetchingPeriod: fetchTime - startTime,
            success: true,
            result
        };

        if (typeof tmodel.targets[targetName]?.onSuccess === 'function' && tmodel.isTargetEnabled(targetName)) {
            tmodel.targets[targetName].onSuccess.call(tmodel, this.resultMap[fetchId]);
        }

        getRunScheduler().schedule(0, `api_success_${fetchId}`);
    }

    handleError(fetchStatus, error) {
        fetchStatus.fetchingFlag = false;
        fetchStatus.success = false;
        fetchStatus.fetchTime = fetchStatus.fetchTime || TUtil.now();
        const { fetchId, fetchTime, startTime, tmodel, targetName } = fetchStatus;
        fetchStatus.attempts++;
        delete this.currentOidFetchIds[tmodel.oid][fetchId];

        this.resultMap[fetchId] = {
            fetchingPeriod: fetchTime - startTime,
            success: false,
            error
        };

        if (typeof tmodel.targets[targetName]?.onError === 'function') {
            tmodel.targets[targetName].onError.call(tmodel, this.resultMap[fetchId]);
        }

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
