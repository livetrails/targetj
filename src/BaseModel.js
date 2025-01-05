import { tApp, App, getRunScheduler, getLocationManager } from "./App.js";
import { TargetExecutor } from "./TargetExecutor.js";
import { TUtil } from "./TUtil.js";
import { TModelUtil } from "./TModelUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { $Dom } from "./$Dom.js";

/**
 * It provides the target state and associated logic to the TModel.
 */
class BaseModel {
    constructor(type, targets) {
        if (typeof type === 'object' && typeof targets === 'undefined') {
            targets = type;
            type = "";
        }        
        this.type = type || 'blank';
        this.targets = Object.assign({}, targets);
                
        const uniqueId = App.getOid(this.type);
        this.oid = uniqueId.oid;
        this.oidNum = uniqueId.num;

        this.targetValues = {};
        this.actualValues = {};

        this.activeTargetList = [];
        this.activeTargetMap = {};
        
        this.updatingTargetList = [];
        this.updatingTargetMap = {};

        this.updatingChildrenList = [];
        this.updatingChildrenMap = {};
        
        this.activeChildrenList = [];
        this.activeChildrenMap = {};        
        
        this.eventTargetList = [];
        this.eventTargetMap = {};
        
        this.coreTargets = [];
        
        this.allStyleTargetList = [];
        this.allStyleTargetMap = {};
        
        this.styleTargetList = [];
        this.styleTargetMap = {};
        
        this.asyncStyleTargetList = [];
        this.asyncStyleTargetMap = {};
        
        this.activatedTargets = [];
                
        this.targetExecutionCount = 0;
        
        this.parent = null;

        this.targetMethodMap = {};
    }
    
    getParent() {
        return this.parent;
    }

    initTargets() {
        this.actualValues = TModelUtil.defaultActualValues();
        this.targetValues = {};
        this.activeTargetMap = {};
        this.activeTargetList = [];
        
        const domExists = $Dom.query(`#${this.oid}`);
        
        if (!domExists && !this.excludeDefaultStyling()) {
            Object.entries(TModelUtil.defaultTargets()).forEach(([key, value]) => {
                if (!(key in this.targets)) {
                    this.targets[key] = value;
                }
            });
        } else if (domExists && !TUtil.isDefined(this.targets['reuseDomDefinition'])) {
            this.targets['reuseDomDefinition'] = true;
        }
        
        Object.keys(this.targets).forEach(key => {
            this.processNewTarget(key);
        });
    }    
    
    processNewTarget(key) {
        const isInactiveKey = key.startsWith('_');
        
        if (isInactiveKey) {
            const newKey = key.slice(1);
            this.targets[newKey] = typeof this.targets[key] === 'object' && this.targets[key].value ? this.targets[key] : { value: this.targets[key] };
            this.targets[newKey].active = false;
            delete this.targets[key];
            key = newKey;
        }

        const target = this.targets[key];

        if (!TUtil.isDefined(target)) {
            this.delVal('key');
            return;
        }

        TargetUtil.bindTargetName(this.targets, key);

        if (TargetUtil.allEventMap[key] || TargetUtil.internalEventMap[key]) {
            if (!this.eventTargetMap[key]) {
                this.eventTargetList.push(key);
                this.eventTargetMap[key] = true;
            }
            return;
        }

        if (TargetUtil.otherTargetEventsMap[key]) {
            return;
        }

        if (TUtil.isDefined(target.initialValue)) {
            this.val(key, target.initialValue);
        }

        if (!isInactiveKey) {
            this.addToStyleTargetList(key);
        }

        if (TargetUtil.coreTargetMap[key] && !this.coreTargets.includes(key)) {
            this.coreTargets.push(key);
        }

        if (!TargetUtil.mustExecuteTargets[key] && TUtil.isStringBooleanOrNumber(target)) {
            this.val(key, target);
            return;
        }
        
        if (target.active !== false && this.canTargetBeActivated(key)) {
            this.addToActiveTargets(key);
        }
    }
    
    activate(targetName) {
        getLocationManager().addToActivatedList(this);
        this.currentStatus = 'active';
        if (targetName && this.isTargetEnabled(targetName) && this.activatedTargets.indexOf(targetName) === -1) {
            this.activatedTargets.push(targetName);
            this.removeFromActiveTargets(targetName);
        }
    }

