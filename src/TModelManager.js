import { $Dom } from "./$Dom.js";
import { browser } from "./Browser.js";
import { TUtil } from "./TUtil.js";
import { tapp } from "./App.js";

function TModelManager() {
    this.init();
} 

TModelManager.prototype.init = function()   {
    this.lists = {
        visible: [],
        invisibleDom: [],
        deletedTModel: [],
        visibleNoDom: [],
        updatingTModels: [],
        updatingTargets: []
    };
    this.visibleTypeMap = {};
    this.visibleOidMap = {};
    this.targetExecuteMap = {};
            
    this.nextRuns = [];
    this.runningStep = 0;
    this.runningFlag = false;
};
 
TModelManager.prototype.visibles = function(type, list) {
    list = !list ? this.lists.visible : list;
    return this.lists.visible.filter(function(tmodel) { return tmodel.type === type || !type ; }).map(function(tmodel) { return tmodel.oid; });
};
  
TModelManager.prototype.findVisible = function(type)  {
    return this.lists.visible.find(function(tmodel) { return tmodel.type === type; });
};

TModelManager.prototype.findLastVisible = function(type)  {
    return this.lists.visible.findLast(function(tmodel) { return tmodel.type === type; });
};
 
TModelManager.prototype.analyze = function()    {
    var i, tmodel;
        
    var lastVisibleMap = TUtil.list2map(this.lists.visible);
    
    this.lists.visible.length = 0;
    this.lists.visibleNoDom.length = 0;
    this.lists.updatingTModels.length = 0;
    this.lists.updatingTargets.length = 0;
    this.visibleTypeMap = {};
    this.visibleOidMap = {};
    this.targetExecuteMap = {};
    
    for (i = 0; i < tapp.locationManager.hasLocationList.length; i++) {
        tmodel = tapp.locationManager.hasLocationList[i];
        var visible = tmodel.isVisible();
                                
        if (tmodel.isMarkedDeleted() && this.lists.deletedTModel.indexOf(tmodel) === -1)  {
            this.lists.deletedTModel = [].concat(this.lists.deletedTModel, tmodel, tmodel.getAllNestedChildren());
                    
            lastVisibleMap[tmodel.oid] = null;
        } else if (visible) {
            lastVisibleMap[tmodel.oid] = null;
            
            this.lists.visible.push(tmodel);
            
            if (tmodel.targetUpdatingList.length > 0) {
                this.lists.updatingTModels.push(tmodel);
                this.lists.updatingTargets = this.lists.updatingTargets.concat((tmodel.targetUpdatingList));
            }
                        
            if (Object.keys(tmodel.targetExecuteMap).length > 0) {                  
                this.targetExecuteMap[tmodel.oid] = Object.assign({}, tmodel.targetExecuteMap);
            }
            
            this.visibleOidMap[tmodel.oid] = tmodel;
            if (!this.visibleTypeMap[tmodel.type]) {
                this.visibleTypeMap[tmodel.type] = [];
            }
            this.visibleTypeMap[tmodel.type].push(tmodel);
                        
            if (tmodel.canHaveDom() && !tmodel.hasDom() && tmodel.getDomHolder() && tmodel.getDomHolder().exists() && this.lists.visibleNoDom.indexOf(tmodel) === -1)  {
                this.lists.visibleNoDom.push(tmodel);
            }
        }        
    }  
    
    var lastVisible = Object.values(lastVisibleMap).filter(function(tmodel) { return tmodel !== null && tmodel.hasDom() && tmodel.isDomDeletable(); });
        
    lastVisible.forEach(function(tmodel)   {
        tapp.manager.lists.invisibleDom.push(tmodel);
    });
};

TModelManager.prototype.renderTModels = function () {
    var i, tmodel;
    
    var rerendedList = [];
    var holderChangedList = [];
    this.lists.visible.forEach(function(tmodel) {          
        if (tmodel.hasDom() && TUtil.isDefined(tmodel.getHtml())) {
            
            if (tmodel.$dom.html() !== tmodel.getHtml() || tmodel.$dom.textOnly !== tmodel.isTextOnly()) {
                rerendedList.push(tmodel);
            }
        } 
                
        if (tmodel.hasDom() && tmodel.hasDomHolderChanged()) {
            holderChangedList.push(tmodel);
        }
    });
    
    for (i = 0; i < rerendedList.length; i++) { 
        tmodel = rerendedList[i];
        
        tmodel.isTextOnly() ? tmodel.$dom.text(tmodel.getHtml()) : tmodel.$dom.html(tmodel.getHtml());
        tmodel.setActualValueLastUpdate('html');
        
        //we might need to re-measure dim from dom if tmodel has no measure method 
        tmodel.domHeight = undefined;
        tmodel.domWidth = undefined;
    }
    
    for (i = 0; i < holderChangedList.length; i++) {
        tmodel = holderChangedList[i];
        tmodel.$dom.detach();                    
        tmodel.getDomHolder().appendTModel$Dom(tmodel);
    }
};

