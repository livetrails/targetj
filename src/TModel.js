import { BaseModel } from "./BaseModel.js";
import { getRunScheduler } from "./App.js";
import { Viewport } from "./Viewport.js";
    import { TUtil } from "./TUtil.js";
import { SearchUtil } from "./SearchUtil.js";
 import { TModelUtil } from "./TModelUtil.js";

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

        this.innerContentWidth = 0;
        this.innerContentHeight = 0;
        this.contentWidth = 0;
        this.contentHeight = 0;

        this.styleMap = {};
        this.transformMap = {};
        
        this.visibilityStatus = { top: false, right: false, bottom: false, left: false };
        this.visible = false;
        
        this.visibleChildren = [];         

        this.initTargets();        
    }

    createViewport() {
        this.viewport = this.viewport ? this.viewport.reset() : new Viewport(this);
        return this.viewport;
    }

    setLocation(viewport) {
        this.x = viewport.getXNext();
        this.y = viewport.getYNext();
    }

    calculateAbsolutePosition(x, y) {
        const rect = this.getBoundingRect();
        this.absX = rect.left + x;
        this.absY = rect.top + y;
    }

    getBoundingRect() {
        return TUtil.getBoundingRect(this);
    }     
    
    addChild(child) {
        const index = this.addedChildren.count + this.allChildren.length;
        this.addedChildren.count++;
        TModelUtil.addItem(this.addedChildren.list, child, index);

        getRunScheduler().schedule(10, 'addChild-' + this.oid + "-" + child.oid);

        return this;
    }
    
    removeChild(child) {
        this.deletedChildren.push(child);
        this.removeFromUpdatingChildren(child);

        getRunScheduler().schedule(10, 'removeChild-' + this.oid + "-" + child.oid);

        return this;
    }
    
    removeAllChildren() {
        this.allChildren.length = 0;
        this.updatingChildrenList.length = 0;
        this.updatingChildrenMap = {};
        
        getRunScheduler().schedule(10, 'removeAllChildren-' + this.oid);

        return this;        
    }    
    
    //we need to use the parent so in case there is a bracket, the child will be added to the real parent
    addToParentVisibleChildren() {
        if (this.isVisible() && this.isInFlow() && this.getParent()) {
            this.getParent().visibleChildren.push(this);
        }
    }
    
    shouldCalculateChildren() {
        if (TUtil.isDefined(this.actualValues.calculateChildren)) {
            return this.actualValues.calculateChildren;
        }

        return this.isVisible() && this.isIncluded() && (this.hasChildren() || this.addedChildren.count > 0 || this.getContentHeight() > 0);
    }
         
    getFirstChild() {
        return this.hasChildren() ? this.getChildren()[0] : undefined;
    }
    
    hasChildren() {
        return this.getChildren().length > 0;
    }
    
    getChildren() {
        if (this.addedChildren.count > 0) {
            this.addedChildren.list.forEach(({ index, segment }) => {
                
                segment.forEach(t => t.parent = this);
                
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
        
        if (this.deletedChildren.length > 0) {
            this.deletedChildren.forEach(child => {
                const index = this.allChildren.indexOf(child);
                this.lastChildrenUpdate.deletions.push(index);
                if (index >= 0) {
                    this.allChildren.splice(index, 1);
                }
            });
                        
            this.deletedChildren.length = 0;
        }
        
        return this.allChildren;
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
        return this.getChildren().find(child => {
            return typeof type === 'function' ? type.call(child) : child.type === type;
        });
    }

    findLastChild(type) {
        return this.getChildren().findLast(child => {
            return typeof type === 'function' ? type.call(child) : child.type === type;
        });
    }

    getParentValue(targetName) {
        const parent = SearchUtil.findParentByTarget(this, targetName);
        return parent ? parent.val(targetName) : undefined;
    }
    
    val(key, value) {
        if (arguments.length === 2) {
            this.actualValues[key] = value;
            return this;
        }
        return this.actualValues[key];
    }
    
    floorVal(key) {
        return Math.floor(this.val(key));
    }
    
    addValue(key, value) {
        this.actualValues[key] += value;
        return this;
    }

    getDomParent() {
        return this.actualValues.domParent ? this.actualValues.domParent : null;
    }

    getDomHolder() {
        return this.actualValues.domHolder ? this.actualValues.domHolder : this.getDomParent() ? this.getDomParent().$dom : SearchUtil.findParentByTarget(this, 'domHolder') ? SearchUtil.findParentByTarget(this, 'domHolder').$dom : null;
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
            { styleTargetList: this.styleTargetList },
            { children: this.getChildren() },
            { targetValues: this.targetValues },
            { actualValues: this.actualValues }
        ];
    }
    
    logTree() {
        TUtil.logTree(this);
    }

    isVisible() {
        return TUtil.isDefined(this.actualValues.isVisible) ? this.actualValues.isVisible : this.visible;
    }

    hasDomHolderChanged() {
        return this.getDomHolder() && this.getDomHolder().exists() && this.$dom.parent().getAttribute("id") !== this.getDomHolder().attr("id");
    }

    hasDom() {
        return !!this.$dom && this.$dom.exists();
    }

    getContentHeight() {
        return this.contentHeight;
    }

    getInnerContentHeight() {
        return 0;
    }

    getInnerHeight() {
        return TUtil.isDefined(this.actualValues.innerHeight) ? this.actualValues.innerHeight : this.getHeight();
    }

    getInnerWidth() {
        return TUtil.isDefined(this.actualValues.innerWidth) ? this.actualValues.innerWidth : this.getWidth();
    }

    getInnerXEast() {
        return this.absX + this.getInnerWidth();
    }

    getOuterXEast() {
        return this.absX + this.getInnerWidth();
    }

    getContentWidth() {
        return this.contentWidth;
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
        return this.actualValues.textOnly;
    }

    getHtml() {
        return this.actualValues.html;
    }

    isInFlow() {
        return this.actualValues.isInFlow;
    }

    canHandleEvents(eventName) {
        const events = this.actualValues.canHandleEvents;
        return events === eventName || (Array.isArray(events) && events.includes(eventName));
    }

    keepEventDefault() {
        return this.actualValues.keepEventDefault;
    }
    
    getBracketThreshold() {
        return this.actualValues.bracketThreshold;
    }
    
    shouldBeBracketed() {
        if (TUtil.isDefined(this.actualValues.shouldBeBracketed)) {
            return this.actualValues.shouldBeBracketed;
        }        
        return this.getChildren().length > this.getBracketThreshold();  
    }
   
    isIncluded() {
        return this.actualValues.isIncluded;
    }

    canHaveDom() {
        return this.actualValues.canHaveDom;
    }
    
    getBaseElement() {
        return this.actualValues.baseElement;
    }

    isDomDeletable() {
        return this.actualValues.isDomDeletable;
    }

    getOpacity() {
        return this.actualValues.opacity;
    }
    
    getCenterX() {
        return (this.getParentValue('width') - this.getWidth()) / 2;
    }
    
    getCenterY() {
        return (this.getParentValue('height') - this.getHeight()) / 2;
    }    

    getX() {
        return this.actualValues.x;
    }

    getY() {
        return this.actualValues.y;
    }
    
    getZ() {
        return this.actualValues.z;
    }    
             
    getPerspective() {
        return this.actualValues.perspective;
    }  
    
    getRotate() {
        return this.actualValues.rotate;
    }     
    
    getRotateX() {
        return this.actualValues.rotateX;
    }    
    
    getRotateY() {
        return this.actualValues.rotateY;
    }   
    
    getRotateZ() {
        return this.actualValues.rotateZ;
    } 

    getScale() {
        return this.actualValues.scale;
    }    
   
    getScaleX() {
        return this.actualValues.scaleX;
    }    
    
    getScaleY() {
        return this.actualValues.scaleY;
    }   
    
    getScaleZ() {
        return this.actualValues.scaleZ;
    }    
    
    getSkewX() {
        return this.actualValues.skewX;
    }   
    
    getSkewY() {
        return this.actualValues.skewY;
    }    
    
    getSkewZ() {
        return this.actualValues.skewZ;
    }      

    getMeasuringScale() {
        return this.actualValues.scale;
    }

    getZIndex() {
        return this.actualValues.zIndex;
    }    

    getTopMargin() {
        return this.actualValues.topMargin;
    }

    getLeftMargin() {
        return this.actualValues.leftMargin;
    }

    getRightMargin() {
        return this.actualValues.rightMargin;
    }

    getBottomMargin() {
        return this.actualValues.bottomMargin;
    }

    getWidth() {
        return this.actualValues.width;
    }

    getHeight() {
        return this.actualValues.height;
    }

    getScrollTop() {
        return Math.floor(this.actualValues.scrollTop);
    }

    getScrollLeft() {
        return Math.floor(this.actualValues.scrollLeft);
    }

    getCss() {
        return this.actualValues.css.includes('tgt') ? this.actualValues.css : !this.actualValues.css ? 'tgt' : 'tgt ' + this.actualValues.css;
    }

    getStyle() {
        return this.actualValues.style;
    }
    
    getAttributes() {
        return this.actualValues.attributes;
    }
    
    getInputValue() {
        return this.hasDom() ? this.$dom.value() : undefined;
    }
}

export { TModel };
