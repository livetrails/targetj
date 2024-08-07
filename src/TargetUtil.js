import { browser } from "./Browser.js";
import { TModel } from "./TModel.js";
import { getManager } from "./App.js";
import { TUtil } from "./TUtil.js";
import { ColorUtil } from "./ColorUtil.js";
import { Easing } from "./Easing.js";

function TargetUtil() {}

TargetUtil.styleTargetMap = {
    x: true,
    y: true,
    width: true,
    height: true,
    rotate: true,
    scale: true,
    opacity: true,
    zIndex: true,
    fontSize: true,
    borderRadius: true,
    padding: true,
    backgroundColor: true,
    background: true,
    color: true,
    css: true,
    style: true,
    transform: true,
    dim: true
};

TargetUtil.transformMap = {
    x: true,
    y: true,
    rotate: true,
    scale: true
};

TargetUtil.dimMap = {
    width: true,
    height: true
};

TargetUtil.colorMap = {
    color: true,
    background: true, 
    backgroundColor: true
};

TargetUtil.emptyValue = function() {
    return {
        value: undefined, 
        step: 0, 
        steps: 0, 
        cycle: 0, 
        cycles: 0, 
        stepInterval: 0, 
        lastActualValue: undefined,
        scheduleTimeStamp: undefined,
        actualValueLastUpdate: 0,
        status: '',
        executionCount: 0,
        isImperative: false,
        originalTargetName: undefined,
        easing: undefined
    };
};

TargetUtil.bindTargetName = function(targetInstance, key) {
    var target = targetInstance[key];
    
    if (typeof target === 'object') {
        ['value', 'enabledOn', 'onStepsEnd', 'onValueChange', 'loop', 'onImperativeEnds'].forEach(function(method) {
            if (typeof target[method] === 'function') {
                var originalMethod = target[method];
                target[method] = function() {
                    this.key = key;
                    return originalMethod.apply(this, arguments);
                };
            }
        });
    } else if (typeof target === 'function') {
        var originalFunction = target;
        targetInstance[key] = function() {
            this.key = key;  // Assign the key to `this`
            return originalFunction.apply(this, arguments);  // Call the original function
        };
    }
};

TargetUtil.isValueStepsCycleArray = function(arr) {
    if (arr.length > 4) {
        return false;
    }
    var startIndex = arr.length === 4 ? 1 : 0;
    for (var i = startIndex; i < arr.length; i++) {
        if (typeof arr[i] !== 'number') {
            return false;
        }
    }
    
    return true;
};

TargetUtil.getValueStepsCycles = function(tmodel, key) {
    var _target = tmodel.targets[key];
    var valueOnly = _target && _target.valueOnly ? true : false;
    var cycle = tmodel.getTargetCycle(key);
    var lastValue = tmodel.getValue(key);
    
    var value = null, steps = 0, stepInterval = 0, cycles = 0;
    
    function getValue(target) {             
        if (Array.isArray(target)) {                      
            if (valueOnly || !TargetUtil.isValueStepsCycleArray(target)) {
                return [target, steps, stepInterval, cycles];
            } else if (Array.isArray(_target)) {
                return _target;
            } else {
                value = target[0];
                steps = target.length >= 2 ? target[1] : steps;
                stepInterval = target.length >= 3 ? target[2] : stepInterval;                
                cycles = target.length >= 4 ? target[3] : cycles;

                return [value, steps, stepInterval, cycles];
            } 
        }
        
        if (typeof target === 'object' && target !== null) {
            value = typeof target.value === 'function' ? target.value.call(tmodel, cycle, lastValue) : TUtil.isDefined(target.value) ? target.value : target;
            steps = typeof target.steps === 'function' ? target.steps.call(tmodel, cycle) : TUtil.isDefined(target.steps) ? target.steps : 0;
            stepInterval = typeof target.stepInterval === 'function' ? target.stepInterval.call(tmodel, cycle, tmodel.getTargetStepInterval(key)) : TUtil.isDefined(target.stepInterval) ? target.stepInterval : 0;            
            cycles = typeof target.cycles === 'function' ? target.cycles.call(tmodel, cycle, tmodel.getTargetCycles(key)) : TUtil.isDefined(target.cycles) ? target.cycles : 0;

            return Array.isArray(value) ? getValue(value) : [value, steps, stepInterval, cycles];
        }
        
        if (typeof target === 'function') {
            return getValue(target.call(tmodel, cycle, lastValue));
        } 
                
        return [target, steps, stepInterval, cycles];
    }
   
    return getValue(_target);
};

