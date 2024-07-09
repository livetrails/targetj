import { Bracket } from "./Bracket.js";
import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { tapp } from "./App.js";
import { browser } from "./Browser.js";

function LocationManager() {
    this.hasLocationList = [];
    this.hasLocationMap = {};

    this.bracketThreshold = 4;
    this.locationCount = [];
}

LocationManager.prototype.calculateAll = function() {
    this.hasLocationList.length = 0;
    this.hasLocationMap = {};
    this.locationCount.length = 0;
    this.startTime = browser.now();

    this.calculate();
};

LocationManager.prototype.calculate = function() {                   
    this.addToLocationList(tapp.tjRoot);
    this.calculateContainer(tapp.tjRoot);
};

LocationManager.prototype.getChildren = function(container) {
    var brackets;
    
    if (this.isProlificContainer(container)) {
        brackets = Bracket.generate(container);
    } 

    return brackets ? brackets.list : container.getChildren(); 
};

LocationManager.prototype.isProlificContainer = function(container)   {
    return container.canBeBracketed() && container.getChildren().length > this.bracketThreshold;
};

LocationManager.prototype.calculateContainer = function(container) {
    var allChildren = this.getChildren(container);
        
    var viewport = container.createViewport();  
    container.resetVisibleList();
                   
    var i = 0, length = allChildren.length;

    while (i < length && tapp.isRunning()) {
        
        var child = allChildren[i++];
                        
        var outerXEast = undefined, innerXEast = undefined;
                
        this.calculateTargets(child);
        
        if (child.getActualValueLastUpdate('canBeBracketed') > child.getParent().getActualValueLastUpdate("allChildren")) {
            delete child.getParent().targetValues['allChildren'];
        }
         
        viewport.setCurrentChild(child);  
        child.setLocation(viewport);
        
        innerXEast = TUtil.isDefined(container.getValue('innerXEast')) ? container.getValue('innerXEast') : container.getInnerXEast();
        outerXEast = TUtil.isDefined(child.getValue('outerXEast')) ? child.getValue('outerXEast') : child.getOuterXEast();
        
        if (viewport.isOverflow(outerXEast, innerXEast)) {   
            viewport.overflow();                       
            child.setLocation(viewport);
        } else {            
            child.setLocation(viewport);
        }
                 
        if (child.isIncluded() && !this.hasLocationMap[child.oid]) {    
            this.addToLocationList(child);          
        }

        if (!child.targetUpdatingMap.x) {
            if (TUtil.isDefined(child.targets.x)) {
                //tapp.targetManager.setTargetValue(child, 'x');
            } else if (!TUtil.isDefined(child.targetValues.x)) {
                child.setValue('x', child.x);                
            }
        }

        if (!child.targetUpdatingMap.y) {
            if (TUtil.isDefined(child.targets.y)) {
                //tapp.targetManager.setTargetValue(child, 'y');
            } else if (!TUtil.isDefined(child.targetValues.y)) {
                child.setValue('y', child.y);
            }            
        }

        viewport.isVisible(child);
                               
        child.addToParentVisibleList();
       
        if (child.shouldCalculateChildren()) {
            this.calculateContainer(child);  
        }
        
        if (child.isVisible() && child.isIncluded() && (child.targetUpdatingList.length > 0 || child.updatingChildren.length > 0)) {
            container.addUpdatingChild(child);
        } 
          
        if (child.isInFlow()) {
            var childLastHeight = child.getHeight();
           
            if (child.hasChildren()) {
                if (child.isTargetEnabled('width')) {
                    TargetUtil.assignValueArray(child, 'width');
                    tapp.targetManager.setJustActualValue(child, 'width');
                }
                if (child.isTargetEnabled('height')) {
                    TargetUtil.assignValueArray(child, 'height');
                    tapp.targetManager.setJustActualValue(child, 'height');
                }
            }

            if (child.getHeight() !== childLastHeight && tapp.events.isScrollTopHandler(child.getParent())
                        && tapp.events.currentTouch.dir === 'up') {
                this.calculateContainer(child); 
            } 
            
            if (TUtil.isNumber(child.getValue('appendNewLine'))) {
                viewport.appendNewLine();
            } else {
                viewport.nextLocation();
            }
        }
        
        this.locationCount.push(child.oid + "-" + child.targetUpdatingList.length + "-" + (browser.now() - this.startTime));
    }

    viewport.calcContentWidthHeight();
};

LocationManager.prototype.calculateTargets = function(tmodel) { 
    tapp.targetManager.setTargetValues(tmodel, Object.keys(tmodel.activeTargetMap));        
    tapp.targetManager.setActualValues(tmodel);

    if ((!TUtil.isDefined(tmodel.targetValues.width) || tmodel.getTargetValue('widthFromDom')) && tmodel.hasDom()) TargetUtil.setWidthFromDom(tmodel);
    if ((!TUtil.isDefined(tmodel.targetValues.height) || tmodel.getTargetValue('heightFromDom')) && tmodel.hasDom()) TargetUtil.setHeightFromDom(tmodel);
};

LocationManager.prototype.addToLocationList = function(child)   {
    this.hasLocationList.push(child);
    this.hasLocationMap[child.oid] = child;
};

export { LocationManager };
