import { tapp, App } from "./App.js";
import { browser } from "./Browser.js";
import { SearchUtil } from "./SearchUtil.js";
import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { Viewport } from "./Viewport.js";
import { $Dom } from "./$Dom.js";

function TModel(type, targets) {
      
    if (arguments.length === 1 && typeof type === 'object') {
        targets = type;
        type = "";     
    }

    this.type = type ? type : 'blank';
    this.targets = Object.assign({}, targets);
    this.activeTargetMap = {};
    this.styleTargets = [];
    this.initTargets();
    
    var uniqueId = App.getOid(this.type);
    this.oid = uniqueId.oid;
    this.oidNum = uniqueId.num;
    
    this.targetValues = {};
    
    this.actualValues = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        leftMargin: 0,
        rightMargin: 0,
        topMargin: 0,
        bottomMargin: 0,
        innerWidth: undefined,
        innerHeight: undefined,
        opacity: 1,
        zIndex: 1,
        scale: 1,
        rotate: 0,
        scrollLeft: 0,
        scrollTop: 0,
        textOnly: true,
        html: undefined,
        css: '',
        style: null,
        children: [],
        addedChildren: [],
        allChildren: [],
        isInFlow: true,
        canHaveDom: true,
        canHandleEvents: false,
        widthFromDom: false,
        heightFromDom: false,
        keepEventDefault: false,
        isIncluded: true,
        canBeBracketed: true,      
        isDomDeletable: true,
        calculateChildren: undefined,
        isVisible: undefined,
        onResize: undefined
    };
        
    this.targetUpdatingMap = {};
    this.targetUpdatingList = [];
    
    this.targetMethodMap = {};
    
    this.updatingChildren = [];
       
    this.targetLastUpdateMap = {};

    this.parent = null;
        
    this.$dom = null;
    this.yVisible = false;
    this.xVisible = false;
    this.domHeight = undefined;
    this.domWidth = undefined;
    
    this.innerContentWidth = 0;
    this.innerContentHeight = 0;
    this.contentWidth = 0;    
    this.contentHeight = 0;

    this.x = 0;
    this.y = 0;
    this.absX = 0;
    this.absY = 0;
    
    this.inFlowVisibles = [];
               
    this.domValues = {};
}

TModel.prototype.getParent = function()  {
    return this.parent;
};

TModel.prototype.getRealParent = function() {
    return this.parent;
};

TModel.prototype.getDomParent = function() {
    return this.actualValues.domParent ? this.actualValues.domParent : null;
};

TModel.prototype.getDomHolder = function() {
    return this.actualValues.domHolder ? this.actualValues.domHolder : this.getDomParent() ? this.getDomParent().$dom : SearchUtil.findParentByTarget(this, 'domHolder') ? SearchUtil.findParentByTarget(this, 'domHolder').$dom : null;
};

TModel.prototype.addToStyleTargets = function(key) {
    if (TargetUtil.styleTargetMap[key] && !this.styleTargets.includes(key)) {
        this.styleTargets.push(key);
    }
};

TModel.prototype.initTargets = function() {
    var self = this;
    this.targetValues = {};
    this.activeTargetMap = {};
    Object.keys(this.targets).forEach(function(key) {
        self.activeTargetMap[key] = true;
        self.addToStyleTargets(key);
    });    
};

TModel.prototype.hasDomHolderChanged = function() {
    return this.getDomHolder() && this.getDomHolder().exists() && this.$dom.parent().getAttribute("id") !== this.getDomHolder().attr("id");
};

TModel.prototype.hasDom = function () {
    return !!this.$dom && this.$dom.exists();
};

TModel.prototype.hasChildren = function()  {
    return this.getChildren().length > 0;
};

TModel.prototype.getChildren = function() {
    if (!this.getActualValueLastUpdate('allChildren')
            || this.getActualValueLastUpdate('children') >= this.getActualValueLastUpdate('allChildren')
            || this.getActualValueLastUpdate('addedChildren') >= this.getActualValueLastUpdate('allChildren')) {
                   
        this.actualValues.allChildren = this.actualValues.children.concat(this.actualValues.addedChildren);

        if (this.actualValues.children.length > 0) {
            var self = this;
            this.actualValues.children.forEach(function(t) { t.parent = self; });
            this.actualValues.allChildren.sort(function(a, b) { 
                return !a.canBeBracketed() && b.canBeBracketed() ? -1 : 1; 
            });
        }
        
        this.targetValues['allChildren'] ? this.setActualValueLastUpdate('allChildren') : this.setTargetValue('allChildren', this.actualValues.allChildren);
    }
    
    return this.actualValues.allChildren;
};

