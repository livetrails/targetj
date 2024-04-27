import { $Dom } from "./$Dom.js";
import { browser } from "./Browser.js";
import { TUtil } from "./TUtil.js";
import { tapp } from "./App.js";

function LoadingManager() {
    
    this.resultMap = {};
    this.loadingMap = {};
    
    this.singleLoadList = undefined;
    this.groupLoadList = undefined;
    this.imgLoadList = undefined;
    
    this.stopLoadingAfterAttempts = TUtil.isDefined(tapp.stopLoadingAfterAttempts) ? tapp.stopLoadingAfterAttempts : 10;
    this.attemptFailedInterval = TUtil.isDefined(tapp.attemptFailedInterval) ? tapp.attemptFailedInterval : 2000;
    
    this.statistics = {};
}

LoadingManager.prototype.initSingleLoad = function (fetchId, query, forceLoad)  {
    
    if (this.isLoading(fetchId) || (this.isLoaded(fetchId) && !forceLoad) || this.getLoadingAttempts(fetchId) > this.stopLoadingAfterAttempts) return;

    this.initLoadingMap(fetchId);
     
    this.singleLoadList = this.singleLoadList ? this.singleLoadList : {};
    this.singleLoadList[fetchId] = { fetchId: fetchId, query: query };
};

LoadingManager.prototype.initGroupLoad = function (fetchId, dataId, query, idKey, separator)  {
    var groupId = JSON.stringify({ query: query, idKey: idKey, separator: separator });
               
    if (this.isLoading(fetchId) || this.isLoaded(fetchId) || this.getLoadingAttempts(fetchId) > this.stopLoadingAfterAttempts) return;
    
    this.initLoadingMap(fetchId);
        
    this.groupLoadList = this.groupLoadList ? this.groupLoadList : {};
    if (!this.groupLoadList[groupId]) {
        this.groupLoadList[groupId] = [];
    }
       
    this.groupLoadList[groupId].push({ fetchId: fetchId, dataId: dataId });
};

LoadingManager.prototype.initImgLoad = function (fetchId, src) {
    
    if (this.isLoading(fetchId) || this.isLoaded(fetchId) || this.getLoadingAttempts(fetchId) > this.stopLoadingAfterAttempts) return;
    
    this.initLoadingMap(fetchId, 'image');
    
    this.imgLoadList = this.imgLoadList ? this.imgLoadList : {};
    this.imgLoadList[fetchId] = { fetchId: fetchId, src: src };
};

LoadingManager.prototype.isLoading = function(fetchId) {
    return TUtil.isDefined(this.loadingMap[fetchId]) ? this.loadingMap[fetchId].loadingFlag : false;
};

LoadingManager.prototype.isLoaded = function(fetchId) {
    return TUtil.isDefined(this.resultMap[fetchId]) && this.resultMap[fetchId].success === true;
};

LoadingManager.prototype.getLoadingAttempts = function(fetchId) {
    return TUtil.isDefined(this.loadingMap[fetchId]) ? this.loadingMap[fetchId].attempts : 0;
};

LoadingManager.prototype.getSuccessLoadingTime = function(fetchId) {
    return TUtil.isDefined(this.loadingMap[fetchId]) &&  this.loadingMap[fetchId].success === true ? this.loadingMap[fetchId].loadingTime : undefined;
};

LoadingManager.prototype.getFailedInterval = function(fetchId) {
    return TUtil.isDefined(this.loadingMap[fetchId]) ? this.loadingMap[fetchId].attempts * this.attemptFailedInterval : 0;
};

LoadingManager.prototype.fetchResult = function(fetchId) {
    return this.resultMap[fetchId];
};

LoadingManager.prototype.hasLoadedSuccessfully = function(fetchId) {
    return this.resultMap[fetchId] && this.resultMap[fetchId].success === true;
};

LoadingManager.prototype.hasLoadedUnsuccessfully = function(fetchId) {
    return this.resultMap[fetchId] && this.resultMap[fetchId].success === false;
};

