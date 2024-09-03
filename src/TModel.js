import { tApp, App } from "./App.js";
import { browser } from "./Browser.js";
import { SearchUtil } from "./SearchUtil.js";
import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { TargetExecutor } from "./TargetExecutor.js";
import { Viewport } from "./Viewport.js";
import { TModelUtil } from "./TModelUtil";

class TModel {
    constructor(type, targets) {
        if (arguments.length === 1 && typeof type === 'object') {
            targets = type;
            type = "";
        }

        type = type || 'blank';
        const uniqueId = App.getOid(type);
        this.oid = uniqueId.oid;
        this.oidNum = uniqueId.num;
        this.type = type;
        
        this.targets = Object.assign({}, targets);
        this.activeTargetList = [];
        this.activeTargetMap = {};

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
            borderRadius: 0,
            children: [],
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
            isVisible: undefined
        };

        this.addedChildren = { count: 0, list: [] };
        this.deletedChildren = [];
        this.lastChildrenUpdate = { additions: [], deletions: [] };
        this.allChildren = [];

        this.updatingTargetList = [];
        this.updatingTargetMap = {};

        this.styleTargetList = [];
        this.styleTargetMap = {};

        this.updatingChildrenList = [];
        this.updatingChildrenMap = {};

        this.targetMethodMap = {};

        this.parent = null;

        this.$dom = null;

        this.visibilityStatus = { top: false, right: false, bottom: false, left: false };
        this.visible = false;

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