TModel.prototype.getAllNestedChildren = function() {
    var nested = []; 
    
    function traverse(tmodel) {
        if (tmodel.hasChildren())  {
            var list = tmodel.getChildren();
            nested = nested.concat(list);
            list.forEach(function(t) {
                traverse(t);
            });            
        }
    }
    
    traverse(this);
    return nested;
};

TModel.prototype.getLastChild = function() {
    return this.hasChildren() ? this.getChildren()[this.getChildren().length - 1] : undefined;
};

TModel.prototype.getFirstChild = function() {
    return this.hasChildren() ? this.getChildren()[0] : undefined;
};

TModel.prototype.getChild = function(index) {
    return this.hasChildren() ? this.getChildren()[index] : undefined;
};

TModel.prototype.getChildIndex = function(child) {
    return this.getChildren().indexOf(child);
};

TModel.prototype.getChildrenOids = function()   {
    return this.getChildren().oids();
};

TModel.prototype.filterChildren = function(type) {
    return this.getChildren().filter(function(tmodel) {
        return Array.isArray(type) ? type.includes(tmodel.type) : typeof type === 'function'  ? type.call(tmodel) : tmodel.type === type;
    });
};

TModel.prototype.findChild = function(type) {
   return this.getChildren().find(function(tmodel, index) {
       var typeResult = typeof type === 'function'  ? type.call(tmodel) : tmodel.type === type;
       return typeResult; 
   });
};

TModel.prototype.findLastChild = function(type) {
   return this.getChildren().findLast(function(tmodel) {
       return typeof type === 'function'  ? type.call(tmodel) : tmodel.type === type;
   });
};

TModel.prototype.getParentValue = function(targetName) {
    var parent =  SearchUtil.findParentByTarget(this, targetName);
    return parent ? parent.getValue(targetName) : undefined;
};

TModel.prototype.getGlobalValue = function(targetName) {
    var tmodel = SearchUtil.findByTarget(targetName);
    return tmodel ? tmodel.getValue(targetName) : undefined;
};

TModel.prototype.getGlobalValueByType = function(type, targetName) {
    var tmodel = SearchUtil.findByType(type);
    return tmodel ? tmodel.getValue(targetName) : undefined;
};

TModel.prototype.getContentHeight = function()  {
    return this.contentHeight;
};

TModel.prototype.getInnerContentHeight = function() {
    return 0;
};

TModel.prototype.getInnerHeight = function()  {
    return TUtil.isDefined(this.actualValues.innerHeight) ? this.actualValues.innerHeight : this.getHeight();
};

TModel.prototype.getInnerWidth = function()  {
    return TUtil.isDefined(this.actualValues.innerWidth) ? this.actualValues.innerWidth : this.getWidth();
};

TModel.prototype.getInnerXEast = function()  {
    return this.absX + this.getInnerWidth();
};

TModel.prototype.getOuterXEast = function()  {
    return this.absX + this.getInnerWidth();
};

TModel.prototype.getContentWidth = function()  {
    return this.contentWidth;
};

TModel.prototype.getUIDepth = function()  {
    var depth = 0;
    
    var node = this.parent;
    while (node)  {
        depth++;
        node = node.parent;
    }
    
    return depth; 
};

TModel.prototype.resetVisibleList = function() {
    this.inFlowVisibles.length = 0;
};

TModel.prototype.addToParentVisibleList = function() {
    if (this.isVisible() && this.isInFlow() && this.getParent())  {  
        this.getParent().inFlowVisibles.push(this);
    }
};

TModel.prototype.isVisible = function () {
    return TUtil.isDefined(this.actualValues.isVisible) ? this.actualValues.isVisible : this.xVisible && this.yVisible;
};


TModel.prototype.shouldCalculateChildren = function() {
    return TUtil.isDefined(this.actualValues.calculateChildren) ?this.actualValues.calculateChildren : this.isVisible() && this.isIncluded() && (this.hasChildren() || this.getContentHeight() > 0);
};

