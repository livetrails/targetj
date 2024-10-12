import { tApp, App, getRunScheduler } from "./App.js";
import { TargetExecutor } from "./TargetExecutor.js";
import { TUtil } from "./TUtil.js";
import { TModelUtil } from "./TModelUtil.js";
 import { TargetUtil } from "./TargetUtil.js";

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
        
        this.eventTargets = [];
        
        this.styleTargetList = [];
        this.styleTargetMap = {};        
        
        this.parent = null;

        this.targetMethodMap = {};
    }
    
    getParent() {
        return this.parent;
    }

    getRealParent() {
        return this.parent;
    }
    
    initTargets() {
        this.actualValues = TModelUtil.initializeActualValues();
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
        
        if (TargetUtil.targetConditionMap[key]) {
            if (this.eventTargets.indexOf((key) === -1)) {
                this.eventTargets.push(key)
            }
            return;
        }        
        
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
    
    hasTargetUpdates(key) {
        return key ? this.updatingTargetMap[key] === true : this.updatingTargetList.length > 0;
    }

    addToActiveTargets(key) {
        if (!this.activeTargetMap[key]) {
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

    deleteTargetValue(key) {
        delete this.targetValues[key];
        this.addToActiveTargets(key);
        this.removeFromUpdatingTargets(key);

        getRunScheduler().schedule(10, 'deleteTargetValue-' + this.oid + "-" + key);
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

        getRunScheduler().schedule(10, 'activateTargets-' + this.oid);

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

export { BaseModel };

