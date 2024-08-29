import { $Dom } from "./$Dom.js";
import { browser } from "./Browser.js";
import { TUtil } from "./TUtil.js";
import { tApp } from "./App.js";

class LoadingManager {
    constructor() {
        this.resultMap = {};
        this.loadingMap = {};

        this.singleLoadList = undefined;
        this.groupLoadList = undefined;
        this.imgLoadList = undefined;

        this.stopLoadingAfterAttempts = TUtil.isDefined(tApp.stopLoadingAfterAttempts) ? tApp.stopLoadingAfterAttempts : 10;
        this.attemptFailedInterval = TUtil.isDefined(tApp.attemptFailedInterval) ? tApp.attemptFailedInterval : 2000;

        this.statistics = {};
    }

    initSingleLoad(fetchId, query, forceLoad) {
        if (this.isLoading(fetchId) || (this.isLoaded(fetchId) && !forceLoad) || this.getLoadingAttempts(fetchId) > this.stopLoadingAfterAttempts) {
            return;
        }

        this.initLoadingMap(fetchId);

        this.singleLoadList = this.singleLoadList || {};
        this.singleLoadList[fetchId] = { fetchId, query };
    }

    initGroupLoad(fetchId, dataId, query, idKey, separator) {
        const groupId = JSON.stringify({ query, idKey, separator });

        if (this.isLoading(fetchId) || this.isLoaded(fetchId) || this.getLoadingAttempts(fetchId) > this.stopLoadingAfterAttempts) {
            return;
        }

        this.initLoadingMap(fetchId);

        this.groupLoadList = this.groupLoadList || {};
        if (!this.groupLoadList[groupId]) {
            this.groupLoadList[groupId] = [];
        }

        this.groupLoadList[groupId].push({ fetchId, dataId });
    }

    initImgLoad(fetchId, src) {
        if (this.isLoading(fetchId) || this.isLoaded(fetchId) || this.getLoadingAttempts(fetchId) > this.stopLoadingAfterAttempts) {
            return;
        }

        this.initLoadingMap(fetchId, 'image');

        this.imgLoadList = this.imgLoadList || {};
        this.imgLoadList[fetchId] = { fetchId, src };
    }

    isLoading(fetchId) {
        return TUtil.isDefined(this.loadingMap[fetchId]) ? this.loadingMap[fetchId].loadingFlag : false;
    }

    isLoaded(fetchId) {
        return TUtil.isDefined(this.resultMap[fetchId]) && this.resultMap[fetchId].success === true;
    }

    getLoadingAttempts(fetchId) {
        return TUtil.isDefined(this.loadingMap[fetchId]) ? this.loadingMap[fetchId].attempts : 0;
    }

    getSuccessLoadingTime(fetchId) {
        return TUtil.isDefined(this.loadingMap[fetchId]) && this.loadingMap[fetchId].success === true ? this.loadingMap[fetchId].loadingTime : undefined;
    }

    getFailedInterval(fetchId) {
        return TUtil.isDefined(this.loadingMap[fetchId]) ? this.loadingMap[fetchId].attempts * this.attemptFailedInterval : 0;
    }

    fetchResult(fetchId) {
        return this.resultMap[fetchId];
    }

    hasLoadedSuccessfully(fetchId) {
        return this.resultMap[fetchId] && this.resultMap[fetchId].success === true;
    }

    hasLoadedUnsuccessfully(fetchId) {
        return this.resultMap[fetchId] && this.resultMap[fetchId].success === false;
    }

    fetchErrors(fetchId) {
        return this.resultMap[fetchId]?.result?.errors;
    }

    initLoadingMap(fetchId, category) {
        category = category || this.getCategoryFromFetchId(fetchId);

        if (TUtil.isDefined(this.loadingMap[fetchId])) {
            Object.assign(this.loadingMap[fetchId], {
                loadingFlag: true,
                startTime: browser.now(),
                loadingTime: undefined
            });
        } else {
            this.loadingMap[fetchId] = {
                fetchId,
                category,
                loadingFlag: true,
                attempts: 0,
                startTime: browser.now(),
                loadingTime: undefined,
                success: false
            };
        }
    }

    groupLoad() {
        if (!this.groupLoadList) {
            return;
        }

        const groupIds = Object.keys(this.groupLoadList);

        groupIds.forEach(groupId => {
            const fetchList = this.groupLoadList[groupId];

            const dataIds = [];
            const dataIdFetchIdMap = {};

            fetchList.forEach(({ dataId, fetchId }) => {
                dataIds.push(dataId);
                dataIdFetchIdMap[dataId] = fetchId;
            });

            if (dataIds.length > 0) {
                const groupObj = JSON.parse(groupId);
                const groupQuery = this.updateQueryValue(groupObj.query, dataIds.join(groupObj.separator));
                this.groupAjax(groupQuery, dataIdFetchIdMap, groupObj.idKey);
            }

            delete this.groupLoadList[groupId];
        });

        this.groupLoadList = undefined;
    }

    singleLoad() {
        if (!this.singleLoadList) {
            return;
        }

        Object.values(this.singleLoadList).forEach(({ query, fetchId }) => {
            this.singleAjax(query, fetchId);
        });

        this.singleLoadList = undefined;
    }

