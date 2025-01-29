import { BaseModel } from "./BaseModel.js";
import { getRunScheduler } from "./App.js";
import { Viewport } from "./Viewport.js";
import { TUtil } from "./TUtil.js";
import { SearchUtil } from "./SearchUtil.js";
import { TargetUtil } from "./TargetUtil.js";

/**
 * It provides the base class for all objects in an app where targets are defined. 
 * These objects typically have a DOM but can also operate without one.
 */
class TModel extends BaseModel {
    constructor(type, targets) {
        super(type, targets);

        this.addedChildren = [];
        this.deletedChildren = [];
        this.movedChildren = [];
        this.lastChildrenUpdate = { additions: [], deletions: [] };
        this.allChildrenList = [];
        this.allChildrenMap = {};

        this.$dom = null;

        this.x = 0;
        this.y = 0;
        this.absX = 0;
        this.absY = 0;

        this.domHeightTimestamp = 0;
        this.domWidthTimestamp = 0;

        this.contentWidth = 0;
        this.contentHeight = 0;
        this.bottomBaseWidth = 0;
        this.topBaseHeight = 0;
        
        this.styleMap = {};
        this.transformMap = {};
        
        this.visibilityStatus = { top: false, right: false, bottom: false, left: false };
        this.isNowInvisible = false;
                
        this.visibleChildren = [];                  
      
        this.hasDomNow = false;
        this.isNowVisible = false;
        this.currentStatus = 'new';
        
        this.initTargets();        
    }

    createViewport() {
        this.viewport = this.viewport || new Viewport();

        const scrollLeft = -this.getScrollLeft();
        const scrollTop = -this.getScrollTop();
        
        const x = scrollLeft, y = scrollTop;
        
        this.viewport.xNext = x;
        this.viewport.xNorth = x;
        this.viewport.xEast = x;
        this.viewport.xSouth = x;
        this.viewport.xWest = x;
        
        this.viewport.scrollLeft = scrollLeft;
        this.viewport.scrollTop = scrollTop;        
        
        this.viewport.absX = this.absX;
        this.viewport.absY = this.absY;
        
        this.viewport.xOverflowReset = this.absX;        
        this.viewport.xOverflowLimit = this.absX +this.getWidth();

        this.viewport.yNext = y;
        this.viewport.yNorth = y;
        this.viewport.yWest = y;
        this.viewport.yEast = y;
        this.viewport.ySouth = y;
                
        Object.assign(this.viewport, this.val('viewport') || {});
        
        for (const key in this.viewport) {
            const prefixedKey = `viewport_${key}`;
            if (TUtil.isDefined(this.val(prefixedKey))) {
                this.viewport[key] = this.val(prefixedKey);
            }
        }
        
        return this.viewport;
    }

    calcAbsolutePosition(x, y) {
        this.absX = TUtil.isDefined(this.val('absX')) ? this.val('absX') : this.getParent().absX + x;
        this.absY = TUtil.isDefined(this.val('absY')) ? this.val('absY') : this.getParent().absY + y;
    }
    
    addChild(child, index = this.addedChildren.length + this.allChildrenList.length) { 
        this.addedChildren.push({ index, child });
        
        child.activate();

        return this;
    }
  
    removeChild(child) {
        this.deletedChildren.push(child);   
        this.removeFromUpdatingChildren(child);

        getRunScheduler().schedule(1, 'removeChild-' + this.oid + "-" + child.oid);

        return this;
    }
    
    moveChild(child, index) {
        this.movedChildren.push({ index, child });
        
        if (child.hasDom() && child.requiresDomRelocation()) {  
            child.domOrderIndex = index;
            child.activate();
        }
         
        getRunScheduler().schedule(1, 'moveChild-' + this.oid + "-" + child.oid);
                           
        return this;
    }
    
