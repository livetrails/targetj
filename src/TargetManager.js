import { TargetExecutor } from "./TargetExecutor.js";
import { getRunScheduler, getVisibles } from "./App.js";
import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { SearchUtil } from "./SearchUtil.js";

/**
 * It is responsible for managing target execution and cycles, as well as updating actual values toward target values.
 */
class TargetManager {
    applyTargetValues(tmodel, activeList = tmodel.activeTargetList.slice(0)) {
        tmodel.targetMethodMap = {};

        for (const key of activeList) {
            if (!tmodel.isTargetImperative(key)) {
                this.applyTargetValue(tmodel, key);
            }
        }
    }

    applyTargetValue(tmodel, key) {
        const target = tmodel.targets[key];

        if (!TUtil.isDefined(target)) {
            tmodel.removeFromActiveTargets(key);
            return;
        }

        if (typeof target.enabledOn === 'function') {
            tmodel.setTargetMethodName(key, 'enabledOn');
        }

        if (!tmodel.isTargetEnabled(key)) {
            return;
        }

        if (tmodel.isExecuted(key) && tmodel.hasUpdatingTargets(key)) {
            return;
        }

        if (tmodel.isExecuted(key) && tmodel.getTargetStep(key) === tmodel.getTargetSteps(key)) {
            if (tmodel.isScheduledPending(key)) {
                return;
            }
            const schedulePeriod = TargetUtil.scheduleExecution(tmodel, key);
            if (schedulePeriod > 0) {
                getRunScheduler().schedule(schedulePeriod, `targetSchedule__${tmodel.oid}__${key}_${schedulePeriod}`);
                return;
            }
        }

        tmodel.resetScheduleTimeStamp(key);

        if (tmodel.shouldExecuteCyclesInParallel(key)) {
            let cycles = 0;
            if (tmodel.isExecuted(key)) {
                cycles = tmodel.getTargetCycles(key);
            } else {
                cycles = typeof target.cycles === 'function' ? target.cycles.call(tmodel, 0) : target.cycles || 0;
            }

            const promises = [];
            for (let cycle = 0; cycle <= cycles; cycle++) {
                promises.push(
                    new Promise(resolve => {
                        TargetExecutor.executeDeclarativeTarget(tmodel, key);
                        resolve();
                    })
                );
            }
            
            Promise.all(promises).then(() => {
                tmodel.targetValues[key].cycle = cycles;
                tmodel.updateTargetStatus(key);
                if (tmodel.shouldScheduleRun(key)) {
                    getRunScheduler().schedule(tmodel.getTargetInterval(key), `targetSchedule__${tmodel.oid}__${key}_rerun`);
                }            
            });
        } else {            
            if (tmodel.isExecuted(key) && tmodel.getTargetCycles(key) > 0) {
                if (tmodel.getTargetCycle(key) < tmodel.getTargetCycles(key)) {
                    tmodel.incrementTargetCycle(key, tmodel.getTargetCycle(key));
                } else {
                    tmodel.resetTargetCycle(key);
                }
                tmodel.resetTargetStep(key);
                tmodel.resetTargetInitialValue(key);       
            }

            TargetExecutor.executeDeclarativeTarget(tmodel, key);       
        }
    }

    setActualValues(tmodel, updatingList = tmodel.updatingTargetList.slice(0)) {
        let schedulePeriod = 0;
        
        for (const key of updatingList) {
            if (tmodel.isScheduledPending(key)) {
                continue;
            }
            
            if (!tmodel.hasDom() && tmodel.allStyleTargetMap[key]) {
                continue;
            }
            
            schedulePeriod = TargetUtil.scheduleExecution(tmodel, key);

            if (schedulePeriod > 0) {
                getRunScheduler().schedule(schedulePeriod, `setActualValues-${tmodel.oid}__${key}_${schedulePeriod}`);  
            } else {
                tmodel.resetScheduleTimeStamp(key);
                this.setActualValue(tmodel, key);                
            }
        }
    }
    
    findOriginalTModel(tmodel, originalTargetName) {
        return SearchUtil.findParentByTarget(tmodel, originalTargetName) 
            || getVisibles().find(tmodel => tmodel.targets[originalTargetName]);
    }