TModelManager.prototype.deleteDoms = function () { 
    var i;
 
    for (i = 0; i < this.lists.invisibleDom.length; i++) {
        var tmodel = this.lists.invisibleDom[i];
   
        tmodel.domValues = {};
        tmodel.xVisible = false;
        tmodel.yVisible = false;
        
        if (tmodel.invisibleFunctions)   {
            tmodel.invisibleFunctions.forEach(function(invisible)  {
                var key = invisible.key;
                invisible.fn.call(tmodel, key, tmodel.getTargetStep(key), tmodel.getTargetCycle(key), tmodel.getTargetSteps(key), tmodel.getTargetCycles(key));
                tmodel.targetExecuteMap[key] = 'onInvisible';
                tmodel.activeTargetKeyMap[key] = true;
            });
        }
        
        tmodel.$dom.detach();
        tmodel.$dom = null;   
    }
    
    for (i = 0; i < this.lists.deletedTModel.length; i++) {
        this.removeTModel(this.lists.deletedTModel[i]);
    }

    var rerun = this.lists.invisibleDom.length > 0 || this.lists.deletedTModel.length > 0;

    this.lists.invisibleDom.length = 0;
    this.lists.deletedTModel.length = 0;
    
    if (rerun) {
        this.scheduleRun(0, "deleteDoms");
    }
};

TModelManager.prototype.removeTModel = function(tmodel) {    
    tmodel.markAsDeleted();
        
    var parent = tmodel.getParent();
    
    var childIndex;
    if (parent && parent.hasChildren()) {
        parent.removeUpdatingChild(tmodel);

        
        childIndex = parent.getValue('children').indexOf(tmodel);
        
        if (childIndex >= 0) {
            parent.getValue('children').splice(childIndex, 1);
            parent.setActualValueLastUpdate('children');
        }
         
        childIndex = parent.getValue('addedChildren').indexOf(tmodel);
                
        if (childIndex >= 0) {
            parent.getValue('addedChildren').splice(childIndex, 1);
            parent.setActualValueLastUpdate('addedChildren');
        }
        
        parent.setActualValueLastUpdate('allChildren');
    }

    if (tmodel.$dom) {
        tmodel.$dom.detach();
        tmodel.$dom = null;
    }  
};

TModelManager.prototype.createDoms = function () {
    var i;
    var $dom, tmodel;
    var contentList = [];
    var needsDom = [];

    this.lists.visibleNoDom.sort(function(a, b) {
        if (a.hasChildren() && b.hasChildren()) {
            return a.getUIDepth() < b.getUIDepth() ? -1 : 1;
        } else {
            return a.hasChildren() ? -1 : 1;
        }
    });    

    for (i = 0; i < this.lists.visibleNoDom.length; i++) {
        tmodel = this.lists.visibleNoDom[i];
        if ($Dom.query('#' + tmodel.oid)) {
            $dom = new $Dom('#' + tmodel.oid);
            tmodel.$dom = $dom;        
        } else {
            needsDom.push(tmodel);  
        }
    }
    
    for (i = 0; i < needsDom.length; i++) {
        tmodel = needsDom[i];
        
        var x = Math.floor(tmodel.getX()), y = Math.floor(tmodel.getY()), rotate = Math.floor(tmodel.getRotate()), scale = TUtil.formatNum(tmodel.getScale(), 2);
        
        var width = Math.floor(tmodel.getWidth());
        var height = Math.floor(tmodel.getHeight());
        var zIndex = Math.floor(tmodel.getZIndex());
        var opacity = tmodel.getOpacity() ? tmodel.getOpacity().toFixed(2) : 0;
        
        var styles = {
            position: 'absolute',
            top: 0,
            left: 0,
            transform: [ x, y, rotate, scale ],
            width: width + "px",
            opacity: opacity,
            height: height + "px",
            zIndex: zIndex 
        };
                
        $dom = new $Dom();
        $dom.create('div');
        $dom.setSelector("#" + tmodel.oid);
        $dom.setId(tmodel.oid);
        $dom.css(tmodel.getCss());
        $dom.setStyleByMap(styles);

        tmodel.domValues = {};
        tmodel.domValues.x = x;
        tmodel.domValues.y = y;
        tmodel.domValues.rotate = rotate;
        tmodel.domValues.scale = scale;
        
        tmodel.$dom = $dom;        

        var contentItem = contentList.find(function(item) { 
            return item.domHolder === tmodel.getDomHolder(); 
        });
        
        if (contentItem)    {
            contentItem.tmodels.push(tmodel);
        } else {
            contentList.push({ domHolder: tmodel.getDomHolder(), tmodels: [tmodel]});
        }
    }
    
    contentList.map(function(content) {
        content.tmodels.map(function(tmodel) {
            content.domHolder.appendTModel$Dom(tmodel);
        });
    });
    
    if (contentList.length) {
        tapp.manager.scheduleRun(1, "createDom");        
    }
};