TModel.prototype.createViewport = function() { 
    this.viewport = this.viewport ? this.viewport.reset() : new Viewport(this);
    return this.viewport;
};

TModel.prototype.setLocation = function(viewport) {
    this.x = viewport.getXNext();
    this.y = viewport.getYNext();
};

TModel.prototype.calculateAbsolutePosition = function(x, y) {
    var rect = this.getBoundingRect();
    this.absX = rect.left + x;
    this.absY = rect.top + y;
};

TModel.prototype.getBoundingRect = function() {              
    return TUtil.getBoundingRect(this);
};

TModel.prototype.fixCss = function () {
    var css = this.getCss();
    if (this.$dom.css() !== css) {
        this.$dom.css(css);
    } 
};

TModel.prototype.fixStyle = function () {
    var style = this.getStyle();
    if (TUtil.isDefined(style) && this.domValues.style !== style) {
        this.$dom.setStyleByMap(style);
        this.domValues.style = style;
    }
};

TModel.prototype.fixXYRotateScale = function () {
    var x = Math.floor(this.getX()), y = Math.floor(this.getY()), rotate = Math.floor(this.getRotate()), scale = TUtil.formatNum(this.getScale(), 2);

    if (this.domValues.x !== x || this.domValues.y !== y || this.domValues.rotate !== rotate || this.domValues.scale !== scale) {
        this.$dom.transform(x, y, rotate, scale);

        this.domValues.y = y;
        this.domValues.x = x;
        this.domValues.rotate = rotate;
        this.domValues.scale = scale;
    }
};

TModel.prototype.fixDim = function () {
    var width = Math.floor(this.getWidth());
    var height = Math.floor(this.getHeight());
    
    if (this.$dom.width() !== width || this.$dom.height() !== height) { 
        this.$dom.width(width);
        this.$dom.height(height);
    }
};

TModel.prototype.fixStyleAttributes = function() {
    var self = this;
    this.styleTargets.forEach(function(key) {
        if (TUtil.isDefined(self.getValue(key)) && self.$dom.style(key) !== self.getValue(key)) {
            self.$dom.style(key, self.getValue(key));
        }
    });
};

TModel.prototype.isMarkedDeleted = function() {
    return this.getValue('tmodelDeletedFlag') === true;
};

TModel.prototype.markAsDeleted = function()   {
    this.setTargetValue('tmodelDeletedFlag', true);
    this.getChildren().forEach(function(tmodel) {
        tmodel.markAsDeleted();
    });
};

TModel.prototype.isTextOnly = function()    {
    return this.actualValues.textOnly;
};

TModel.prototype.getHtml = function()    {
    return this.actualValues.html;
};

TModel.prototype.isInFlow = function() {
    return this.actualValues.isInFlow;
};

TModel.prototype.canHandleEvents = function() {
    return this.actualValues.canHandleEvents;
};

TModel.prototype.keepEventDefault = function() {
    return this.actualValues.keepEventDefault;
};

TModel.prototype.canBeBracketed = function() {
    return this.actualValues.canBeBracketed;
};

TModel.prototype.isIncluded = function() {
    return this.actualValues.isIncluded;     
};

TModel.prototype.canHaveDom = function() {
    return this.actualValues.canHaveDom;         
};

TModel.prototype.isDomDeletable = function()   {
    return this.actualValues.isDomDeletable;     
};

TModel.prototype.getOpacity = function()    {
    return this.actualValues.opacity;
};

TModel.prototype.getX = function()  {
    return this.actualValues.x;
};

TModel.prototype.getY = function()  {
    return this.actualValues.y;
};

TModel.prototype.getZIndex = function() {
    return this.actualValues.zIndex;
};

TModel.prototype.getScale = function() {
    return this.actualValues.scale;
};

TModel.prototype.getMeasuringScale = function() {
    return this.actualValues.scale;
};

TModel.prototype.getValue = function(key)   {
    return this.actualValues[key];
};

TModel.prototype.getTopMargin = function () {
    return this.actualValues.topMargin;
};

TModel.prototype.getLeftMargin = function()  {
    return this.actualValues.leftMargin;
};

TModel.prototype.getRightMargin = function () {
    return this.actualValues.rightMargin;
};

TModel.prototype.getBottomMargin = function () {
    return this.actualValues.bottomMargin;
};

TModel.prototype.getRotate = function() {
    return this.actualValues.rotate;
};