    getChildren() { 
        if (this.deletedChildren.length > 0) {            
            this.deletedChildren.forEach(child => {                
                if (this.allChildrenMap[child.oid]) {
                    const index = this.allChildrenList.indexOf(child);
                    this.lastChildrenUpdate.deletions.push(child);
                    this.allChildrenList.splice(index, 1);
                    delete this.allChildrenMap[child.oid];
                }
            });                     
                                    
            this.deletedChildren.length = 0;
        } 
        
        if (this.addedChildren.length > 0) {
            this.addedChildren.sort((a, b) => a.index - b.index);

            this.addedChildren.forEach(({ index, child }) => {
                
                if (this.allChildrenMap[child.oid]) {
                    return;
                }
                
                child.parent = this;
                if (!TUtil.isDefined(child.val('canDeleteDom')) && this.val('canDeleteDom') === false) {
                    child.val('canDeleteDom', false);
                }

                if (index >= this.allChildrenList.length) {
                    this.allChildrenList.push(child);
                } else {
                    this.allChildrenList.splice(index, 0, child);
                }
                
                this.allChildrenMap[child.oid] = true;
 
                this.lastChildrenUpdate.additions.push({ index, child });
            });
                                    
            this.addedChildren.length = 0;
        }
        
        if (this.movedChildren.length > 0) {
            this.movedChildren.sort((a, b) => a.index - b.index);
            
            const deletionMap = {};
            const additionMap = {};
            this.movedChildren.forEach(({ index, child }) => {
                this.lastChildrenUpdate.deletions.push(child);
                this.lastChildrenUpdate.additions.push({ index, child });
                
                const currentIndex = this.allChildrenList.indexOf(child);
                
                if (index === currentIndex) {
                    return;
                }
                
                if (additionMap[child.oid]) {
                    delete additionMap[child.oid];
                }

                const deleted = this.allChildrenList.splice(index, 1, child);
                
                if (!deletionMap[index] && deleted.length > 0) {
                    additionMap[deleted[0].oid] = { child: deleted[0], index: index + 1 };
                }
                if (currentIndex >= 0) {
                    deletionMap[currentIndex] = { fromIndex: currentIndex < index ? currentIndex : index, child };
                }                
                
                if (deletionMap[index]) {
                    delete deletionMap[index];
                }
            });
            Object.values(additionMap).forEach(({ index, child }) => {
                this.allChildrenList.splice(index, 0, child);
            });
                        
            Object.values(deletionMap).forEach(({ fromIndex, child }) => {
                const deleteIndex = this.allChildrenList.indexOf(child, fromIndex);
                this.allChildrenList.splice(deleteIndex, 1);
            });
            
            this.movedChildren.length = 0;
        }
        
        return this.allChildrenList;
    }

    removeAll() {
        this.allChildrenList = [];
        this.allChildrenMap = {};

        this.updatingChildrenList.length = 0;
        this.updatingChildrenMap = {};
        
        if (this.hasDom()) {
            this.$dom.deleteAll();
        }
         
        return this;        
    }   
    
    addToParentVisibleChildren() {
        if (this.isVisible() && this.isInFlow() && this.getParent()) {
            this.getParent().visibleChildren.push(this);
        }
    }    

    shouldCalculateChildren() {
        if (TUtil.isDefined(this.val('calculateChildren'))) {
            return this.val('calculateChildren');
        }
        const result = this.isIncluded() && 
                (this.isVisible() || this.currentStatus === 'new')  && 
                (this.hasChildren() || this.addedChildren.length > 0 || this.getContentHeight() > 0);

        this.currentStatus = undefined;
        return result;
    }
         
    getFirstChild() {
        return this.allChildrenList[0];
    }
    
    hasChildren() {
        return this.allChildrenList.length > 0;
    }
    
    findChildren(type) {
        return this.allChildrenList.filter(child => child.type === type);
    }

    getLastChild() {
        return this.allChildrenList[this.allChildrenList.length - 1];
    }
    
    getChild(index) {
        return this.allChildrenList[index];
    }

    getChildIndex(child) {
        return this.allChildrenList.indexOf(child);
    }

    getChildrenOids() {
        return this.allChildrenList.map(o => o.oid).join(" ");
    }

    findChild(type) {
        return this.allChildrenList.find(child => child.type === type);
    }

    findLastChild(type) {
        return this.allChildrenList.findLast(child => child.type === type);
    }

    getParentValue(targetName) {
        const parent = SearchUtil.findParentByTarget(this, targetName);
        return parent ? parent.val(targetName) : undefined;
    }
    
    delVal(key) {
        if (key.startsWith('_')) {
            delete this[key.slice(1)];
        } else {
            delete this.actualValues[key];
        }
    }