    setActualValue(tmodel, key) {
        const targetValue = tmodel.targetValues[key];
        
        if (!targetValue) {
            return;
        }

        if (!tmodel.isTargetImperative(key) && !tmodel.isTargetEnabled(key)) {
            getRunScheduler().schedule(10, `setActualValue-disabled-${tmodel.oid}__${key}`);
            return;
        }

        let theValue = tmodel.getTargetValue(key);
        let step = tmodel.getTargetStep(key);
        const steps = tmodel.getTargetSteps(key);
        let cycle = tmodel.getTargetCycle(key);
        const interval = tmodel.getTargetInterval(key);
        const oldValue = tmodel.val(key);
        const oldStep = step;
        const oldCycle = cycle;
        let initialValue = tmodel.getTargetInitialValue(key);
        let originalTargetName, originalTarget, originalTModel;
        const capKey = TUtil.capitalizeFirstLetter(key);
        
        if (step <= steps) {
            if (!TUtil.isDefined(initialValue)) {
                initialValue = TUtil.isDefined(tmodel.val(key)) ? tmodel.val(key) : typeof theValue === 'number' ? 0 : undefined;
                tmodel.setTargetInitialValue(key, initialValue);
            }

            tmodel.val(key, TargetUtil.morph(tmodel, key, initialValue, theValue, step, steps));
             tmodel.addToStyleTargetList(key);

            tmodel.setActualValueLastUpdate(key);

            if (tmodel.isTargetImperative(key)) {
                originalTargetName = targetValue.originalTargetName;
                originalTarget = tmodel.targets[targetValue.originalTargetName];
                originalTModel = tmodel;
                if (!originalTarget) {
                    originalTModel = this.findOriginalTModel(tmodel, originalTargetName);
                    originalTarget = originalTModel ? originalTModel.targets[targetValue.originalTargetName] : null;
                }
                
                if (originalTarget && typeof originalTarget[`on${capKey}Step`] === 'function') {
                    originalTarget[`on${capKey}Step`].call(originalTModel, originalTModel.val(key), theValue, step, steps);
                    originalTModel.setTargetMethodName(originalTargetName, [`on${capKey}Step`]);
                } else if (originalTarget && typeof originalTarget.onImperativeStep === 'function') {
                    originalTarget.onImperativeStep.call(originalTModel, key, originalTModel.val(key), theValue, step, steps);
                    originalTModel.setTargetMethodName(originalTargetName, 'onImperativeStep');
                }
                
            } else {
                TargetUtil.handleValueChange(tmodel, key, tmodel.val(key), oldValue, oldStep, oldCycle);
            }

            tmodel.incrementTargetStep(key);

            tmodel.updateTargetStatus(key);
                     
            if (tmodel.getTargetStep(key) < steps) {
                getRunScheduler().schedule(interval, `${tmodel.oid}---${key}-${step}/${steps}-${cycle}-${interval}`);
                return;
            }
        }

        tmodel.val(key, theValue);
        tmodel.addToStyleTargetList(key);
        
        tmodel.setActualValueLastUpdate(key);
        step = tmodel.getTargetStep(key);

        let scheduleTime = 0;

        if (targetValue.valueList && cycle < targetValue.valueList.length - 1) {
            tmodel.incrementTargetCycle(key, tmodel.getTargetCycle(key));
            cycle = tmodel.getTargetCycle(key);
            tmodel.resetTargetStep(key);
            targetValue.initialValue = targetValue.value;
            targetValue.value = targetValue.valueList[cycle];
            targetValue.steps = targetValue.stepList[(cycle - 1) % targetValue.stepList.length];
            targetValue.interval = targetValue.intervalList[(cycle - 1) % targetValue.intervalList.length];
            targetValue.easing = targetValue.easingList[(cycle - 1) % targetValue.easingList.length];
            scheduleTime = interval;
        } else {
            if (tmodel.isTargetImperative(key)) {
                originalTargetName = targetValue.originalTargetName;
                originalTarget = tmodel.targets[targetValue.originalTargetName];
                originalTModel = tmodel;
                if (!originalTarget) {
                    originalTModel = this.findOriginalTModel(tmodel, originalTargetName);
                    originalTarget = originalTModel ? originalTModel.targets[targetValue.originalTargetName] : null;
                }
                
                if (originalTarget && typeof originalTarget[`on${capKey}Step`] === 'function') {
                    originalTarget[`on${capKey}Step`].call(originalTModel, originalTModel.val(key), theValue, step, steps);
                    originalTModel.setTargetMethodName(originalTargetName, [`on${capKey}Step`]);
                } else if (originalTarget && typeof originalTarget.onImperativeStep === 'function') {
                    originalTarget.onImperativeStep.call(originalTModel, key, originalTModel.val(key), theValue, step, steps);
                    originalTModel.setTargetMethodName(originalTargetName, 'onImperativeStep');
                }
                
                if (originalTarget && typeof originalTarget[`on${capKey}End`] === 'function') {
                    originalTarget[`on${capKey}End`].call(originalTModel, originalTModel.val(key), theValue, step, steps);
                    originalTModel.setTargetMethodName(originalTargetName, [`on${capKey}End`]);
                } else if (originalTarget && typeof originalTarget.onImperativeEnd === 'function') {
                    originalTarget.onImperativeEnd.call(originalTModel, key, originalTModel.val(key));
                    originalTModel.setTargetMethodName(originalTargetName, 'onImperativeEnd');
                }
            } else {
                if (!targetValue.valueList && tmodel.getTargetCycle(key) < tmodel.getTargetCycles(key)) {
                    tmodel.incrementTargetCycle(key, tmodel.getTargetCycle(key));
                    tmodel.resetTargetStep(key).resetTargetInitialValue(key).resetTargetExecutionFlag(key);
                    
                    TargetExecutor.executeDeclarativeTarget(tmodel, key);
                }

                if (typeof tmodel.targets[key] === 'object' && typeof tmodel.targets[key].onStepsEnd === 'function') {
                    tmodel.targets[key].onStepsEnd.call(tmodel, cycle);
                    tmodel.setTargetMethodName(key, 'onStepsEnd');
                }
            }
        }
        
        tmodel.updateTargetStatus(key);
        
        getRunScheduler().schedule(scheduleTime, `${tmodel.oid}---${key}-${step}/${steps}-${cycle}-${interval}`);
    }
}

export { TargetManager };