TModelManager.prototype.scheduleRun = function(delay, oid) { 
    if (delay < 1 && tapp.throttle === 0) {       
        tapp.manager.run(oid, delay);
    } else {
        var nextRun = browser.delay(function() {
            tapp.manager.run(oid, delay);
        }, oid, tapp.throttle === 0 ? delay || 0 : tapp.throttle); 
        
        var lastRun = this.nextRuns.length > 0 ? this.nextRuns[this.nextRuns.length - 1] : null;
        if (nextRun && (!lastRun || nextRun.delay > lastRun.delay)) {
            this.nextRuns.push(nextRun);
        }
    }
};

TModelManager.prototype.run = function(oid, delay) {
    if (!tapp.isRunning()) {
        this.getNextRun();
        return;
    }
    
    if (tapp.manager.runningFlag)   {
        tapp.manager.scheduleRun(1, oid);
        return;
    }
   
    tapp.manager.runningFlag = true;
                
    window.requestAnimationFrame(function () {
        var frameTime = browser.now();
        while((browser.now() - frameTime) < 25 && tapp.manager.runningStep < 7 && tapp.isRunning()) {
            switch(tapp.manager.runningStep) {
                case 0:
                                        
                    tapp.events.captureEvents();
                    
                    tapp.targetManager.doneTargets.length = 0;

                    tapp.locationManager.calculateTargets(tapp.ui);

                    tapp.locationManager.calculateAll();

                    tapp.events.resetEvents();

                    break;
                    
                case 1:
                    tapp.manager.analyze();
                    break;
                                    
                case 2:
                    tapp.manager.createDoms();
                    break;
                    
                case 3:                    
                    tapp.manager.renderTModels();
                    break;
                    
                case 4:
                    for (var i = 0; i <  tapp.manager.lists.visible.length; i++) {
                        var tmodel = tapp.manager.lists.visible[i];
                        if (tmodel.hasDom()) {
                            tmodel.fixXYRotateScale();
                            tmodel.fixOpacity();
                            tmodel.fixZIndex();
                            tmodel.fixCss();
                            tmodel.fixStyle();
                            tmodel.fixDim();
                        }

                    }                    
                    break;
                    
                case 5:           
                    tapp.manager.deleteDoms();
                    break;
                    
                case 6:
                    tapp.loader.singleLoad();
                    tapp.loader.groupLoad();
                    tapp.loader.imgLoad();
                    break;
            }
            
            tapp.manager.runningStep++;
        }
        
        if (tapp.debugLevel > 0) {
            browser.log(tapp.debugLevel > 0 && browser.now() - frameTime > 10)("it took: " + (browser.now() - frameTime) + ", " + oid);
            browser.log(tapp.debugLevel > 0 && browser.now() - frameTime > 10)("count: " + tapp.locationManager.locationCount);
            browser.log(tapp.debugLevel > 1)("request from: " + oid + " delay:  " + delay);
        }
        
        tapp.manager.runningFlag = false;

        if (tapp.manager.runningStep !== 7)  {
            tapp.manager.run("rendering: " + tapp.manager.runningStep);
        } else {
           tapp.manager.runningStep = 0;
                              
           tapp.manager.getNextRun();
        }
    });

}; 

TModelManager.prototype.getNextRun = function() {
    if (this.nextRuns.length > 0 && tapp.isRunning()) {
        var nextRun  = this.nextRuns.pop();
        if (nextRun) {        
             tapp.manager.scheduleRun(nextRun.timeStamp - browser.now(), nextRun.oid);
        }        
    }
};

export { TModelManager };