    val(key, value) {
        let actual = this.actualValues;
        let lastActual = this.lastActualValues;
        if (key.startsWith('_')) {
            actual = this;
            key = key.slice(1);
        }
        if (value !== undefined) {
            lastActual[key] = actual[key];
            if (value !== actual[key]) {
                actual[key] = value;
            }
            return this;
        }
        
        return actual[key];
    }
    
    lastVal(key) {
        return this.lastActualValues[key];
    }

    floorVal(key) {
        return Math.floor(this.val(key));
    }

    getDomParent() {
        return this.val('domParent') || SearchUtil.findParentByTarget(this, 'domHolder');
    }
   
    getDomHolder(tmodel) {
        const domHolder = this.val('domHolder');
        const domParent = this.getDomParent();

        if (domHolder === true && tmodel !== this) {
            return this.$dom;
        }

        if (domHolder && domHolder !== true && tmodel.$dom !== domHolder) {
            return domHolder;
        }

        return domParent ? domParent.$dom : null;
    }

    bug() {
        return [
            { visible: this.isVisible() },
            { visibilityStatus: this.visibilityStatus },
            { hasDom: this.hasDom() },
            { x: this.getX() },
            { y: this.getY() },
            { width: this.getWidth() },
            { height: this.getHeight() },
            { activeTargetList: this.activeTargetList },
            { updatingTargetList: this.updatingTargetList },
            { updatingChildrenList: this.updatingChildrenList },
            { activeChildrenList: this.activeChildrenList },            
            { children: this.getChildren() },
            { targetValues: this.targetValues },
            { actualValues: this.actualValues }
        ];
    }
    
    logTree() {
        TUtil.logTree(this);
    }
    
    isVisible() {
        if (this.targets['isVisible']) {
            return typeof this.targets['isVisible'] === 'function' ? this.targets['isVisible'].call(this) : this.targets['isVisible'];
        }
        return this.val('isVisible');
    }
    
    calcVisibility() {
        return TUtil.calcVisibility(this);
    }
    
    validateVisibilityInParent() {
        return TUtil.isDefined(this.val('validateVisibilityInParent')) ? this.val('validateVisibilityInParent') : false;
    }

    hasDomHolderChanged() {
        return !this.reuseDomDefinition() && this.getDomHolder(this) && this.getDomHolder(this).exists() && this.$dom.parent() !== this.getDomHolder(this).element;
    }
    
    hasBaseElementChanged() {
        return this.getBaseElement() !== this.$dom.getTagName();
    }

    hasDom() {
        return !!this.$dom && this.$dom.exists();
    }
    
    getRealParent() {
        return this.parent;
    }
    
    getContentHeight() {
        return this.contentHeight;
    }
    
    getContentWidth() {
        return this.contentWidth;
    }  
    
    calcContentWidthHeight() {
        this.contentHeight = this.viewport.ySouth - this.viewport.yNorth;
        this.topBaseHeight = this.viewport.yEast - this.viewport.yNorth;
        this.bottomBaseWidth = this.viewport.xSouth - this.viewport.xWest;        
        this.contentWidth = this.viewport.xEast - this.viewport.xWest;
    }
    
    getBaseWidth() {
        return this.val('baseWidth') ?? this.getWidth();
    }
    
     getMinWidth() {
        return this.val('minWidth') ?? this.getWidth();
    }
   
    getTopBaseHeight() {
        return this.val('topBaseHeight') ?? 0;
    }

    getContainerOverflowMode() {
        return this.val('containerOverflowMode') ?? 'auto';
    }
    
    getItemOverflowMode() {
        return this.val('itemOverflowMode') ?? 'auto';
    }    

    getUIDepth() {
        let depth = 0;

        let node = this.parent;
        while (node) {
            depth++;
            node = node.parent;
        }

        return depth;
    }
    
    isTextOnly() {
        return this.val('textOnly');
    }
    
    getHtml() {
        return this.val('html');
    }

    isInFlow() {
        return TUtil.isDefined(this.val('isInFlow')) ? this.val('isInFlow') : true;
    }

    canHandleEvents(eventName) {
        const events = this.val('canHandleEvents');
        if (TUtil.isDefined(events)) {
            return events === eventName || (Array.isArray(events) && events.includes(eventName));
        } else {
            if (!TUtil.isDefined(this.val('autoHandleEvents'))) {
                this.val('autoHandleEvents', TargetUtil.getAutoHandleEvents(this));
            }
            return this.val('autoHandleEvents').includes(eventName);
        }
    }

