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
        rerender: [],
        restyle: [],
        reattach: [],
        invisibleDom: [],
        deletedTModel: [],
        visibleNoDom: [],
        updatingTModels: [],
        updatingTargets: [],
        activeTargets: []
    };
    this.visibleTypeMap = {};
    this.visibleOidMap = {};
    this.targetMethodMap = {};
    
    this.doneTargets = [];
            
    this.nextRuns = [];
    this.runningStep = 0;
    this.runningFlag = false;
    this.rerunOid = '';
    this.cycleStats = {
        duration: 0,
        count: 0,
        totalDuration: 0,
        average : 0
    };
};


TModelManager.prototype.resetRuns = function() {
    this.nextRuns = [];
    this.runningStep = 0;
    this.runningFlag = false;
    this.rerunOid = '';
};

TModelManager.prototype.resetCycle = function() {
    this.cycleStats.duration = 0;
    this.cycleStats.count = 0;
    this.cycleStats.totalDuration = 0;
    this.cycleStats.average = 0;
};

TModelManager.prototype.clear = function() {
    this.lists.visible.length = 0;
    this.lists.rerender.length = 0;
    this.lists.restyle.length = 0;
    this.lists.reattach.length = 0;    
    this.lists.visibleNoDom.length = 0;
    this.lists.updatingTModels.length = 0;
    this.lists.updatingTargets.length = 0;
    this.lists.activeTargets.length = 0;
    this.visibleTypeMap = {};
    this.visibleOidMap = {};
    this.targetMethodMap = {};      
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
    
    this.clear();
    
    for (i = 0; i < tapp.locationManager.hasLocationList.length; i++) {
        tmodel = tapp.locationManager.hasLocationList[i];
        var visible = tmodel.isVisible();
                                
        if (tmodel.isMarkedDeleted() && this.lists.deletedTModel.indexOf(tmodel) === -1)  {
            this.lists.deletedTModel = [].concat(this.lists.deletedTModel, tmodel, tmodel.getAllNestedChildren());
                    
            lastVisibleMap[tmodel.oid] = null;
        } else if (visible) {
            lastVisibleMap[tmodel.oid] = null;
            
            if (tmodel.hasDom() && !tmodel.canHaveDom() && this.lists.invisibleDom.indexOf(tmodel) === -1) {
                this.lists.invisibleDom.push(tmodel);
            }

            this.lists.visible.push(tmodel);
            
            this.needsRerender(tmodel);
            this.needsRestyle(tmodel);
            this.needsReattach(tmodel);
            
            if (tmodel.updatingTargetList.length > 0) {
                this.lists.updatingTModels.push(tmodel);
                this.lists.updatingTargets = this.lists.updatingTargets.concat((tmodel.updatingTargetList));
            }
            
            var activeTargets = Object.keys(tmodel.activeTargetMap);
            if (activeTargets.length > 0) {
                this.lists.activeTargets = this.lists.activeTargets.concat("'" + tmodel.oid + "'", activeTargets);
            }
                        
            if (Object.keys(tmodel.targetMethodMap).length > 0) {                  
                this.targetMethodMap[tmodel.oid] = Object.assign({}, tmodel.targetMethodMap);
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

TModelManager.prototype.needsRerender = function(tmodel) {
    if (tmodel.hasDom()
            && TUtil.isDefined(tmodel.getHtml())
            && (tmodel.$dom.html() !== tmodel.getHtml() || tmodel.$dom.textOnly !== tmodel.isTextOnly())) {
        this.lists.rerender.push(tmodel);
        return true;
    }
    
    return false;
};

TModelManager.prototype.needsRestyle = function(tmodel) {
    if (tmodel.hasDom() && tmodel.styleTargetList.length > 0) {
        this.lists.restyle.push(tmodel);
        return true;
    }
    
    return false;
};

TModelManager.prototype.needsReattach = function(tmodel) {
    if (tmodel.hasDom() && tmodel.hasDomHolderChanged()) {
        this.lists.reattach.push(tmodel);
        return true;
    }
    
    return false;
};

TModelManager.prototype.renderTModels = function () {
    var i, tmodel;
    
    for (i = 0; i < this.lists.rerender.length; i++) { 
        tmodel = this.lists.rerender[i];
        
        tmodel.isTextOnly() ? tmodel.$dom.text(tmodel.getHtml()) : tmodel.$dom.html(tmodel.getHtml());
        tmodel.setActualValueLastUpdate('html');
        
        //we might need to re-measure dim from dom if tmodel has no measure method 
        tmodel.domHeight = undefined;
        tmodel.domWidth = undefined;
    }
};

TModelManager.prototype.reattachTModels = function() {
    var i, tmodel;
    
    for (i = 0; i < this.lists.reattach.length; i++) {
        tmodel = this.lists.reattach[i];
        tmodel.$dom.detach();                    
        tmodel.getDomHolder().appendTModel$Dom(tmodel);
    }    
};

TModelManager.prototype.deleteDoms = function () { 
    var i;
 
    for (i = 0; i < this.lists.invisibleDom.length; i++) {
        var tmodel = this.lists.invisibleDom[i];
   
        tmodel.domValues = {};
        
        var resetTargets = [].concat(tmodel.targets['resetOnInvisible'], tmodel.targets['onResize']);
        resetTargets && resetTargets.forEach(function(key) {
            if (tmodel.targets[key] && tmodel.isTargetComplete(key)) {
                tmodel.resetTarget(key);
            }            
        });
        
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
        parent.removeFromUpdatingChildren(tmodel);

        childIndex = parent.val('children').indexOf(tmodel);
        
        if (childIndex >= 0) {
            parent.val('children').splice(childIndex, 1);
            parent.setActualValueLastUpdate('children');
        }
         
        childIndex = parent.val('addedChildren').indexOf(tmodel);
                
        if (childIndex >= 0) {
            parent.val('addedChildren').splice(childIndex, 1);
            parent.setActualValueLastUpdate('addedChildren');
        }
        
        parent.setActualValueLastUpdate('allChildren');
    }

    if (tmodel.$dom) {
        tmodel.$dom.detach();
        tmodel.$dom = null;
    }  
};

TModelManager.prototype.fixStyles = function() {
    var i, tmodel;
    
    for (i = 0; i < this.lists.restyle.length; i++) {
        tmodel = this.lists.restyle[i];
       
        tmodel.styleTargetList.forEach(function(key) {
            switch (key) {
                case 'transform':
                    var x = Math.floor(tmodel.getX());
                    var y = Math.floor(tmodel.getY());
                    var rotate = Math.floor(tmodel.getRotate());
                    var scale = TUtil.formatNum(tmodel.getScale(), 2);

                    if (tmodel.domValues.x !== x || tmodel.domValues.y !== y || tmodel.domValues.rotate !== rotate || tmodel.domValues.scale !== scale) {
                        tmodel.$dom.transform(x, y, rotate, scale);
                        tmodel.domValues.y = y;
                        tmodel.domValues.x = x;
                        tmodel.domValues.rotate = rotate;
                        tmodel.domValues.scale = scale;
                    }

                    break;

                case 'dim':
                    var width = Math.floor(tmodel.getWidth());
                    var height = Math.floor(tmodel.getHeight());

                    if (tmodel.$dom.width() !== width || tmodel.$dom.height() !== height) { 
                        tmodel.$dom.width(width);
                        tmodel.$dom.height(height);
                    }
                    break;

                case 'style':
                    var style = tmodel.getStyle();
                    if (TUtil.isDefined(style) && tmodel.domValues.style !== style) {
                        tmodel.$dom.setStyleByMap(tmodel.getStyle());
                        tmodel.domValues.style = style;
                    }
                    break;

                case 'css':
                    var css = tmodel.getCss();
                    if (tmodel.$dom.css() !== css) {
                        tmodel.$dom.css(css);
                    }
                    break;
                    
                case 'borderRadius':
                case 'padding':
                case 'lineHeight':                
                case 'fontSize':
                    if (TUtil.isDefined(tmodel.val(key)) && tmodel.domValues[key] !== tmodel.val(key)) {
                        tmodel.$dom.style(key, TUtil.isNumber(tmodel.val(key)) ? tmodel.val(key) + 'px' : tmodel.val(key));
                        tmodel.domValues[key] = tmodel.val(key);
                    }
                    break;

                default: 
                    if (TUtil.isDefined(tmodel.val(key)) && tmodel.domValues[key] !== tmodel.val(key)) {
                        tmodel.$dom.style(key, tmodel.val(key));
                        tmodel.domValues[key] = tmodel.val(key);
                    }                    
            }
        });
        
        tmodel.styleTargetMap = {};
        tmodel.styleTargetList.length = 0;
    };
};

TModelManager.prototype.completeDoneTModels = function() {
    tapp.manager.doneTargets.forEach(function(target) {
        var tmodel = target.tmodel;
        var key = target.key;
        if (tmodel.isTargetDone(key)) {
            tmodel.setTargetComplete(key);
            tmodel.removeFromActiveTargets(tmodel);
            tmodel.removeFromUpdatingTargets(tmodel);                              
        }    
    });
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
        
        var x = Math.floor(tmodel.getX());
        var y = Math.floor(tmodel.getY());
        var rotate = Math.floor(tmodel.getRotate());
        var scale = TUtil.formatNum(tmodel.getScale(), 2);
        var width = Math.floor(tmodel.getWidth());
        var height = Math.floor(tmodel.getHeight());
        var zIndex = Math.floor(tmodel.getZIndex());
        var opacity = tmodel.getOpacity() ? tmodel.getOpacity().toFixed(2) : 0;
        
        var style = {
            position: 'absolute',
            top: 0,
            left: 0,
            transform: [ x, y, rotate, scale ],
            width: width + "px",
            height: height + "px",            
            opacity: opacity,
            zIndex: zIndex 
        };
        
        ['fontSize', 'borderRadius', 'padding', 'lineHeight'].forEach(function(prop) {
            var value = tmodel.val(prop);
            if (value) {
                style[prop] = TUtil.isNumber(value) ? value + 'px' : value;
            }
        }); 
        
        ['backgroundColor', 'background', 'color'].forEach(function(prop) {
            var value = tmodel.val(prop);
            if (value) {
                style[prop] = value;
            }
        });          
                 
        Object.assign(style, tmodel.getStyle());
                
        $dom = new $Dom();
        $dom.create('div');
        $dom.setSelector("#" + tmodel.oid);
        $dom.setId(tmodel.oid);
        $dom.css(tmodel.getCss());
        $dom.setStyleByMap(style);

        tmodel.domValues = {};
        tmodel.domValues.x = x;
        tmodel.domValues.y = y;
        tmodel.domValues.rotate = rotate;
        tmodel.domValues.scale = scale;
        tmodel.domValues.style = style;
        
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
        } else if (nextRun && lastRun && nextRun.delay <= lastRun.delay && tapp.manager.runningFlag) {
            tapp.manager.rerunOid = oid;
        }
    }
};

TModelManager.prototype.run = function(oid, delay) {
    if (!tapp.isRunning()) {
        this.getNextRun();
        return;
    }
    
    if (tapp.manager.runningFlag)   {
        tapp.manager.rerunOid = oid;
        
        return;
    }
   
    tapp.manager.runningFlag = true;
            
    window.requestAnimationFrame(function () {
        var startStep = tapp.manager.runningStep;
        var startTime = browser.now();
        while((browser.now() - startTime) < 25 && tapp.manager.runningStep < 7 && tapp.isRunning()) {
            switch(tapp.manager.runningStep) {
                case 0:
                                        
                    tapp.events.captureEvents();
                    
                    if (tapp.manager.doneTargets.length > 0) {
                        tapp.manager.completeDoneTModels();
                        tapp.manager.doneTargets.length = 0;
                    }

                    tapp.locationManager.calculateTargets(tapp.troot);

                    tapp.locationManager.calculateAll();
                                    

                    tapp.events.resetEventsOnTimeout();

                    break;
                    
                case 1:
                    tapp.manager.analyze();
                    break;
                                    
                case 2:
                    tapp.manager.createDoms();
                    break;
                    
                case 3:                    
                    tapp.manager.renderTModels();
                    tapp.manager.reattachTModels();
                    break;
                    
                case 4:
                    tapp.manager.fixStyles();                  
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
        
        var cycleDuration = browser.now() - startTime;
        tapp.manager.cycleStats.duration = startStep === 0 ? cycleDuration : tapp.manager.cycleStats.duration + cycleDuration;

        if (tapp.debugLevel > 0) {
            browser.log(tapp.debugLevel > 0 && tapp.manager.cycleStats.duration > 10)("it took: " + tapp.manager.cycleStats.duration + ", " + oid);
            browser.log(tapp.debugLevel > 0 && tapp.manager.cycleStats.duration > 10)("count: " + tapp.locationManager.locationCount);
            browser.log(tapp.debugLevel > 1)("request from: " + oid + " delay:  " + delay);
        }
        
        tapp.manager.runningFlag = false;
        
        if (tapp.manager.runningStep !== 7)  {
            tapp.manager.run("rendering: " + oid + " " +tapp.manager.runningStep);
        } else {
            tapp.manager.cycleStats.count++;
            tapp.manager.cycleStats.totalDuration += tapp.manager.cycleStats.duration;
            tapp.manager.cycleStats.average = tapp.manager.cycleStats.totalDuration / tapp.manager.cycleStats.count;
            
            if (tapp.manager.rerunOid) {
            tapp.manager.runningStep = 0;
            var rerunOid = tapp.manager.rerunOid;
            tapp.manager.rerunOid = '';
            tapp.manager.run(rerunOid);
            } else {
               tapp.manager.runningStep = 0;

               tapp.manager.getNextRun();
            }
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
