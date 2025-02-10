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
        this.addToTModelKeyMap(tmodel, tmodel.key, fetchId, cacheId);

        if (!cacheId || !this.isFetched(cacheId)) {
            if (!fetchMap[fetchId]) {
                fetchMap[fetchId] = {
                    fetchId,
                    cacheId,
                    fetchingFlag: true,
                    startTime: TUtil.now(),
                    targets: [{ tmodel, targetName: tmodel.key }],
                    fetchMap
                };            
                fetchFn();
            } else {
                fetchMap[fetchId].targets.push({ tmodel, targetName: tmodel.key });
            }
        }

        return fetchId;
    }
    
    getTModelKey(tmodel, targetName) {
        return `${tmodel.oid} ${targetName}`;
    }

    addToTModelKeyMap(tmodel, targetName, fetchId, cacheId) {
        const key = this.getTModelKey(tmodel, targetName);
        if (!this.tmodelKeyMap[key]) {
            this.tmodelKeyMap[key] = { fetchMap: {}, entryCount: 0, resultCount: 0, errorCount: 0 };
        }

        if (!this.tmodelKeyMap[key].fetchMap[fetchId]) {
            this.tmodelKeyMap[key].fetchMap[fetchId] = { 
                fetchId, 
                order: this.tmodelKeyMap[key].entryCount, 
                cachedValue: cacheId && this.isFetched(cacheId) ? this.cacheMap[cacheId] : undefined 
            };
            this.tmodelKeyMap[key].entryCount++;
        }
    }
    
    initializeLoaderTargetValue(tmodel, targetName) {
        const key = this.getTModelKey(tmodel, targetName);
        const tmodelEntry = this.tmodelKeyMap[key];

        if (!tmodelEntry) {
            return;
        }
        
        tmodelEntry.resultCount = 0;

        if (tmodelEntry.entryCount > 1) {
            const fetchEntries = Object.values(tmodelEntry.fetchMap);
            const targetValue = Array.from({ length: tmodelEntry.entryCount }, (_, i) => {
                const fetchEntry = fetchEntries.find(entry => entry.order === i);
                if (fetchEntry?.cachedValue !== undefined) {
                    tmodelEntry.resultCount++;
                    this.callOnSuccessHandler(tmodel, targetName, { ...fetchEntry.cachedValue, fetchingPeriod: 0, order: i });
                    return fetchEntry.cachedValue.result;
                }
                                 
                return undefined;
            });

            tmodel.val(targetName, targetValue);
        } else {
            const singleEntry = Object.values(tmodelEntry.fetchMap)[0];
            if (singleEntry?.cachedValue !== undefined) {
                tmodel.val(targetName, singleEntry.cachedValue.result);
                   
                this.callOnSuccessHandler(tmodel, targetName, { ...singleEntry.cachedValue, fetchingPeriod: 0, order: 0 });
                
                tmodelEntry.resultCount = 1;
            } else {
                tmodel.val(targetName, undefined);
            }
        }
        
        if (tmodelEntry.resultCount === tmodelEntry.entryCount) {
            this.removeFromTModelKeyMap(tmodel, targetName);            
            TargetUtil.shouldActivateNextTarget(tmodel, targetName);
        }
    }

    removeFromTModelKeyMap(tmodel, targetName) {
        const key = this.getTModelKey(tmodel, targetName);
        delete this.tmodelKeyMap[key];  
    }
    
    isInTModelKeyMap(tmodel, targetName) {
        const key = this.getTModelKey(tmodel, targetName);
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
            const key = this.getTModelKey(tmodel, targetName);
            const tmodelEntry = this.tmodelKeyMap[key];

            if (!tmodelEntry) {
                return;
            }
                 
            const fetchEntry = tmodelEntry.fetchMap[fetchId];
            this.callOnSuccessHandler(tmodel, targetName, { ...res, order: fetchEntry.order });

            if (tmodelEntry.entryCount > 1) {
                let targetResults = tmodel.val(targetName);
                const fetchEntry = tmodelEntry.fetchMap[fetchId];

                targetResults[fetchEntry.order] = res.result;
                tmodelEntry.resultCount++;

                if (tmodelEntry.resultCount === tmodelEntry.entryCount) {
                    this.removeFromTModelKeyMap(tmodel, targetName);
                    if (tmodelEntry.errorCount === 0) {
                        TargetUtil.shouldActivateNextTarget(tmodel, targetName); 
                    } else {
                        this.callOnErrorHandler(tmodel, targetName);
                    }
                }
            } else {
                tmodel.val(targetName, res.result);
                this.removeFromTModelKeyMap(tmodel, targetName);            
                TargetUtil.shouldActivateNextTarget(tmodel, targetName); 
            }    
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

        targets.forEach(({ tmodel, targetName }) => {
            const key = `${tmodel.oid} ${targetName}`;
            const tmodelEntry = this.tmodelKeyMap[key];
            
            if (!tmodelEntry) {
                return;
            }
            
            const fetchEntry = tmodelEntry.fetchMap[fetchId];
            
            const res = {
                fetchingPeriod: fetchTime - startTime,
                success: false,
                order: fetchEntry.order,
                error
            };            
            
            if (tmodelEntry.entryCount > 1) {
                const targetValue = tmodel.val(targetName);

                targetValue[fetchEntry.order] = res;
                tmodelEntry.resultCount++;
                tmodelEntry.errorCount++;
                
                if (tmodelEntry.resultCount === tmodelEntry.entryCount) {
                    this.removeFromTModelKeyMap(tmodel, targetName);   
                    this.callOnErrorHandler(tmodel, targetName);
                }
            } else {
                tmodel.val(targetName, res);
                this.removeFromTModelKeyMap(tmodel, targetName);            
            } 
            
        });
        
        delete fetchMap[fetchId];
        
        if (cacheId) {
            delete this.cacheMap[cacheId];
        }

        getRunScheduler().schedule(0, `api_error_${fetchId}`);
    }
    
    callOnSuccessHandler(tmodel, targetName, res) {        
        const onSuccess = tmodel.targets[targetName]?.onSuccess;
         if (onSuccess) {

             if (typeof onSuccess === 'function') {
                 onSuccess.call(tmodel, res);
             } else if (Array.isArray(onSuccess)) {
                 onSuccess.forEach(t => TargetUtil.activateSingleTarget(tmodel, t));
             } else {
                 TargetUtil.activateSingleTarget(tmodel, onSuccess);
             }
         }           
    }
    
    callOnErrorHandler(tmodel, targetName) {
        const onError = tmodel.targets[targetName]?.onError;
        if (onError) {
            
            if (typeof onError === 'function') {
                onError.call(tmodel, tmodel.val(targetName));
            } else if (Array.isArray(onError)) {
                onError.forEach(t => TargetUtil.activateSingleTarget(tmodel, t));
            } else {
                TargetUtil.activateSingleTarget(tmodel, onError);
            }
        }
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
        
        image.onerror = () => {
            this.handleError(fetchStatus, "not found");
        };        
    }
}

export { LoadingManager };