TargetUtil.executeTarget = function(tmodel, key) {    
    TargetUtil.assignValueArray(tmodel, key);
    tmodel.targetValues[key].executionCount++;
    tmodel.setTargetMethodName(key, 'value'); 
};

TargetUtil.snapToTarget = function(tmodel, key) {
    var oldValue = tmodel.actualValues[key];
    var value = tmodel.targetValues[key].value;
    tmodel.actualValues[key] = typeof value === 'function' ? value.call(tmodel) : value;
    tmodel.setActualValueLastUpdate(key);
    TargetUtil.handleValueChange(tmodel, key, tmodel.actualValues[key], oldValue, 0, 0);
};

TargetUtil.assignValueArray = function(tmodel, key) {
    var valueArray = TargetUtil.getValueStepsCycles(tmodel, key);

    var newValue = valueArray[0];
    var newSteps = valueArray[1] || 0;
    var newStepInterval = valueArray[2] || 0;        
    var newCycles = valueArray[3] || 0;

    var targetValue = tmodel.targetValues[key];  
    var isNewTargetValue = !targetValue;
    var theValue = !isNewTargetValue ? targetValue.value : undefined;
    var isValueUpdated = isNewTargetValue
            || !tmodel.isExecuted(key)
            || !TUtil.areEqual(theValue, newValue, tmodel.targets[key] ? !!tmodel.targets[key].deepEquality : false) 
            || !TUtil.isDefined(targetValue)
            || (!tmodel.isTargetUpdating(key) && !tmodel.doesTargetEqualActual(key));

    if (isValueUpdated || targetValue.steps !== newSteps || targetValue.cycles !== newCycles || targetValue.stepInterval !== newStepInterval) {

        tmodel.targetValues[key] = !tmodel.targetValues[key] ? TargetUtil.emptyValue() : tmodel.targetValues[key];
        var targetValue = tmodel.targetValues[key];    
        targetValue.value = newValue;
        targetValue.steps = newSteps;
        targetValue.stepInterval = newStepInterval;    
        targetValue.cycles = newCycles;

        if (isValueUpdated) {
            tmodel.resetTargetStep(key);
            tmodel.resetLastActualValue(key);
        }
        
        return true;
    }  
};

TargetUtil.getIntervalValue = function(tmodel, key, interval) {
    var intervalValue = typeof interval === 'function' ? interval.call(tmodel, key) : interval;

    return TUtil.isNumber(intervalValue) ? intervalValue : 0;
};

TargetUtil.scheduleExecution = function(tmodel, key) { 
    var now = browser.now();    
    var stepInterval = tmodel.getTargetStepInterval(key);
    var lastScheduledTime = tmodel.getScheduleTimeStamp(key);
    
    var schedulePeriod = 0;

    if (stepInterval > 0) {
        if (TUtil.isDefined(lastScheduledTime)) {
            var elapsed = now - lastScheduledTime;
            schedulePeriod = Math.max(stepInterval - elapsed, 0);
        } else {
            schedulePeriod = stepInterval;
            tmodel.setScheduleTimeStamp(key, now); // Set the schedule timestamp when first scheduled
        }
    }
        
    if (schedulePeriod > 0 && !TUtil.isDefined(lastScheduledTime)) {
        tmodel.setScheduleTimeStamp(key, now);       
    }

    return schedulePeriod;
};