LoadingManager.prototype.fetchErrors = function(fetchId) {
    return this.resultMap[fetchId] && this.resultMap[fetchId].result && this.resultMap[fetchId].result.errors ? this.resultMap[fetchId].result.errors : undefined;
};
LoadingManager.prototype.initLoadingMap = function(fetchId, category) {
    category = category ? category : this.getCategoryFromFetchId(fetchId);
    
    if (TUtil.isDefined(this.loadingMap[fetchId])) {
        this.loadingMap[fetchId].loadingFlag = true;
        this.loadingMap[fetchId].startTime = browser.now();
        this.loadingMap[fetchId].loadingTime = undefined;
        
    } else {
        this.loadingMap[fetchId] = { 
            fetchId: fetchId, 
            category: category, 
            loadingFlag: true, 
            attempts: 0, 
            startTime: browser.now(), 
            loadingTime: undefined, 
            success: false 
        };
    }
};

LoadingManager.prototype.groupLoad = function () {
    if (!this.groupLoadList) return;
    
    var groupIds = Object.keys(this.groupLoadList);
    
    for (var i = 0; i < groupIds.length; i++) {
        var groupId = groupIds[i];        
        var fetchList = this.groupLoadList[groupId];
                                        
        var dataIds = [], dataIdFetchIdMap = {};
        
        for (var j = 0; j < fetchList.length; j++) {
            var dataId = fetchList[j].dataId;
            dataIds.push(dataId);
            dataIdFetchIdMap[dataId] = fetchList[j].fetchId;
        }
                
        if (dataIds.length > 0)  {
            var groupObj = JSON.parse(groupId);
            var groupQuery = this.updateQueryValue(groupObj.query, dataIds.join(groupObj.separator));
            this.groupAjax(groupQuery, dataIdFetchIdMap, groupObj.idKey);
        }
        
        delete this.groupLoadList[groupId];
    }
    
    this.groupLoadList = undefined;
    
};

LoadingManager.prototype.singleLoad = function () {
    if (!this.singleLoadList) return;
    
    var keys = Object.keys(this.singleLoadList);
        
    for (var i = 0; i < keys.length; i++) {        
        var load = this.singleLoadList[keys[i]];
               
        this.singleAjax(load.query, load.fetchId);
    }
    
    this.singleLoadList = undefined;
};

LoadingManager.prototype.imgLoad = function () {  
    if (!this.imgLoadList) return;

    var keys = Object.keys(this.imgLoadList);
        
    for (var i = 0; i < keys.length; i++) {   
        var load = this.imgLoadList[keys[i]];
               
        this.imgAjax(load.src, load.fetchId);
    }
    
    this.imgLoadList = undefined;
};

LoadingManager.prototype.updateQueryValue = function(query, value) {
    for (var prop in query) {
        if (query[prop] === '%s') {
            query[prop] = value;
        } else if (query[prop] === '%d') {
            query[prop] = typeof value === 'number' ? value : parseFloat(value);
        } else if (typeof query[prop] === 'object') {
            this.updateQueryValue(query[prop], value);
        }   
    }
    return query;
};

LoadingManager.prototype.singleAjax = function (query, fetchId) {
    var self = this;
            
    var defaultQuery = { 
        dataType: "json", 
        type: "GET",
        success: function (dataList) {
            self.loadingMap[fetchId].loadingFlag = false;
            self.loadingMap[fetchId].loadingTime = browser.now() - self.loadingMap[fetchId].startTime;
            self.loadingMap[fetchId].success = true;            
            self.loadingMap[fetchId].attempts++;
             
            self.resultMap[fetchId] = Object.assign({ result: dataList }, self.loadingMap[fetchId] );
            delete self.loadingMap[fetchId];
            
            self.updateStatistics(fetchId);
                        
            tapp.manager.scheduleRun(0, "singleAjax_success_" +  fetchId);
        }, 
        error: function (textStatus) {             
            self.resultMap[fetchId] = { error: textStatus, success: false };
            
            self.loadingMap[fetchId].loadingFlag = false;
            self.loadingMap[fetchId].loadingTime = browser.now() - self.loadingMap[fetchId].startTime;
            self.loadingMap[fetchId].attempts++;
            
            tapp.manager.scheduleRun(0, "singleAjax_error_" +  fetchId);
        }
    };

    $Dom.ajax(Object.assign(defaultQuery, query)); 
};