TModel.prototype.getWidth = function () {
    return this.actualValues.width;
};

TModel.prototype.getHeight = function () {
    return this.actualValues.height;
};
 
TModel.prototype.getScrollTop = function()  {
    return Math.floor(this.actualValues.scrollTop);
};

TModel.prototype.getScrollLeft = function()  {
    return Math.floor(this.actualValues.scrollLeft);
};

TModel.prototype.getCss = function() {
    return this.actualValues.css.indexOf('tgt') >= 0 ? this.actualValues.css : !this.actualValues.css ? 'tgt' : 'tgt ' + this.actualValues.css;
};

TModel.prototype.getStyle = function() {
    return this.actualValues.style;
};

TModel.prototype.getScaledWidth = function() {
    return this.getWidth() * this.getScale();
};

TModel.prototype.getScaledHeight = function() {
    return this.getHeight() * this.getScale();
};

TModel.prototype.getTargetStepPercent = function(key, step)   {
    var steps = this.getTargetSteps(key);
    step = !TUtil.isDefined(step) ? this.getTargetStep(key) : step;
    return steps ? step / steps : 1;
};

TModel.prototype.resetTargetStep = function(key)   {
    if (this.targetValues[key]) {
        this.targetValues[key].step = 0;
    }
};

TModel.prototype.resetTargetCycle = function(key)   {
    if (this.targetValues[key]) {
        this.targetValues[key].cycle = 0;
    }
};

TModel.prototype.resetScheduleTimeStamp = function(key)   {
    if (this.targetValues[key]) {
        this.targetValues[key].scheduleTimeStamp = undefined;
    }
};

TModel.prototype.resetLastActualValue = function(key)   {
    if (this.targetValues[key]) {
        this.targetValues[key].lastActualValue = undefined;
    }
};

TModel.prototype.hasTargetUpdatedAfter = function(key, targetKey, tmodel) {
    tmodel = TUtil.isDefined(tmodel) ? tmodel : this;
    var result = false;
    var actualValueLastUpdate = tmodel ? tmodel.getActualValueLastUpdate(targetKey) : 0;
    if (actualValueLastUpdate > 0 && (!this.targetLastUpdateMap[key + "_" + targetKey] || this.targetLastUpdateMap[key + "_" + targetKey] - actualValueLastUpdate < 10)) {        
        result = true;
        this.targetLastUpdateMap[key + "_" + targetKey] = browser.now();
    }
    
    return result;
};

TModel.prototype.updateTargetStatus = function(key) {   
    if (!this.targetValues[key]) return;
    
    var cycle = this.getTargetCycle(key);
    var cycles = this.getTargetCycles(key);
    var step = this.getTargetStep(key);
    var steps = this.getTargetSteps(key);
    
    this.targetValues[key].status = '';
   
    if (step < steps || cycle < cycles || !this.doesTargetEqualActual(key)) {
        this.targetValues[key].status = 'updating';
    } else if (!this.hasTargetGotExecuted(key) || this.isTargetInLoop(key)) {
        this.targetValues[key].status = 'active';        
    } else {   
        this.targetValues[key].status = 'done';
    }
    
    return this.targetValues[key].status;
};

TModel.prototype.getTargetStatus = function(key) {   
    return this.targetValues[key] ? this.targetValues[key].status : '';
};

TModel.prototype.isTargetActive = function(key) {
    return this.targetValues[key] && this.targetValues[key].status === 'active';
};

TModel.prototype.isTargetUpdating = function(key) {
    return this.targetValues[key] && this.targetValues[key].status === 'updating';
};

TModel.prototype.isTargetDone = function(key) {
    return this.targetValues[key] && this.targetValues[key].status === 'done';
};

TModel.prototype.isTargetComplete = function(key) {
    return this.targetValues[key] && this.targetValues[key].status === 'complete';
};

TModel.prototype.hasTargetGotExecuted = function(key) {
    return this.targets[key] ? this.targetValues[key] && this.targetValues[key].executionCount > 0 : true;
};

TModel.prototype.isTargetImperative = function(key) {
    return this.targetValues[key] ? this.targetValues[key] && this.targetValues[key].callingTargetKey !== key : false;    
};

TModel.prototype.getTargetExecutionCount = function(key) {
    return this.targetValues[key] ? this.targetValues[key].executionCount : 0;    
};

