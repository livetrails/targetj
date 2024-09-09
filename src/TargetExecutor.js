import { TargetUtil } from "./TargetUtil.js";
import { TUtil } from "./TUtil.js";
import { Easing } from "./Easing.js";

/**
 * It is responsible for executing both declarative and imperative targets.
 */
class TargetExecutor {
    static executeDeclarativeTarget(tmodel, key) {
        TargetExecutor.resolveTargetValue(tmodel, key);
        TargetExecutor.updateTarget(tmodel, tmodel.targetValues[key], key);
    }

    static executeImperativeTarget(tmodel, key, value, steps, interval, easing, originalTargetName) {
        tmodel.targetValues[key] = tmodel.targetValues[key] || TargetUtil.emptyValue();
        const targetValue = tmodel.targetValues[key];

        targetValue.isImperative = true;
        targetValue.originalTargetName = originalTargetName;


        if (TargetUtil.isListTarget(value)) {
            TargetExecutor.assignListTarget(targetValue, value.list, value.list[0], steps, interval, easing);
        } else {
            TargetExecutor.assignSingleTarget(targetValue, value, undefined, steps, 0, interval, easing);
            targetValue.step = 0;
        }

        TargetExecutor.updateTarget(tmodel, targetValue, key);
    }

    static updateTarget(tmodel, targetValue, key) {
        targetValue.executionCount++;
        targetValue.executionFlag = true;

        tmodel.addToStyleTargetList(key);
        tmodel.setTargetMethodName(key, 'value');

        if (tmodel.getTargetSteps(key) === 0) {
            TargetExecutor.snapActualToTarget(tmodel, key);
        }

        tmodel.updateTargetStatus(key);
    }

    static assignListTarget(targetValue, valueList, initialValue, steps, interval, easing) {
        targetValue.valueList = valueList;
        targetValue.stepList = Array.isArray(steps) ? steps : TUtil.isDefined(steps) ? [steps] : [1];
        targetValue.intervalList = Array.isArray(interval) ? interval : TUtil.isDefined(interval) ? [interval] : [0];
        targetValue.easingList = Array.isArray(easing) ? easing : TUtil.isDefined(easing) ? [easing] : [Easing.linear];

        targetValue.cycle = 1;
        targetValue.value = valueList[1];
        targetValue.initialValue = initialValue;
        targetValue.steps = targetValue.stepList[0];
        targetValue.interval = targetValue.intervalList[0];
        targetValue.easing = targetValue.easingList[0];

        targetValue.step = 0;
        targetValue.cycles = 0;
    }

    static assignSingleTarget(targetValue, value, initialValue, steps, cycles, interval, easing) {
        delete targetValue.valueList;
        delete targetValue.stepList;
        delete targetValue.intervalList;
        delete targetValue.easingList;

        targetValue.initialValue = initialValue;
        targetValue.value = value;
        targetValue.steps = steps || 0;
        targetValue.cycles = cycles || 0;
        targetValue.interval = interval || 0;
        targetValue.easing = easing;
    }

    static snapActualToTarget(tmodel, key) {
        const oldValue = tmodel.actualValues[key];
        const value = tmodel.targetValues[key].value;
        tmodel.actualValues[key] = typeof value === 'function' ? value.call(tmodel) : value;
        tmodel.setActualValueLastUpdate(key);
        TargetUtil.handleValueChange(tmodel, key, tmodel.actualValues[key], oldValue, 0, 0);
    }

    static resolveTargetValue(tmodel, key) {
        const targetInitial = !tmodel.targetValues[key] && TUtil.isDefined(tmodel.targets[key].initialValue)
            ? tmodel.targets[key].initialValue
            : undefined;

        const valueArray = TargetUtil.getValueStepsCycles(tmodel, key);

        const newValue = valueArray[0];
        const newSteps = valueArray[1] || 0;
        const newInterval = valueArray[2] || 0;
        const newCycles = valueArray[3] || 0;
        
        const targetValue = tmodel.targetValues[key] || TargetUtil.emptyValue();
        const theValue = targetValue.value;

        tmodel.targetValues[key] = targetValue;
        const easing = TUtil.isDefined(tmodel.targets[key].easing) ? tmodel.targets[key].easing : undefined;

        if (TargetUtil.isChildrenTarget(key, newValue)) {
            if (Array.isArray(newValue)) {
                newValue.forEach((child) => tmodel.addChild(child));                      
            } else {
                tmodel.addChild(newValue);
            }
            TargetExecutor.assignSingleTarget(targetValue, newValue, undefined, 0, newCycles, newInterval);

        } else if (TargetUtil.isListTarget(newValue)) {
            TargetExecutor.assignListTarget(targetValue, newValue.list, newValue.list[0], newSteps, newInterval, easing);
        } else {
            TargetExecutor.assignSingleTarget(targetValue, newValue, targetInitial, newSteps, newCycles, newInterval, easing);
            if (newSteps > 0 && TUtil.areEqual(theValue, newValue, tmodel.targets[key] ? !!tmodel.targets[key].deepEquality : false)) {
                tmodel.resetTargetStep(key);
            }
        }
    }
}

export { TargetExecutor };