    imgLoad() {
        if (!this.imgLoadList) {
            return;
        }

        Object.values(this.imgLoadList).forEach(({ src, fetchId }) => {
            this.imgAjax(src, fetchId);
        });

        this.imgLoadList = undefined;
    }

    updateQueryValue(query, value) {
        Object.keys(query).forEach(prop => {
            if (query[prop] === '%s') {
                query[prop] = value;
            } else if (query[prop] === '%d') {
                query[prop] = typeof value === 'number' ? value : parseFloat(value);
            } else if (typeof query[prop] === 'object') {
                this.updateQueryValue(query[prop], value);
            }
        });
        return query;
    }

    singleAjax(query, fetchId) {
        const defaultQuery = {
            dataType: "json",
            type: "GET",
            success: dataList => {
                this.updateLoadStatus(fetchId, true);
                this.resultMap[fetchId] = { ...this.loadingMap[fetchId], result: dataList };
                this.updateStatistics(fetchId);
                tApp.manager.scheduleRun(0, `singleAjax_success_${fetchId}`);
            },
            error: textStatus => {
                this.resultMap[fetchId] = { error: textStatus, success: false };
                this.updateLoadStatus(fetchId, false);
                tApp.manager.scheduleRun(0, `singleAjax_error_${fetchId}`);
            }
        };

        $Dom.ajax({ ...defaultQuery, ...query });
    }

    groupAjax(query, dataIdFetchIdMap, idKey) {
        const defaultQuery = {
            dataType: "json",
            type: "GET",
            success: dataList => {
                dataList.forEach(data => {
                    const dataId = data[idKey];
                    if (dataIdFetchIdMap[dataId]) {
                        const fetchId = dataIdFetchIdMap[dataId];
                        this.updateLoadStatus(fetchId, true);
                        this.resultMap[fetchId] = { ...this.loadingMap[fetchId], result: data };
                        this.updateStatistics(fetchId);
                        delete dataIdFetchIdMap[dataId];
                    }
                });

                Object.keys(dataIdFetchIdMap).forEach(dataId => {
                    const fetchId = dataIdFetchIdMap[dataId];
                    if (!this.loadingMap[fetchId].success) {
                        this.updateLoadStatus(fetchId, false);
                    }
                });

                tApp.manager.scheduleRun(0, `groupAjax_success_${query}`);
            },
            error: textStatus => {
                Object.keys(dataIdFetchIdMap).forEach(dataId => {
                    const fetchId = dataIdFetchIdMap[dataId];
                    this.resultMap[fetchId] = { error: textStatus, success: false };
                    this.updateLoadStatus(fetchId, false);
                });

                tApp.manager.scheduleRun(0, `groupAjax_error_${query}`);
            }
        };

        $Dom.ajax({ ...defaultQuery, ...query });
    }

    imgAjax(src, fetchId) {
        const image = new Image();
        image.src = src;

        image.onload = () => {
            this.updateLoadStatus(fetchId, true);
            this.resultMap[fetchId] = { ...this.loadingMap[fetchId], width: image.width, height: image.height, $image: new $Dom(image) };
            this.updateStatistics(fetchId, 'image');
            tApp.manager.scheduleRun(0, `imgAjax_success_${fetchId}`);
        };

        image.onerror = image.onabort = () => {
            this.resultMap[fetchId] = { result: "no image", success: false };
            this.updateLoadStatus(fetchId, false);
            tApp.manager.scheduleRun(0, `imgAjax_error_${fetchId}`);
        };
    }

    getCategoryFromFetchId(fetchId) {
        return fetchId.replace(/[^a-zA-Z]/g, '');
    }

    updateStatistics(fetchId, category) {
        category = category || this.getCategoryFromFetchId(fetchId);

        if (this.statistics[category]) {
            this.statistics[category].count++;
            this.statistics[category].totalTime += this.resultMap[fetchId].loadingTime;
            this.statistics[category].lastUpdate = browser.now();
            delete this.statistics[category].averageTime;
        } else {
            this.statistics[category] = {
                count: 1,
                totalTime: this.resultMap[fetchId].loadingTime,
                lastUpdate: browser.now()
            };
        }
    }

    getAverageLoadingTime(category) {
        const now = browser.now();

        if (this.statistics[category]?.averageTime && (now - this.statistics[category].lastUpdate) < 500) {
            return this.statistics[category].averageTime;
        }

        let totalTime = this.statistics[category]?.totalTime || 0;
        let count = this.statistics[category]?.count || 0;

        Object.values(this.loadingMap)
            .filter(loadItem => loadItem.category === category)
            .forEach(loadItem => {
                totalTime += now - loadItem.startTime;
                count++;
            });

        if (this.statistics[category]) {
            this.statistics[category].averageTime = count > 0 ? totalTime / count : 0;
            this.statistics[category].lastUpdate = browser.now();
            return this.statistics[category].averageTime;
        }

        return 0;
    }

    updateLoadStatus(fetchId, success) {
        Object.assign(this.loadingMap[fetchId], {
            loadingFlag: false,
            loadingTime: browser.now() - this.loadingMap[fetchId].startTime,
            success,
            attempts: this.loadingMap[fetchId].attempts + 1
        });
    }
}

export { LoadingManager };