        this.initTargets();
    }

    getParent() {
        return this.parent;
    }

    getRealParent() {
        return this.parent;
    }

    getDomParent() {
        return this.actualValues.domParent ? this.actualValues.domParent : null;
    }

    getDomHolder() {
        return this.actualValues.domHolder ? this.actualValues.domHolder : this.getDomParent() ? this.getDomParent().$dom : SearchUtil.findParentByTarget(this, 'domHolder') ? SearchUtil.findParentByTarget(this, 'domHolder').$dom : null;
    }

    addToStyleTargetList(key) {
        if (!TargetUtil.styleTargetMap[key]) {
            return;
        }

        key = TargetUtil.transformMap[key] ? 'transform' : TargetUtil.dimMap[key] ? 'dim' : key;

        if (!this.styleTargetMap[key]) {
            this.styleTargetList.push(key);
            this.styleTargetMap[key] = true;
        }
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

    initTargets() {
        this.targetValues = {};
        this.activeTargetMap = {};
        this.activeTargetList = [];
        Object.keys(this.targets).forEach(key => {
            this.processNewTarget(key);
        });
    }

    processNewTarget(key) {
        TargetUtil.bindTargetName(this.targets, key);

        if (TUtil.isDefined(this.targets[key].initialValue)) {
            this.actualValues[key] = this.targets[key].initialValue;
            this.addToStyleTargetList(key);
        }
        if (this.targets[key].active !== false) {
            this.addToActiveTargets(key);
        }
    }

    hasDomHolderChanged() {
        return this.getDomHolder() && this.getDomHolder().exists() && this.$dom.parent().getAttribute("id") !== this.getDomHolder().attr("id");
    }

    hasDom() {
        return !!this.$dom && this.$dom.exists();
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
                if (index >= 0) {
                    this.allChildren.splice(index, 1);
                }
            });
            
            this.lastChildrenUpdate.deletions = this.lastChildrenUpdate.deletions.concat(this.addedChildren);
            
            this.deletedChildren.length = 0;
        }
        
        return this.allChildren;
    }

    getLastChild() {
        return this.hasChildren() ? this.getChildren()[this.getChildren().length - 1] : undefined;
    }

    getFirstChild() {
        return this.hasChildren() ? this.getChildren()[0] : undefined;
    }

    getChild(index) {
        return this.hasChildren() ? this.getChildren()[index] : undefined;
    }

    getChildIndex(child) {
        return this.getChildren().indexOf(child);
    }

    getChildrenOids() {
        return this.getChildren().oids();
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

    addToParentVisibleList() {
        if (this.isVisible() && this.isInFlow() && this.getParent()) {
            this.getParent().inFlowVisibles.push(this);
        }
    }

    isVisible() {
        return TUtil.isDefined(this.actualValues.isVisible) ? this.actualValues.isVisible : this.visible;
    }

    shouldCalculateChildren() {
        return TUtil.isDefined(this.actualValues.calculateChildren) ? this.actualValues.calculateChildren : this.isVisible() && this.isIncluded() && (this.hasChildren() || this.getContentHeight() > 0);
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

    canBeBracketed() {
        return this.actualValues.canBeBracketed;
    }

    isIncluded() {
        return this.actualValues.isIncluded;
    }

    canHaveDom() {
        return this.actualValues.canHaveDom;
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

    getZIndex() {
        return this.actualValues.zIndex;
    }

    getScale() {
        return this.actualValues.scale;
    }

    getMeasuringScale() {
        return this.actualValues.scale;
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

    getRotate() {
        return this.actualValues.rotate;
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

    getScaledWidth() {
        return this.getWidth() * this.getScale();
    }

    getScaledHeight() {
        return this.getHeight() * this.getScale();
    }

    getTargetStepPercent(key, step) {
        const steps = this.getTargetSteps(key);
        step = !TUtil.isDefined(step) ? this.getTargetStep(key) : step;
        return steps ? step / steps : 1;
    }

    resetTargetStep(key) {
        if (this.targetValues[key]) {
            this.targetValues[key].step = 0;
        }

        return this;
    }

    resetTargetExecutionFlag(key) {
        if (this.targetValues[key]) {
            this.targetValues[key].executionFlag = false;
        }

        return this;
    }

    resetTargetCycle(key) {
        if (this.targetValues[key]) {
            this.targetValues[key].cycle = 0;
        }

        return this;
    }

    resetScheduleTimeStamp(key) {
        if (this.targetValues[key]) {
            this.targetValues[key].scheduleTimeStamp = undefined;
        }

        return this;
    }

    resetTargetInitialValue(key) {
        if (this.targetValues[key]) {
            this.targetValues[key].initialValue = undefined;
        }

        return this;
    }

    updateTargetStatus(key) {
        const targetValue = this.targetValues[key];

        if (!targetValue) {
            return;
        }

        const cycle = this.getTargetCycle(key);
        const cycles = this.getTargetCycles(key);
        const step = this.getTargetStep(key);
        const steps = this.getTargetSteps(key);

        if (this.isExecuted(key) && step < steps) {
            this.targetValues[key].status = 'updating';
        } else if (Array.isArray(targetValue.valueList) && cycle < targetValue.valueList.length - 1) {
            this.targetValues[key].status = 'updating';
        } else if (!this.isExecuted(key) || this.isTargetInLoop(key) || cycle < cycles) {
            this.targetValues[key].status = 'active';
        } else {
            this.targetValues[key].status = 'done';
        }

        if (this.isTargetUpdating(key)) {
            this.addToUpdatingTargets(key);
            this.removeFromActiveTargets(key);
        } else if (this.isTargetActive(key)) {
            this.addToActiveTargets(key);
            this.removeFromUpdatingTargets(key);
        } else {
            this.removeFromActiveTargets(key);
            this.removeFromUpdatingTargets(key);
            tApp.manager.doneTargets.push({ tmodel: this, key: key });
        }
        return this.targetValues[key].status;
    }

    getTargetStatus(key) {
        return this.targetValues[key] ? this.targetValues[key].status : '';
    }

    isTargetActive(key) {
        return this.targetValues[key] && this.targetValues[key].status === 'active';
    }

    isTargetUpdating(key) {
        return this.targetValues[key] && this.targetValues[key].status === 'updating';
    }

    isTargetDone(key) {
        return this.targetValues[key] && this.targetValues[key].status === 'done';
    }

    isTargetComplete(key) {
        return this.targetValues[key] && this.targetValues[key].status === 'complete';
    }

    isExecuted(key) {
        return this.targetValues[key] && this.targetValues[key].executionFlag;
    }

    isTargetImperative(key) {
        return this.targetValues[key] ? this.targetValues[key].isImperative : false;
    }

    getTargetExecutionCount(key) {
        return this.targetValues[key] ? this.targetValues[key].executionCount : 0;
    }

    setTargetComplete(key) {
        if (this.targetValues[key]) {
            this.targetValues[key].status = 'complete';
        }
    }

    isTargetEnabled(key) {
        if (this.isTargetImperative(key)) {
            return true;
        }

        const target = this.targets[key];

        if (!TUtil.isDefined(target)) {
            return false;
        }

        return typeof target.enabledOn === 'function' ? target.enabledOn.call(this) : true;
    }

    isTargetInLoop(key) {
        return this.targets[key] ? (typeof this.targets[key].loop === 'function' ? this.targets[key].loop.call(this, key) : this.targets[key].loop) : false;
    }

    doesTargetEqualActual(key) {
        if (this.targetValues[key]) {
            const deepEquality = this.targets[key] ? this.targets[key].deepEquality : false;
            return deepEquality ? TUtil.areEqual(this.getTargetValue(key), this.val(key), deepEquality) : this.getTargetValue(key) === this.val(key);
        }

        return false;
    }

    getTargetValue(key) {
        return this.targetValues[key] ? (typeof this.targetValues[key].value === 'function' ? this.targetValues[key].value.call(this) : this.targetValues[key].value) : undefined;
    }

    getTargetSteps(key) {
        return this.targetValues[key] ? this.targetValues[key].steps || 0 : 0;
    }

    getTargetStep(key) {
        return this.targetValues[key] ? this.targetValues[key].step : 0;
    }

    getScheduleTimeStamp(key) {
        return this.targetValues[key] ? this.targetValues[key].scheduleTimeStamp : undefined;
    }

    getTargetInitialValue(key) {
        return this.targetValues[key] ? this.targetValues[key].initialValue : undefined;
    }

    getActualValueLastUpdate(key) {
        return this.targetValues[key] ? this.targetValues[key].actualValueLastUpdate : undefined;
    }

    getTargetCreationTime(key) {
        return this.targetValues[key] ? this.targetValues[key].creationTime : undefined;
    }

    incrementTargetStep(key) {
        if (this.targetValues[key]) {
            this.targetValues[key].step++;
        }
        return this.targetValues[key].step;
    }

    getTargetCycles(key) {
        return this.targetValues[key] ? this.targetValues[key].cycles || 0 : 0;
    }

    getTargetCycle(key) {
        return this.targetValues[key] ? this.targetValues[key].cycle : 0;
    }

    incrementTargetCycle(key) {
        if (this.targetValues[key]) {
            this.targetValues[key].cycle++;
        }
        return this.targetValues[key].cycle;        
    }

    setTargetInterval(key, value) {
        if (this.targetValues[key]) {
            this.targetValues[key].interval = value;
        }
        return this.targetValues[key].interval;
    }

    setScheduleTimeStamp(key, value) {
        if (this.targetValues[key]) {
            this.targetValues[key].scheduleTimeStamp = value;
        }
    }

    setTargetInitialValue(key, value) {
        if (this.targetValues[key]) {
            this.targetValues[key].initialValue = value;
        }
    }

    setActualValueLastUpdate(key) {
        if (this.targetValues[key]) {
            this.targetValues[key].actualValueLastUpdate = browser.now();
        }
    }

    getTargetEasing(key) {
        return typeof this.targetValues[key].easing === 'function' ? this.targetValues[key].easing : undefined;
    }

    getTargetInterval(key) {
        return this.targetValues[key] ? this.targetValues[key].interval : undefined;
    }

    getTargetEventFunctions(key) {
        return this.targetValues[key] ? this.targetValues[key].events : undefined;
    }

    setTarget(key, value, steps, interval, easing, originalTargetName) {
        originalTargetName = originalTargetName || this.key;
        TargetExecutor.executeImperativeTarget(this, key, value, steps, interval, easing, originalTargetName);

        return this;
    }

    val(key, value) {
        if (arguments.length === 2) {
            this.actualValues[key] = value;
            return this;
        }
        return this.actualValues[key];
    }

    addValue(key, value) {
        this.actualValues[key] += value;
        return this;
    }

    addChild(child, index) {
        index = TUtil.isDefined(index) ? index : this.addedChildren.count + this.allChildren.length;
        this.addedChildren.count++;
        TModelUtil.addItem(this.addedChildren.list, child, index);

        tApp.manager.scheduleRun(10, 'addChild-' + this.oid + "-" + child.oid);

        return this;
    }
    
    removeChild(child) {
        this.deletedChildren.push(child);
        this.removeFromUpdatingChildren(child);

        tApp.manager.scheduleRun(10, 'removeChild-' + this.oid + "-" + child.oid);

        return this;
    }
    
    removeAllChildren() {
        this.allChildren.length = 0;
        this.updatingChildrenList.length = 0;
        this.updatingChildrenMap = {};
    }
   
    addToUpdatingChildren(child) {
        if (!this.updatingChildrenMap[child.oid]) {
            this.updatingChildrenMap[child.oid] = true;
            this.updatingChildrenList.push(child.oid);
        }
    }

    removeFromUpdatingChildren(child) {
        if (this.updatingChildrenMap[child.oid]) {
            delete this.updatingChildrenMap[child.oid];
            const index = this.updatingChildrenList.indexOf(child.oid);
            if (index >= 0) {
                this.updatingChildrenList.splice(index, 1);
            }
        }
    }

    hasUpdatingChildren() {
        return this.updatingChildrenList.length > 0;
    }

    hasTargetUpdates(key) {
        return key ? this.updatingTargetMap[key] === true : this.updatingTargetList.length > 0;
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

        tApp.manager.scheduleRun(10, 'addTargets-' + this.oid);
    }

    addToActiveTargets(key) {
        if (!this.activeTargetMap[key]) {
            this.activeTargetMap[key] = true;

            if (key === 'start') {
                this.activeTargetList.unshift('start');
            } else if (key === 'width' || key === 'height') {
                const startIndex = this.activeTargetList.indexOf('start');
                if (startIndex !== -1) {
                    this.activeTargetList.splice(1, 0, key);
                } else {
                    this.activeTargetList.unshift(key);
                }
            } else {
                this.activeTargetList.push(key);
            }
        }
    }

    removeFromActiveTargets(key) {
        if (this.activeTargetMap[key]) {
            delete this.activeTargetMap[key];
            const index = this.activeTargetList.indexOf(key);
            if (index >= 0) {
                this.activeTargetList.splice(index, 1);
            }
        }
    }

    addToUpdatingTargets(key) {
        if (!this.updatingTargetMap[key]) {
            this.updatingTargetMap[key] = true;
            this.updatingTargetList.push(key);
            if (this.getParent()) {
                this.getParent().addToUpdatingChildren(this);
            }
        }
    }

    removeFromUpdatingTargets(key) {
        if (this.updatingTargetMap[key]) {
            delete this.updatingTargetMap[key];
            const index = this.updatingTargetList.indexOf(key);
            if (index >= 0) {
                this.updatingTargetList.splice(index, 1);
            }
            if (this.updatingTargetList.length === 0 && this.getParent()) {
                this.getParent().removeFromUpdatingChildren(this);
            }
        }
    }

    deleteTargetValue(key) {
        delete this.targetValues[key];
        this.addToActiveTargets(key);
        this.removeFromUpdatingTargets(key);

        tApp.manager.scheduleRun(10, 'deleteTargetValue-' + this.oid + "-" + key);
    }

    resetImperative(key) {
        const targetValue = this.targetValues[key];

        if (targetValue) {
            targetValue.isImperative = false;
            targetValue.executionFlag = false;
            targetValue.scheduleTimeStamp = undefined;
            targetValue.step = 0;
            targetValue.cycle = 0;
            targetValue.steps = 0;
            targetValue.cycles = 0;
            targetValue.interval = 0;
        }

        return this;
    }

    activateTarget(key) {
        return this.activateTargets([key]);
    }

    activateTargets(keys) {
        keys.forEach(key => {
            const targetValue = this.targetValues[key];

            if (targetValue) {
                targetValue.executionFlag = false;
                targetValue.scheduleTimeStamp = undefined;
                targetValue.step = 0;
                targetValue.cycle = 0;

                this.updateTargetStatus(key);
            } else {
                this.addToActiveTargets(key);
            }
        });

        tApp.manager.scheduleRun(10, 'activateTargets-' + this.oid);

        return this;
    }

    setTargetMethodName(targetName, methodName) {
        if (!this.targetMethodMap[targetName]) {
            this.targetMethodMap[targetName] = [];
        }
        if (!this.targetMethodMap[targetName].includes(methodName)) {
            this.targetMethodMap[targetName].push(methodName);
        }
    }
}

export { TModel };