TargetUtil.getTargetSchedulePeriod = function(tmodel, key, intervalValue) {   
    
    var now = browser.now();
    var pastPeriod;
    var schedulePeriod = 0;
    
    if (intervalValue > 0) {
        if (TUtil.isDefined(tmodel.getTargetTimeStamp(key))) {
            pastPeriod = now - tmodel.getTargetTimeStamp(key);
            if (pastPeriod < intervalValue) {
                schedulePeriod = intervalValue - pastPeriod;
            } else {
                schedulePeriod = 0;
            }
        } else {
            tmodel.setTargetTimeStamp(key, now);
            schedulePeriod = intervalValue;
        }
        
    } else if (TUtil.isDefined(tmodel.getTargetTimeStamp(key))) {
        pastPeriod = now - tmodel.getTargetTimeStamp(key);
        if (pastPeriod < 0) {
            schedulePeriod = -pastPeriod;
        } else {
            schedulePeriod = 0;
        }
    }

    return schedulePeriod;
};

TargetUtil.handleValueChange = function(tmodel, key, newValue, lastValue, step, cycle) {
    if (typeof tmodel.targets[key] === 'object' && typeof tmodel.targets[key].onValueChange === 'function') {
        
        var valueChanged = !TUtil.areEqual(newValue, lastValue, tmodel.targets[key].deepEquality);
        if (valueChanged) {
            tmodel.targets[key].onValueChange.call(tmodel, newValue, lastValue, cycle); 
            tmodel.setTargetMethodName(key, 'onValueChange');
        }
    }    
};

TargetUtil.morph = function(tmodel, key, fromValue, toValue, step, steps)  {
    
    var easing = TUtil.isDefined(tmodel.getTargetEasing(key)) ? tmodel.getTargetEasing(key) : 
            typeof tmodel.targetValues[key].easing === 'function' ? tmodel.targetValues[key].easing : Easing.linear;
    
    var easingStep = easing(tmodel.getTargetStepPercent(key, step)); 
    
    if (TargetUtil.colorMap[key]) {
        
        var targetColors = ColorUtil.color2Integers(toValue);
        var lastColors = fromValue ? ColorUtil.color2Integers(fromValue) : ColorUtil.color2Integers('#fff');

        if (targetColors && lastColors) {
            var red = Math.floor(targetColors[0] * easingStep + lastColors[0] * (1 - easingStep));
            var green = Math.floor(targetColors[1] * easingStep + lastColors[1] * (1 - easingStep));
            var blue = Math.floor(targetColors[2] * easingStep + lastColors[2] * (1 - easingStep));
                              
            return 'rgb(' + red + ',' + green +  ',' + blue + ')';
        } else {
            return toValue;
        }
        
    } else {
        return typeof toValue  === 'number' ? toValue * easingStep + fromValue * (1 - easingStep) : toValue;
    }
};

TargetUtil.setWidthFromDom = function(child) {    
    var height = TUtil.isDefined(child.domWidth) ? child.domWidth.height : undefined;    
    var width = TUtil.isDefined(child.domWidth) ? child.domWidth.width : undefined;
    var domParent = child.getDomParent();
    
    if (getManager().needsRerender(child)) {
        child.isTextOnly() ? child.$dom.text(child.getHtml()) : child.$dom.html(child.getHtml());  
    }
    
    if (!TUtil.isDefined(child.domWidth) 
            || height !== child.getHeight()
            || (domParent && child.getActualValueLastUpdate('width') <= domParent.getActualValueLastUpdate('width'))) {
        child.$dom.width('auto');
        width = child.$dom.width();
        height = child.$dom.height();
    }
    
    child.domWidth = { width: width, height: height };
    child.setValue('width', width);
};

TargetUtil.setHeightFromDom = function(child) {    
    var height = TUtil.isDefined(child.domHeight) ? child.domHeight.height : undefined;
    var width = TUtil.isDefined(child.domHeight) ? child.domHeight.width : undefined;
    var domParent = child.getDomParent();
    
    if (getManager().needsRerender(child)) {
        child.isTextOnly() ? child.$dom.text(child.getHtml()) : child.$dom.html(child.getHtml());    
    }    
    
    if (!TUtil.isDefined(child.domHeight) 
            || width !== child.getWidth() 
            || (domParent && child.getActualValueLastUpdate('height') <= domParent.getActualValueLastUpdate('height'))) {
        child.$dom.height('auto');
        width =  child.$dom.width();
        height = child.$dom.height();
    }
    
    child.domHeight = { height: height, width: width };
    child.setValue('height', height);
};

export { TargetUtil };
