import { $Dom } from "./$Dom.js";
import { TUtil } from "./TUtil.js";
import { getRunScheduler } from "./App.js";
import { TargetUtil } from "./TargetUtil.js";

/**
 * It provides a central place for managing fetching of external APIs and images. 
 */
class LoadingManager {
    constructor() {
        this.cacheMap = {};
        
        this.tmodelKeyMap = {};
        this.fetchingAPIMap = {};
        this.fetchingImageMap = {};
    }

    fetchCommon(fetchId, cacheId, tmodel, fetchMap, fetchFn) {
        if (cacheId && this.isFetched(cacheId)) {
            if (typeof tmodel.targets[tmodel.key]?.onSuccess === 'function' && tmodel.isTargetEnabled(tmodel.key)) {
                tmodel.targets[tmodel.key].onSuccess.call(tmodel, { ...this.cacheMap[cacheId], fetchingPeriod: 0 });
            }            
        } else if (fetchMap[fetchId]) {
            this.addToTModelKeyMap(tmodel, tmodel.key);
            fetchMap[fetchId].targets.push({ tmodel, targetName: tmodel.key });
        } else {
            this.addToTModelKeyMap(tmodel, tmodel.key);
            fetchMap[fetchId] = {
                fetchId,
                cacheId,
                fetchingFlag: true,
                startTime: TUtil.now(),
                targets: [ { tmodel, targetName: tmodel.key } ],
                fetchMap
            };            
            fetchFn();
        }
        
        return fetchId;
    }
    
    addToTModelKeyMap(tmodel, targetName) {
        const key = `${tmodel.oid} ${targetName}`;
        this.tmodelKeyMap[key] = true;
    }
    
    removeFromTModelKeyMap(tmodel, targetName) {
        const key = `${tmodel.oid} ${targetName}`;
        delete this.tmodelKeyMap[key];        
    }
    
    isInTModelKeyMap(tmodel, targetName) {
        const key = `${tmodel.oid} ${targetName}`;
        return this.tmodelKeyMap[key];
    }

    fetch(tmodel, url, query, cacheId) {
        const fetchId = `${tmodel.oid}_${url}_${JSON.stringify(query)}`;
        return this.fetchCommon(fetchId, cacheId, tmodel, this.fetchingAPIMap, () => {
            this.ajaxAPI(url, query, this.fetchingAPIMap[fetchId]);
        });
    }

    fetchImage(tmodel, src, cacheId) {
        const fetchId = `${tmodel.oid}_${src}`;
        return this.fetchCommon(fetchId, cacheId, tmodel, this.fetchingImageMap, () => {
            this.loadImage(src, this.fetchingImageMap[fetchId]);
        });
    }

    isFetching(fetchId) {
        return this.fetchingAPIMap[fetchId]?.fetchingFlag ?? false;
    }

    isFetched(cacheId) {
        return this.cacheMap[cacheId]?.success ?? false;
    }

    getFetchingPeriod(fetchId) {
        return this.fetchingAPIMap[fetchId] ? TUtil.now() - this.fetchingAPIMap[fetchId].startTime : undefined;
    } 

    fetchCache(cacheId) {
        return this.cacheMap[cacheId];
    }

    handleSuccess(fetchStatus, result) {
        const fetchTime = TUtil.now();
        const { fetchId, cacheId, startTime, targets, fetchMap } = fetchStatus;

        const res = {
            fetchingPeriod: fetchTime - startTime,
            success: true,
            result
        };

        targets.forEach(({ tmodel, targetName }) => {
            this.removeFromTModelKeyMap(tmodel, targetName);
            if (typeof tmodel.targets[targetName]?.onSuccess === 'function' && tmodel.isTargetEnabled(targetName)) {
                tmodel.targets[targetName].onSuccess.call(tmodel, res);
            }
            tmodel.val(targetName, result);
            TargetUtil.shouldActivateNextTarget(tmodel, targetName);
        });
        
        delete fetchMap[fetchId];
        
        if (cacheId) {
            this.cacheMap[cacheId] = res;
        }
        getRunScheduler().schedule(0, `api_success_${fetchId}`);
    }

    handleError(fetchStatus, error) {
        const fetchTime = TUtil.now();
        const { fetchId, cacheId, startTime, targets, fetchMap } = fetchStatus;

        const res = {
            fetchingPeriod: fetchTime - startTime,
            success: false,
            error
        };

        targets.forEach(({ tmodel, targetName }) => {
            this.removeFromTModelKeyMap(tmodel, targetName);            
            if (typeof tmodel.targets[targetName]?.onError === 'function') {
                tmodel.targets[targetName].onError.call(tmodel, res);
            }
            tmodel.actualValues[targetName] = res;
            TargetUtil.shouldActivateNextTarget(tmodel, targetName);            
        });
        
        delete fetchMap[fetchId];
        
        if (cacheId) {
            this.cacheMap[cacheId] = res;
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
