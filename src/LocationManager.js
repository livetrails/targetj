import { Bracket } from "./Bracket.js";
import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { TargetExecutor } from "./TargetExecutor.js";
import { tapp, getEvents, getScreenWidth, getScreenHeight } from "./App.js";
import { browser } from "./Browser.js";

function LocationManager() {
    this.hasLocationList = [];
    this.hasLocationMap = {};

    this.bracketThreshold = 6;
    this.locationCount = [];
    
    this.screenWidth = getScreenWidth();
    this.screenHeight = getScreenHeight();
    this.resizeFlag = false;
}

LocationManager.prototype.calculateAll = function() {
    this.hasLocationList.length = 0;
    this.hasLocationMap = {};
    this.locationCount.length = 0;
    this.startTime = browser.now();
    this.resizeFlag = false;

    if (this.screenWidth !== getScreenWidth() || this.screenHeight !== getScreenHeight()) {
        this.resizeFlag = true;
        this.screenWidth = getScreenWidth();
        this.screenHeight = getScreenHeight();
    }
    
    this.calculate();
};

LocationManager.prototype.calculate = function() {                   
    this.addToLocationList(tapp.troot);
    this.calculateContainer(tapp.troot);
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
        if (!child) continue;
                      
        var outerXEast = undefined, innerXEast = undefined;
        
        var preX = child.domValues.x;
        var preY = child.domValues.y;
                
        this.calculateTargets(child);
        
        if (child.getActualValueLastUpdate('canBeBracketed') > child.getParent().getActualValueLastUpdate("allChildren")) {
            delete child.getParent().targetValues['allChildren'];
        }
         
        viewport.setCurrentChild(child);  
        child.setLocation(viewport);
        child.calculateAbsolutePosition(child.x, child.y);
        
        innerXEast = TUtil.isDefined(container.val('innerXEast')) ? container.val('innerXEast') : container.getInnerXEast();
        outerXEast = TUtil.isDefined(child.val('outerXEast')) ? child.val('outerXEast') : child.getOuterXEast();
        
        if (viewport.isOverflow(outerXEast, innerXEast)) {   
            viewport.overflow();                       
            child.setLocation(viewport);
        } else {            
            child.setLocation(viewport);
        }
        
        if (child.isIncluded() && !this.hasLocationMap[child.oid]) {    
            this.addToLocationList(child);          
        }

        if (child.isTargetEnabled('x') && !child.isTargetUpdating('x') && !child.isTargetImperative('x') && child.getTargetSteps('x') === 0) {
            TargetExecutor.resolveTargetValue(child, 'x');
            TargetExecutor.snapActualToTarget(child, 'x');  
        } else if (!TUtil.isDefined(child.targetValues.x)) {
            child.val('x', child.x);                
        }

        if (child.isTargetEnabled('y') && !child.isTargetUpdating('y') && !child.isTargetImperative('y') && child.getTargetSteps('y') === 0) {
            TargetExecutor.resolveTargetValue(child, 'y');
            TargetExecutor.snapActualToTarget(child, 'y');              
        } else if (!TUtil.isDefined(child.targetValues.y)) {
            child.val('y', child.y);          
        }
        
        if (preX !== child.getX() || preY !== child.getY()) {
            child.addToStyleTargetList('transform');          
        }
                
        child.calculateAbsolutePosition(child.getX(), child.getY());
        
        viewport.isVisible(child);
                   
        child.addToParentVisibleList();
               
        if (child.shouldCalculateChildren()) {
            this.calculateContainer(child);  
        }
  
        if (child.isInFlow()) {
            
            if (TUtil.isNumber(child.val('appendNewLine'))) {
                viewport.appendNewLine();
                viewport.calcContentWidthHeight();
            } else {
                viewport.calcContentWidthHeight();                
                viewport.nextLocation();
            }
        }
            
        if (Array.isArray(child.val('contentHeight'))) {
            child.val('contentHeight').forEach(function(key) {
                var preVal = child.val(key);
                child.val(key, child.getContentHeight());
                if (preVal !== child.val(key)) child.addToStyleTargetList(key);
            });
        }

        if (Array.isArray(child.val('contentWidth'))) {
            child.val('contentWidth').forEach(function(key) {
                var preVal = child.val(key);                
                child.val(key, child.getContentWidth());
                if (preVal !== child.val(key)) child.addToStyleTargetList(key);                
            });
        }
        
        viewport.calcContentWidthHeight();
        
        
        this.locationCount.push(child.oid + "-" + child.updatingTargetList.length + "-" + (browser.now() - this.startTime));
    }   
    
};

LocationManager.prototype.calculateTargets = function(tmodel) {
    this.resetTargetsOnEvents(tmodel);
    tapp.targetManager.applyTargetValues(tmodel);        
    tapp.targetManager.setActualValues(tmodel);
   
    if (tmodel.hasDom()) {
        var preWidth = tmodel.getWidth();
        var preHeight = tmodel.getHeight();
        
        
        if ((!TUtil.isDefined(tmodel.targetValues.width) && !TUtil.isDefined(tmodel.targets.width) && !TUtil.isDefined(tmodel.targetValues.contentWidth)) || tmodel.getTargetValue('widthFromDom')) {
            TargetUtil.setWidthFromDom(tmodel);
        }
        if ((!TUtil.isDefined(tmodel.targetValues.height) && !TUtil.isDefined(tmodel.targets.height) && !TUtil.isDefined(tmodel.targetValues.contentHeight)) || tmodel.getTargetValue('heightFromDom')) {
           TargetUtil.setHeightFromDom(tmodel);
        }

        if (preWidth !== tmodel.getWidth() || preHeight !== tmodel.getHeight()) {
            tmodel.addToStyleTargetList('dim');
        }    
    }
};

LocationManager.prototype.resetTargetsOnEvents = function(tmodel) {
    var resetTargets = [];

    if (this.resizeFlag && tmodel.targets['onResize']) {
        resetTargets = resetTargets.concat(tmodel.targets['onResize']);
    }

    if (getEvents().isTouchHandler(tmodel) && tmodel.targets['onTouchEvent']) {
        resetTargets = resetTargets.concat(tmodel.targets['onTouchEvent']);
    }
    
    if (getEvents().isClickHandler(tmodel) && tmodel.targets['onClickEvent']) {
        resetTargets = resetTargets.concat(tmodel.targets['onClickEvent']);
    }

    if ((getEvents().isScrollLeftHandler(tmodel) && getEvents().deltaX()) 
        || (getEvents().isScrollTopHandler(tmodel) && getEvents().deltaY())) {
        if (tmodel.targets['onScrollEvent']) {
            resetTargets = resetTargets.concat(tmodel.targets['onScrollEvent']);
        }
    }

    if (TargetJ.getEvents().currentKey && tmodel.targets['onKeyEvent']) {
        resetTargets = resetTargets.concat(tmodel.targets['onKeyEvent']);
    }
    
    resetTargets.forEach(function(key) {        
        if (tmodel.targets[key] && tmodel.isTargetComplete(key)) {
            tmodel.resetTarget(key);
        }            
    });    
};

LocationManager.prototype.addToLocationList = function(child)   {
    this.hasLocationList.push(child);
    this.hasLocationMap[child.oid] = child;
};

export { LocationManager };