TModel.prototype.setTargetComplete = function(key) {
    if (this.targetValues[key]) {
        this.targetValues[key].status = 'complete';
    }
};

TModel.prototype.isTargetEnabled = function(key) {
    var target = this.targets[key];
    
    if (!TUtil.isDefined(target)) return false;
      
    return typeof target.enabledOn === 'function' ? target.enabledOn.call(this, key) : target.enabledOn === false ? false : true;
};

TModel.prototype.isTargetInLoop = function(key) {            
    return this.targets[key] ? (typeof this.targets[key].loop === 'function' ? this.targets[key].loop.call(this, key) :  this.targets[key].loop) : false;
};

TModel.prototype.doesTargetEqualActual = function(key) {
    if (this.targetValues[key]) {
        var deepEquality =  this.targets[key] ? this.targets[key].deepEquality : false;
        return deepEquality ? TUtil.areEqual(this.getTargetValue(key), this.getValue(key), deepEquality) : this.getTargetValue(key) === this.getValue(key);
    } 
    
    return false;
};

TModel.prototype.getTargetValue = function(key)  {
    return this.targetValues[key] ? (typeof this.targetValues[key].value  === 'function' ? this.targetValues[key].value.call(this) : this.targetValues[key].value) : undefined;
};

TModel.prototype.getTargetSteps = function(key)  {
    return this.targetValues[key] ? this.targetValues[key].steps || 0 : 0;
};

TModel.prototype.getTargetStep = function(key)  {
    return this.targetValues[key] ? this.targetValues[key].step : 0;
};

TModel.prototype.getScheduleTimeStamp = function(key)  {
    return this.targetValues[key] ? this.targetValues[key].scheduleTimeStamp : undefined;
};

TModel.prototype.getLastActualValue = function(key)  {
    return this.targetValues[key] ? this.targetValues[key].lastActualValue : undefined;
};

TModel.prototype.getActualValueLastUpdate = function(key)  {
    return this.targetValues[key] ? this.targetValues[key].actualValueLastUpdate : undefined;
};

TModel.prototype.setTargetStep = function(key, value)  {
    if (this.targetValues[key]) {
        this.targetValues[key].step = value;
    }
    return this.targetValues[key].step;
};

TModel.prototype.getTargetCycles = function(key)   {
    return this.targetValues[key] ? this.targetValues[key].cycles || 0 : 0;
};

TModel.prototype.getTargetCycle = function(key)   {
    return this.targetValues[key] ? this.targetValues[key].cycle : 0;
};

TModel.prototype.setTargetCycle = function(key, value)   {
    if (this.targetValues[key]) {
        this.targetValues[key].cycle = value;
    }
};

TModel.prototype.setScheduleTimeStamp = function(key, value)   {
    if (this.targetValues[key]) {
        this.targetValues[key].scheduleTimeStamp = value;
    }
};

TModel.prototype.setLastActualValue = function(key, value) {
    if (this.targetValues[key]) {
        this.targetValues[key].lastActualValue = value;
    }
};

TModel.prototype.setActualValueLastUpdate = function(key) {
    if (this.targetValues[key]) {
        this.targetValues[key].actualValueLastUpdate = browser.now();
    }
};

TModel.prototype.getTargetEasing = function(key)   {
    return typeof this.targets[key] === 'object' && this.targets[key].easing ? this.targets[key].easing : undefined;
};

TModel.prototype.getTargetStepInterval = function(key) {
    return this.targetValues[key] ? this.targetValues[key].stepInterval : undefined;
};

TModel.prototype.getTargetEventFunctions = function(key)   {
    return this.targetValues[key] ? this.targetValues[key].events: undefined;
};

TModel.prototype.getCallingTargetKey = function(key)   {
    return this.targetValues[key] ? this.targetValues[key].callingTargetKey: undefined;
};

TModel.prototype.resetCallingTargetKey = function(key)   {
    if (this.targetValues[key]) {
        this.targetValues[key].callingTargetKey = key;
    }
};

