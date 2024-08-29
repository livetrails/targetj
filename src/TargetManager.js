import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { TargetExecutor } from "./TargetExecutor.js";
import { SearchUtil } from "./SearchUtil.js";
import { tApp } from "./App.js";

class TargetManager {
    applyTargetValues(tmodel) {
        tmodel.targetMethodMap = {};

        const activeList = tmodel.activeTargetList.slice(0);
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
            tApp.manager.scheduleRun(10, `applyTargetValue-disabled-${tmodel.oid}__${key}`);
            return;
        }

        if (tmodel.isExecuted(key) && tmodel.getTargetStep(key) === tmodel.getTargetSteps(key)) {
            if (TargetUtil.scheduleExecution(tmodel, key) > 0) {
                return;
            }
        }

        tmodel.resetScheduleTimeStamp(key);

        if (tmodel.isExecuted(key) && tmodel.getTargetCycle(key) < tmodel.getTargetCycles(key)) {
            tmodel.incrementTargetCycle(key, tmodel.getTargetCycle(key));
            tmodel.resetTargetStep(key);
            tmodel.resetTargetInitialValue(key);
        }

        TargetExecutor.executeDeclarativeTarget(tmodel, key);

        const schedulePeriod = TargetUtil.scheduleExecution(tmodel, key);
        if (schedulePeriod > 0) {
            tApp.manager.scheduleRun(schedulePeriod, `actualInterval__${tmodel.oid}__${key}`);
        }
    }

    setActualValues(tmodel) {
        const updatingList = tmodel.updatingTargetList.slice(0);
        let schedulePeriod = 0;

        for (const key of updatingList) {
            schedulePeriod = TargetUtil.scheduleExecution(tmodel, key);

            if (schedulePeriod === 0) {
                tmodel.addToStyleTargetList(key);
                this.setActualValue(tmodel, key);
            }
        }
    }

    setActualValue(tmodel, key) {
        const targetValue = tmodel.targetValues[key];

        if (!targetValue) {
            return;
        }

        if (!tmodel.isTargetEnabled(key)) {
            tApp.manager.scheduleRun(10, `setActualValue-disabled-${tmodel.oid}__${key}`);
            return;
        }

        let theValue = tmodel.getTargetValue(key);
        let step = tmodel.getTargetStep(key);
        const steps = tmodel.getTargetSteps(key);
        let cycle = tmodel.getTargetCycle(key);
        const interval = tmodel.getTargetInterval(key) || 0;
        const oldValue = tmodel.actualValues[key];
        const oldStep = step;
        const oldCycle = cycle;
        let initialValue = tmodel.getTargetInitialValue(key);
        let originalTargetName, originalTarget, originalTModel;

        if (step <= steps) {
            if (!TUtil.isDefined(initialValue)) {
                initialValue = tmodel.actualValues[key];
                tmodel.setTargetInitialValue(key, initialValue);
            }

            tmodel.actualValues[key] = TargetUtil.morph(tmodel, key, initialValue, theValue, step, steps);

            tmodel.setActualValueLastUpdate(key);

            if (tmodel.isTargetImperative(key)) {
                originalTargetName = targetValue.originalTargetName;
                originalTarget = tmodel.targets[targetValue.originalTargetName];
                originalTModel = tmodel;
                if (!originalTarget) {
                    originalTModel = SearchUtil.findParentByTarget(tmodel, originalTargetName);
                    originalTarget = originalTModel.targets[targetValue.originalTargetName];
                }
                if (originalTarget && typeof originalTarget.onImperativeStep === 'function') {
                    originalTarget.onImperativeStep.call(originalTModel, key, originalTModel.actualValues[key], step, steps);
                    originalTModel.setTargetMethodName(originalTargetName, 'onImperativeStep');
                }
            } else {
                TargetUtil.handleValueChange(tmodel, key, tmodel.actualValues[key], oldValue, oldStep, oldCycle);
            }

            tmodel.incrementTargetStep(key);

            tmodel.resetScheduleTimeStamp(key);

            tmodel.updateTargetStatus(key);

            if (tmodel.isTargetUpdating(key)) {
                tApp.manager.scheduleRun(interval, `${tmodel.oid}---${key}-${step}/${steps}-${cycle}-${interval}`);
                return;
            }
        }

        tmodel.actualValues[key] = theValue;
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
                    originalTModel = SearchUtil.findParentByTarget(tmodel, originalTargetName);
                    originalTarget = originalTModel.targets[targetValue.originalTargetName];
                }
                if (originalTarget && typeof originalTarget.onImperativeStep === 'function') {
                    originalTarget.onImperativeStep.call(originalTModel, key, originalTModel.actualValues[key], step, steps);
                    originalTModel.setTargetMethodName(originalTargetName, 'onImperativeStep');
                }
                if (originalTarget && typeof originalTarget.onImperativeEnd === 'function') {
                    originalTarget.onImperativeEnd.call(originalTModel, key, originalTModel.actualValues[key]);
                    originalTModel.setTargetMethodName(originalTargetName, 'onImperativeEnd');
                }
            } else {
                if (tmodel.getTargetCycle(key) < tmodel.getTargetCycles(key)) {
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

        tApp.manager.scheduleRun(scheduleTime, `${tmodel.oid}---${key}-${step}/${steps}-${cycle}-${interval}`);
    }
}

export { TargetManager };