LoadingManager.prototype.groupAjax = function (query, dataIdFetchIdMap, idKey) {
    
    var self = this;
        
    var defaultQuery = {
         dataType: "json", 
         type: "GET",
         success: function (dataList) {
            for (var i = 0; i < dataList.length; i++) {
                
                var dataId = dataList[i][idKey];
                if (dataIdFetchIdMap[dataId]) {
                    var fetchId = dataIdFetchIdMap[dataId];        
                    self.loadingMap[fetchId].loadingFlag = false;
                    self.loadingMap[fetchId].loadingTime = browser.now() - self.loadingMap[fetchId].startTime;
                    self.loadingMap[fetchId].success = true;                                
                    self.loadingMap[fetchId].attempts++;
                    
                    self.resultMap[fetchId] = Object.assign({ result: dataList[i] }, self.loadingMap[fetchId] );
                    
                    self.updateStatistics(fetchId);
                    
                    delete self.loadingMap[fetchId];
                    delete dataIdFetchIdMap[dataId];
                }
            }
            
            Object.keys(dataIdFetchIdMap).forEach(function(dataId) {
                
                var fetchId = dataIdFetchIdMap[dataId];
                
                if (!self.loadingMap[fetchId].success) {
                    self.loadingMap[fetchId].loadingFlag = false;
                    self.loadingMap[fetchId].loadingTime = browser.now() - self.loadingMap[fetchId].startTime;
                    self.loadingMap[fetchId].attempts++;
                }
            }); 
                        
            tapp.manager.scheduleRun(0, "groupAjax_success_" +  query);
        }, 
        error: function (textStatus) {
            Object.keys(dataIdFetchIdMap).forEach(function(dataId) {
                var fetchId =dataIdFetchIdMap[dataId];
                                
                self.resultMap[fetchId] = { error: textStatus, success: false };
                self.loadingMap[fetchId].loadingFlag = false;
                self.loadingMap[fetchId].attempts++;                 
            });
                        
            tapp.manager.scheduleRun(0, "groupAjax_error_" +  query);
        }
    };

    $Dom.ajax(Object.assign(defaultQuery, query)); 
};

LoadingManager.prototype.imgAjax = function (src, fetchId) {
    var self = this;
                
    var image = new Image();
    image.src = src;
       
    image.onload = function() {
            self.loadingMap[fetchId].loadingFlag = false;
            self.loadingMap[fetchId].loadingTime = browser.now() - self.loadingMap[fetchId].startTime;
            self.loadingMap[fetchId].success = true;            
            self.loadingMap[fetchId].attempts++;
                         
            self.resultMap[fetchId] = Object.assign({ width: this.width, height: this.height, $image: new $Dom(image) }, self.loadingMap[fetchId]);
            
            self.updateStatistics(fetchId, 'image');
            delete self.loadingMap[fetchId];
                        
            tapp.manager.scheduleRun(0, "imgAjax_success_" +  fetchId);
    };
            
    image.onerror = image.onabort =  function () {
        self.resultMap[fetchId] = { result: "no image", success: false };
            
        self.loadingMap[fetchId].loadingFlag = false;
        self.loadingMap[fetchId].loadingTime = browser.now() - self.loadingMap[fetchId].startTime;
        self.loadingMap[fetchId].attempts++;


        tapp.manager.scheduleRun(0, "imgAjax_error_" +  fetchId); 
    };
       
};

LoadingManager.prototype.getCategoryFromFetchId = function(fetchId) {
    return fetchId.replace(/[^a-zA-Z]/g, '');
};

LoadingManager.prototype.updateStatistics = function(fetchId, category) {
    category = category ? category : this.getCategoryFromFetchId(fetchId);

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
};

LoadingManager.prototype.getAverageLoadingTime = function(category) {
    var now = browser.now();
    
    if (this.statistics[category] && this.statistics[category].averageTime && (now - this.statistics[category].lastUpdate) < 500) {
        return this.statistics[category].averageTime;
    }

    var totalTime = this.statistics[category] ? this.statistics[category].totalTime : 0;
    var count = this.statistics[category] ? this.statistics[category].count : 0;
    
    
    Object.values(this.loadingMap).filter(function(loadItem) { return loadItem.category === category; }).forEach(function(loadItem) {
        totalTime += now - loadItem.startTime;
        count++;
    });
    
    if (this.statistics[category]) {

        this.statistics[category].averageTime = count > 0 ? totalTime / count : 0;
        this.statistics[category].lastUpdate = browser.now();

        return this.statistics[category].averageTime;
    } else {
        return 0;
    }
};

export { LoadingManager };