    keepEventDefault() {
        return TUtil.isDefined(this.val('keepEventDefault')) ? this.val('keepEventDefault') : this.reuseDomDefinition() ? true : undefined;
    }
    
    canDeleteDom() {
        return TUtil.isDefined(this.val('canDeleteDom')) ? this.val('canDeleteDom') : !this.reuseDomDefinition();
    }

    excludeDefaultStyling() {
        return this.targets['defaultStyling'] === false || this.excludeStyling() || (this.reuseDomDefinition() && this.allStyleTargetList.length === 0);
    }
    
    excludeStyling() {
        return this.targets['styling'] === false;
    }
        
    getBracketThreshold() {
        return this.val('bracketThreshold');
    }
    
    getBracketSize() {
        return this.val('bracketSize');
    }
    
    shouldBeBracketed() {
        if (TUtil.isDefined(this.val('shouldBeBracketed'))) {
            return this.val('shouldBeBracketed');
        }        
        return this.getChildren().length > this.getBracketThreshold();  
    }
   
    isIncluded() {
        return this.val('isIncluded');
    }
    
    canHaveDom() {
        if (this.targets['$dom'] && !this.val('$dom')) {
            return;
        }
        return this.val('canHaveDom');
    }
    
    requiresDomRelocation() {
        return TUtil.isDefined(this.val('requiresDomRelocation')) ? this.val('requiresDomRelocation') : !TUtil.isDefined(this.transformMap.x) && !TUtil.isDefined(this.transformMap.y);
    }
    
    getBaseElement() {
        return this.val('baseElement');
    }

    getOpacity() {
        return this.val('opacity');
    }
    
    getCenterX() {
        return (this.getParentValue('width') - this.getWidth()) / 2;
    }
    
    getCenterY() {
        return (this.getParentValue('height') - this.getHeight()) / 2;
    }    

    getX() {
        return this.val('x');
    }

    getY() {
        return this.val('y');
    }
    
    getTransformX() {
        return this.absX - this.getDomParent()?.absX;
    }
    
    getTransformY() {
        return this.absY - this.getDomParent()?.absY;
    }    
   
    getZ() {
        return this.val('z');
    }    
             
    getPerspective() {
        return this.val('perspective');
    }  
    
    getRotate() {
        return this.val('rotate');
    }     
    
    getRotateX() {
        return this.val('rotateX');
    }    
    
    getRotateY() {
        return this.val('rotateY');
    }   
    
    getRotateZ() {
        return this.val('rotateZ');
    } 

    getScale() {
        return this.val('scale');
    }    
   
    getScaleX() {
        return this.val('scaleX');
    }    
    
    getScaleY() {
        return this.val('scaleY');
    }   
    
    getScaleZ() {
        return this.val('scaleZ');
    }    
    
    getSkewX() {
        return this.val('skewX');
    }   
    
    getSkewY() {
        return this.val('skewY');
    }    
    
    getSkewZ() {
        return this.val('skewZ');
    }      

    getMeasuringScale() {
        return this.val('scale');
    }

    getZIndex() {
        return this.val('zIndex');
    }    

    getTopMargin() {
        return this.val('topMargin');
    }

    getLeftMargin() {
        return this.val('leftMargin');
    }

    getRightMargin() {
        return this.val('rightMargin');
    }

    getBottomMargin() {
        return this.val('bottomMargin');
    }

    getWidth() {
        return this.val('width');
    }

    getHeight() {
        return this.val('height');
    }

    getScrollTop() {
        return this.val('scrollTop');
    }

    getScrollLeft() {
        return this.val('scrollLeft');
    }

    getCss() {
        return this.val('css');
    }

    getStyle() {
        return this.val('style');
    }
    
    getBackground() {
        return this.val('background');
    }
    
    getBackgroundColor() {
        return this.val('backgroundColor');
    }
    
    getAttributes() {
        return this.val('attributes');
    }
    
    getInputValue() {
        return this.hasDom() ? this.$dom.value() : undefined;
    }
    
    isOverflowHidden() {
        return this.val('overflow') === 'hidden';
    }
    
    reuseDomDefinition() {
        return this.val('reuseDomDefinition');
    } 
}

export { TModel };
