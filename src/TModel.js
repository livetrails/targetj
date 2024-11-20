import { BaseModel } from "./BaseModel.js";
import { getRunScheduler } from "./App.js";
import { Viewport } from "./Viewport.js";
import { TUtil } from "./TUtil.js";
import { SearchUtil } from "./SearchUtil.js";
import { TModelUtil } from "./TModelUtil.js";
import { TargetUtil } from "./TargetUtil.js";

/**
 * It provides the base class for all objects in an app where targets are defined. 
 * These objects typically have a DOM but can also operate without one.
 */
class TModel extends BaseModel {
    constructor(type, targets) {
        super(type, targets);

        this.addedChildren = { count: 0, list: [] };
        this.deletedChildren = [];
        this.lastChildrenUpdate = { additions: [], deletions: [] };
        this.allChildren = [];

        this.$dom = null;

        this.x = 0;
        this.y = 0;
        this.absX = 0;
        this.absY = 0;

        this.domHeight = undefined;
        this.domWidth = undefined;

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
    
    addChild(child, index = this.addedChildren.count + this.allChildren.length) {
        this.addedChildren.count++;
        TModelUtil.addItem(this.addedChildren.list, child, index);
        
        getRunScheduler().schedule(1, 'addChild-' + this.oid + "-" + child.oid);

        return this;
    }
    
    removeChild(child) {
        child.val('canDeleteDom', true);
        this.deletedChildren.push(child);   
        this.removeFromUpdatingChildren(child);

        getRunScheduler().schedule(1, 'removeChild-' + this.oid + "-" + child.oid);

        return this;
    }
    
    moveChild(child, newIndex) {
        
        const currentIndex = this.allChildren.indexOf(child);

        if (currentIndex === newIndex) {
            return this;
        }

        this.deletedChildren.push(child);

        this.addedChildren.count++;
        const segment = [{ index: newIndex, segment: [child] }];
        this.addedChildren.list.push(...segment);

        this.addedChildren.list.sort((a, b) => a.index - b.index);
        
        getRunScheduler().schedule(1, 'removeChild-' + this.oid + "-" + child.oid);
        
        return this;
    }
    
    
    getChildren() {
        if (this.deletedChildren.length > 0) {
            this.deletedChildren.forEach(child => {
                const index = this.allChildren.indexOf(child);
                this.lastChildrenUpdate.deletions.push(child);
                if (index >= 0) {
                    this.allChildren.splice(index, 1);
                }
            });
                                    
            this.deletedChildren.length = 0;
        }        
        
        if (this.addedChildren.count > 0) {
            this.addedChildren.list.forEach(({ index, segment }) => {
                                                
                segment.forEach(t => {
                    t.parent = this;
                    if (!TUtil.isDefined(t.val('canDeleteDom')) && this.val('canDeleteDom') === false) {
                        t.val('canDeleteDom', false);
                    }
                });
                
                if (index >= this.allChildren.length) {
                    this.allChildren.push(...segment);
                } else {
                    this.allChildren.splice(index, 0, ...segment);
                }
            });
            
            this.lastChildrenUpdate.additions = this.lastChildrenUpdate.additions.concat(this.addedChildren.list);
            
            this.addedChildren.list.length = 0;
            this.addedChildren.count = 0;
        }
        
        return this.allChildren;
    }
   
    removeAll() {
        this.allChildren = [];
        this.updatingChildrenList.length = 0;
        this.updatingChildrenMap = {};
        if (this.hasDom()) {
            this.$dom.deleteAllChildren();
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
                (this.hasChildren() || this.addedChildren.count > 0 || this.getContentHeight() > 0);

        this.currentStatus = undefined;
        return result;
    }
         
    getFirstChild() {
        return this.hasChildren() ? this.getChildren()[0] : undefined;
    }
    
    hasChildren() {
        return this.getChildren().length > 0;
    }
    
    findChildren(type) {
        return this.getChildren().filter(child => child.type === type);
    }

    getLastChild() {
        return this.hasChildren() ? this.getChildren()[this.getChildren().length - 1] : undefined;
    }
    
    getChild(index) {
        return this.hasChildren() ? this.getChildren()[index] : undefined;
    }

    getChildIndex(child) {
        return this.getChildren().indexOf(child);
    }

    getChildrenOids() {
        return this.getChildren().map(o => o.oid).join(" ");
    }

    findChild(type) {
        return this.getChildren().find(child => child.type === type);
    }

    findLastChild(type) {
        return this.getChildren().findLast(child => child.type === type);
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
        if (key.startsWith('_')) {
            actual = this;
            key = key.slice(1);
        }
        if (value !== undefined) {
            if (value !== actual[key]) {
                actual[key] = value;
            }
            return this;
        }
        
        return actual[key];
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
        return this.val('isVisible')
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
        return this.isInFlow;
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
        return this.targets['styling'] === false
    }
        
    getBracketThreshold() {
        return this.val('bracketThreshold');
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
        return this.val('canHaveDom');
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
        return Math.floor(this.val('scrollTop'));
    }

    getScrollLeft() {
        return Math.floor(this.val('scrollLeft'));
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