    isActivated() {
        return this.currentStatus === 'active';
    }
    
    deactivate() {
        this.currentStatus = undefined;
        this.activatedTargets.length = 0;       
    }
   
    shouldExecuteCyclesInParallel(key) {
        return this.targets[key]?.parallel === true;
    }
    
    canTargetBeActivated(key) {
        return (Array.isArray(this.targets['onDomEvent']) && this.targets['onDomEvent'].includes(key) && !this.hasDom()) ? false : true;
    }
    
    addToStyleTargetList(key) {
        if (this.excludeStyling() || this.targets[`exclude${TUtil.capitalizeFirstLetter(key)}`]) {
            return;
        }
        
        const isAsyncStyleTarget = TargetUtil.asyncStyleTargetMap[key];
        const isAttributeTarget = TargetUtil.attributeTargetMap[key];

        if (isAsyncStyleTarget || isAttributeTarget) {
            if (!this.asyncStyleTargetMap[key]) {
                this.asyncStyleTargetList.push(key);
                this.asyncStyleTargetMap[key] = true;
            }
        } else if (this.isStyleTarget(key)) {
            let styleFlag = true;
            if (TargetUtil.transformMap[key]) {
                if (this.getParent()) {
                    this.calcAbsolutePosition(this.getX(), this.getY());
                }
                if (TModelUtil.getTransformValue(this, key) === this.transformMap[key]) {
                    styleFlag = false;
                }
            } else if (key === 'width' || key === 'height') {
                const dimension = Math.floor(key === 'width' ? this.getWidth() : this.getHeight());
                if (this.styleMap[key] === dimension) {
                    styleFlag = false;
                }
            } else if (TUtil.isDefined(this.val(key)) && this.styleMap[key] === this.val(key)) {
                styleFlag = false;
            }

            if (styleFlag && !this.styleTargetMap[key]) {
                this.styleTargetList.push(key);
                this.styleTargetMap[key] = true;                
            }
        } else if (this.useWindowFrame(key) && !this.styleTargetMap[key]) {
            this.styleTargetList.push(key);
            this.styleTargetMap[key] = true;            
        } else {
            return;
        }

        if (!this.allStyleTargetMap[key]) {
            this.allStyleTargetList.push(key);
            this.allStyleTargetMap[key] = true;
        }
    }
   
    isStyleTarget(key) {
        return TargetUtil.styleTargetMap[key];
    }
    
