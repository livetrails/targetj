import { getRunScheduler } from "./App.js";
import { BaseModel } from "./BaseModel.js";
import { TUtil } from "./TUtil.js";
import { SearchUtil } from "./SearchUtil.js";
 import { TargetUtil } from "./TargetUtil.js";
 import { TModelUtil } from "./TModelUtil.js";

/**
 * It provides the base class for all objects in an app where targets are defined. 
 * These objects typically have a DOM but can also operate without one.
 */
class TModel extends BaseModel {
    constructor(type, targets) {
        super(type, targets);

        this.$dom = null;

        this.domHeight = undefined;
        this.domWidth = undefined;

        this.innerContentWidth = 0;
        this.innerContentHeight = 0;
        this.contentWidth = 0;
        this.contentHeight = 0;
        
        this.styleTargetList = [];
        this.styleTargetMap = {};        

        this.styleMap = {};
        this.transformMap = {};

        this.actualValues = TModelUtil.initializeActualValues();
        this.initTargets();        
    }
   
    initTargets() {
        this.targetValues = {};
        this.activeTargetMap = {};
        this.activeTargetList = [];
        Object.keys(this.targets).forEach(key => {
            this.processNewTarget(key);
        });
    }
    
    processNewTarget(key) {
        if (!TUtil.isDefined(this.targets[key])) {
            delete this.actualValues[key];
            return;
        }
        
        TargetUtil.bindTargetName(this.targets, key);

        if (TUtil.isDefined(this.targets[key].initialValue)) {
            this.actualValues[key] = this.targets[key].initialValue;
            this.addToStyleTargetList(key);
        } 
        if (this.targets[key].active !== false) {
            this.addToActiveTargets(key);
        }
    }    
    
    addToStyleTargetList(key) {
        if (!TargetUtil.styleTargetMap[key]) {
            return;
        }

        if (!this.styleTargetMap[key]) {
            this.styleTargetList.push(key);
            this.styleTargetMap[key] = true;
        }
    }    
    
    removeTarget(key) {
        delete this.targets[key];
        this.removeFromActiveTargets(key);
        this.removeFromUpdatingTargets(key);
        delete this.targetValues[key];
    }

    addTarget(key, target) {
        this.addTargets({ [key]: target });
    }

    addTargets(targets) {
        Object.keys(targets).forEach(key => {
            this.targets[key] = targets[key];
            this.removeFromUpdatingTargets(key);
            this.processNewTarget(key);
        });

        getRunScheduler().schedule(10, 'addTargets-' + this.oid);
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
    
}

export { TModel };
