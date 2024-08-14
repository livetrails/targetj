import { TargetUtil } from "./TargetUtil.js";
import { TUtil } from "./TUtil.js";
import { Easing } from "./Easing.js";
import { browser } from "./Browser.js";

function TargetExecutor() {}

TargetExecutor.executeDeclarativeTarget = function(tmodel, key) {
    TargetExecutor.resolveTargetValue(tmodel, key);
    TargetExecutor.updateTarget(tmodel, tmodel.targetValues[key], key);
};

TargetExecutor.executeImperativeTarget = function(tmodel, key, value, steps, interval, easing, originalTargetName) {    
    tmodel.targetValues[key] = tmodel.targetValues[key] || TargetUtil.emptyValue();
    var targetValue = tmodel.targetValues[key];
    
    targetValue.isImperative = true;
    targetValue.originalTargetName = originalTargetName;    

    if (TargetUtil.isListTarget(value)) {
        TargetExecutor.assignListTarget(targetValue, value.list, value.list[0], steps, interval, easing);
    } else {
        TargetExecutor.assignSingleTarget(targetValue, value, undefined, steps, 0, interval, easing);
        targetValue.step = 0;
    }
    
    TargetExecutor.updateTarget(tmodel, targetValue, key);
};

TargetExecutor.updateTarget = function(tmodel, targetValue, key) {
    targetValue.executionCount++;

    tmodel.addToStyleTargetList(key);
    tmodel.setTargetMethodName(key, 'value');
    
    if (tmodel.getTargetSteps(key) === 0) {
        TargetExecutor.snapActualToTarget(tmodel, key);
    }

    tmodel.updateTargetStatus(key);
};

TargetExecutor.assignListTarget = function(targetValue, valueList, initialValue, steps, interval, easing) {
    targetValue.valueList = valueList;
    targetValue.stepList = Array.isArray(steps) ? steps : TUtil.isDefined(steps) ? [ steps ] : [ 1 ];
    targetValue.intervalList = Array.isArray(interval) ? interval : TUtil.isDefined(interval) ? [ interval ] : [ 0 ];
    targetValue.easingList = Array.isArray(easing) ? easing : TUtil.isDefined(easing) ? [ easing ] : [ Easing.linear ];

    targetValue.cycle = 1;
    targetValue.value = valueList[1];
    targetValue.initialValue = initialValue;
    targetValue.steps = targetValue.stepList[ 0 ];
    targetValue.interval = targetValue.intervalList[ 0];
    targetValue.easing = targetValue.easingList[ 0 ];

    targetValue.step = 0;
    targetValue.cycles = 0;
};

TargetExecutor.assignSingleTarget = function(targetValue, value, initialValue, steps, cycles, interval, easing) {
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
};

TargetExecutor.snapActualToTarget = function(tmodel, key) {
    var oldValue = tmodel.actualValues[key];
    var value = tmodel.targetValues[key].value;
    tmodel.actualValues[key] = typeof value === 'function' ? value.call(tmodel) : value;
    tmodel.setActualValueLastUpdate(key);
    TargetUtil.handleValueChange(tmodel, key, tmodel.actualValues[key], oldValue, 0, 0);
};



TargetExecutor.resolveTargetValue = function(tmodel, key) {
    var valueArray = TargetUtil.getValueStepsCycles(tmodel, key);

    var newValue = valueArray[0];
    var newSteps = valueArray[1] || 0;
    var newInterval = valueArray[2] || 0;        
    var newCycles = valueArray[3] || 0;

    var targetValue = tmodel.targetValues[key] || TargetUtil.emptyValue(); 
    var theValue = targetValue.value;
    //var isValueUpdated = !tmodel.isExecuted(key);

    tmodel.targetValues[key] = targetValue;
    var targetInitial = TUtil.isDefined(tmodel.targets[key].initialValue) ?  tmodel.targets[key].initialValue : undefined;
    var easing = TUtil.isDefined(tmodel.targets[key].easing) ?  tmodel.targets[key].easing : undefined;

    if (TargetUtil.isListTarget(newValue)) {
        TargetExecutor.assignListTarget(targetValue, newValue.list, newValue.list[0], newSteps, newInterval, easing);        
    } else {        
        TargetExecutor.assignSingleTarget(targetValue, newValue, targetInitial, newSteps, newCycles, newInterval, easing);
        if (newSteps > 0 && TUtil.areEqual(theValue, newValue, tmodel.targets[key] ? !!tmodel.targets[key].deepEquality : false)) {
            tmodel.resetTargetStep(key);
        }      
    }       

};

export { TargetExecutor };