TModel.prototype.setTargetValue = function(key, value, steps, stepInterval, cycles, callingTargetKey) {
                    
    steps = steps || 0;
    cycles = cycles || 0;
    stepInterval = stepInterval || 0;

    if (this.targetValues[key]) {    
        if (key !== callingTargetKey && (this.targetValues[key].callingTargetKey !== callingTargetKey || value !== this.targetValues[key].value)) {
            this.resetTargetStep(key);
            this.resetLastActualValue(key);
        }  
        
        this.targetValues[key].value = value;
        this.targetValues[key].steps = steps;
        this.targetValues[key].cycles = cycles;
        this.targetValues[key].stepInterval = stepInterval;
        this.targetValues[key].callingTargetKey = callingTargetKey;
    } else { 
        this.targetValues[key] = Object.assign(TargetUtil.emptyValue(), {
            value: value,  
            steps: steps, 
            cycles: cycles, 
            stepInterval: stepInterval, 
            callingTargetKey: callingTargetKey
        });
        TargetUtil.extractInvisibles(this, this.targets[key], key);            
    }

    //take a shortcut and update the actualValues immediately without the need for TargetManager
    if (steps === 0 && cycles === 0) {
        var oldValue = this.actualValues[key];
        this.actualValues[key] = typeof value === 'function' ? value.call(this) : value;            
        this.setActualValueLastUpdate(key);
        TargetUtil.handleValueChange(this, key, this.actualValues[key], oldValue, 0, 0); 
    }
    
    this.activeTargetMap[key] = true;
    this.targetValues[key].executionCount++; 

    this.updateTargetStatus(key);
};

TModel.prototype.setValue = function(key, value) {
    this.actualValues[key] = value;
};

TModel.prototype.addChild = function(child, index)  { 
    var addedChildren = this.actualValues.addedChildren;
    
    index = TUtil.isDefined(index) ? index : addedChildren.length;
    child.parent = this;
        
    if (index >= addedChildren.length) {
        addedChildren.push(child);
    } else {
        addedChildren.splice(index, 0, child);
    }
        
    this.setActualValueLastUpdate('children');
    this.targetValues['addedChildren'] ? this.setActualValueLastUpdate('addedChildren') : this.setTargetValue('addedChildren', addedChildren);
    
    tapp.manager.scheduleRun(10, 'addChild-' + this.oid + "-" + child.oid);
     
    return this;
};

TModel.prototype.addUpdatingChild = function(child) {
    if (this.updatingChildren.indexOf(child) === -1) {
        this.updatingChildren.push(child);
    }
};

TModel.prototype.removeUpdatingChild = function(child) {
    var index = this.updatingChildren.indexOf(child);
    if (index >= 0) {
        this.updatingChildren.splice(index, 1);
    }
};

TModel.prototype.removeTarget = function(key) {
    delete this.targets[key];
    delete this.activeTargetMap[key];
    delete this.targetValues[key];
    var index = this.styleTargets.indexOf(key);
    if (index !== -1) {
        this.styleTargets.splice(index, 1);
    }    
};

TModel.prototype.addTarget = function(key, target) {
    this.targets[key] = target;
    this.activeTargetMap[key] = true;
    delete this.targetValues[key];
    this.addToStyleTargets(key);    
            
    tapp.manager.scheduleRun(10, 'addTarget-' + this.oid + "-" + key);
};

TModel.prototype.addTargets = function(targets) {
    var self = this;
    Object.keys(targets).forEach(function(key) {
        self.targets[key] = targets[key];
        self.activeTargetMap[key] = true;
        delete self.targetValues[key];
        self.addToStyleTargets(key);
    });
    
    tapp.manager.scheduleRun(10, 'addTargets-' + this.oid);    
};

TModel.prototype.deleteTargetValue = function(key)   {
    delete this.targetValues[key];
    this.activeTargetMap[key] = true;

    tapp.manager.scheduleRun(10, 'deleteTargetValue-' + this.oid + "-" + key);    
};

TModel.prototype.deleteTargetValues = function(keys) {
    var self = this;
    keys.forEach(function(key) {
        delete self.targetValues[key];
        self.activeTargetMap[key] = true;
    });
    
    tapp.manager.scheduleRun(10, 'deleteTargetValues-' + this.oid);    
    
};

TModel.prototype.setTargetMethodName = function(targetName, methodName) {
    if (!this.targetMethodMap[targetName]) {
        this.targetMethodMap[targetName] = [];
    }
    if (this.targetMethodMap[targetName].indexOf(methodName) === -1) {
        this.targetMethodMap[targetName].push(methodName);
    }
};

export { TModel };