    useWindowFrame(key) {
        return Array.isArray(this.targets['useWindowFrame']) && this.targets['useWindowFrame'].includes(key);
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

        getRunScheduler().schedule(1, 'addTargets-' + this.oid);
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
    
    neverExecuted(key) {
        return !this.targetValues[key];
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

    isScheduledPending(key) {
        const lastScheduledTime = this.getScheduleTimeStamp(key); 
        const interval = this.getTargetInterval(key);
        return lastScheduledTime && lastScheduledTime + interval > TUtil.now();
    }
    
    shouldScheduleRun(key) {
        return this.targets[key]?.triggerRerun ?? true;
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
            this.targetValues[key].actualValueLastUpdate = TUtil.now();
        }
    }

    getTargetEasing(key) {
        return typeof this.targetValues[key].easing === 'function' ? this.targetValues[key].easing : undefined;
    }

    getTargetInterval(key) {
        const targetValue = this.targetValues[key];

        if (this.isStyleTarget(key) || this.useWindowFrame(key)) {
            return targetValue ? targetValue.interval : 0;
        }

        return TUtil.isDefined(this.targets['interval']) ? this.targets['interval'] : targetValue?.interval || 0;
    }

    getTargetEventFunctions(key) {
        return this.targetValues[key] ? this.targetValues[key].events : undefined;
    }

    setTarget(key, value, steps, interval, easing, originalTargetName) {       
        if (typeof key === 'object' && key !== null) {
            [value, steps, interval, easing, originalTargetName] = [key, value, steps, interval, easing];
            key = '';
        }        
        originalTargetName = originalTargetName || this.key;
        TargetExecutor.executeImperativeTarget(this, key, value, steps, interval, easing, originalTargetName);

        return this;
    }
    
    hasTargetUpdates(key) {
        return key ? this.updatingTargetMap[key] === true : this.updatingTargetList.length > 0;
    }

    addToActiveTargets(key) {
        if (!this.activeTargetMap[key] && this.canTargetBeActivated(key)) {
            this.activeTargetMap[key] = true;

            const priorityOrder = ['y', 'x', 'height', 'width', 'start'];
            const priorityIndex = priorityOrder.indexOf(key);

            if (priorityIndex !== -1) {
                this.activeTargetList = this.activeTargetList.filter(item => !priorityOrder.includes(item));

                priorityOrder.forEach(priorityKey => {
                    if (this.activeTargetMap[priorityKey]) {
                        this.activeTargetList.unshift(priorityKey);
                    }
                });
            } else {
                this.activeTargetList.push(key);
            }
            
            this.getParent()?.addToActiveChildren(this);
        }
    }

    removeFromActiveTargets(key) {
        if (this.activeTargetMap[key]) {
            delete this.activeTargetMap[key];
            const index = this.activeTargetList.indexOf(key);
            if (index >= 0) {
                this.activeTargetList.splice(index, 1);
            }
            if (this.activeTargetList.length === 0) {
                this.getParent()?.removeFromActiveChildren(this);
            }            
        }
    }

    addToUpdatingTargets(key) {
        if (!this.updatingTargetMap[key]) {
            this.updatingTargetMap[key] = true;
            this.updatingTargetList.push(key);
            this.getParent()?.addToUpdatingChildren(this);
        }
    }

    removeFromUpdatingTargets(key) {
        if (this.updatingTargetMap[key]) {
            delete this.updatingTargetMap[key];
            const index = this.updatingTargetList.indexOf(key);
            if (index >= 0) {
                this.updatingTargetList.splice(index, 1);
            }
            if (this.updatingTargetList.length === 0) {
                this.getParent()?.removeFromUpdatingChildren(this);
            }
        }
    }
    
    hasUpdatingTargets(originalTargetName) {
        for (const target of this.updatingTargetList) {
            if (this.isTargetImperative(target) && this.targetValues[target].originalTargetName === originalTargetName) {
                return true;
            }
        }
        
        return false;
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
    
    addToActiveChildren(child) {
        if (!this.activeChildrenMap[child.oid]) {
            this.activeChildrenMap[child.oid] = true;
            this.activeChildrenList.push(child.oid);
        }
    }
    
    removeFromActiveChildren(child) {
        if (this.activeChildrenMap[child.oid]) {
            delete this.activeChildrenMap[child.oid];
            const index = this.activeChildrenList.indexOf(child.oid);
            if (index >= 0) {
                this.activeChildrenList.splice(index, 1);
            }
        }
    }     
    
    hasActiveChildren() {
        return this.activeChildrenList.length > 0;
    }    

    deleteTargetValue(key) {
        delete this.targetValues[key];
        this.addToActiveTargets(key);
        this.removeFromUpdatingTargets(key);

        getRunScheduler().schedule(1, 'deleteTargetValue-' + this.oid + "-" + key);
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

    activateTarget(key, value) {
        if (this.canTargetBeActivated(key)) {
            if (TUtil.isDefined('value')) {
                this.val(`__${key}`, value);
            }
            
            const targetValue = this.targetValues[key];

            if (targetValue) {
                targetValue.executionFlag = false;
                targetValue.scheduleTimeStamp = undefined;
                targetValue.step = 0;
                targetValue.cycle = Array.isArray(targetValue.valueList) ? 1 : 0;

                this.updateTargetStatus(key);
            } else {
                this.addToActiveTargets(key);
            }            

            this.activate(key);            
        }

        return this;
    }
    
    manageChildTargetExecution(child, shouldCalculateChildTargets) {
        return shouldCalculateChildTargets
                || this.shouldCalculateChildTargets()
                || child.hasChildren() 
                || child.addedChildren.length > 0 
                || child.targetExecutionCount === 0;
    }
    
    shouldCalculateChildTargets() {
        return this.val('shouldCalculateChildTargets');
    }  
    
    getCoreTargets() {
        return TUtil.isDefined(this.val('coreTargets')) ? this.val('coreTargets') : this.coreTargets;
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

export { BaseModel };

