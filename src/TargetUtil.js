function TargetUtil() {}

TargetUtil.extractInvisibles = function(tmodel, target, key) {
    if (typeof target === 'object' && target) {
        Object.keys(target).forEach(function(k) {
            if (k === 'onInvisible') {
                if (!tmodel.invisibleFunctions) {
                    tmodel.invisibleFunctions = [];
                }                         
                tmodel.invisibleFunctions.push({ fn: target[k], key: key });
            }
        });                
    }
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
        actualTimeStamp: undefined,
        actualValueLastUpdate: 0,
        status: '',
        executionCounter: 0,
        callingTargetKey: undefined
    };
};

TargetUtil.getValueStepsCycles = function(tmodel, _target, cycle, valueOnly, key) {
    var value = 0, steps = 0, stepInterval = 0, cycles = 0;
    var lastValue = tmodel.getValue(key);
    
    function getValue(target) {             
        if (Array.isArray(target)) {                      
            if (!target.valueOnly) {
                if (typeof target[0] === 'function')    {
                  value = target[0].call(tmodel, key, cycle, lastValue);
                } else {
                    value = target[0];
                }
                steps = target.length >= 2 ? target[1] : steps;
                stepInterval = target.length >= 3 ? target[2] : stepInterval;                
                cycles = target.length >= 4 ? target[3] : cycles;

                return [value, steps, stepInterval, cycles];
            } else {
                return [target, steps, stepInterval, cycles];
            }
                
        } else if (typeof target === 'object' && target && !(target instanceof TModel)) {
            value = typeof target.value === 'function' ? target.value.call(tmodel, key, cycle, lastValue) : TUtil.isDefined(target.value) ? target.value : target;
            steps = typeof target.steps === 'function' ? target.steps.call(tmodel, key, cycle) : TUtil.isDefined(target.steps) ? target.steps : 0;
            stepInterval = typeof target.stepInterval === 'function' ? target.stepInterval.call(tmodel, key, cycle, tmodel.getTargetStepInterval(key), steps) : TUtil.isDefined(target.stepInterval) ? target.stepInterval : 0;            
            cycles = typeof target.cycles === 'function' ? target.cycles.call(tmodel, key, cycle, tmodel.getTargetCycles(key)) : TUtil.isDefined(target.cycles) ? target.cycles : 0;

            if (Array.isArray(value) && valueOnly === false && !value.valueOnly) {
                return getValue(value);
            } else {
                return [value, steps, stepInterval, cycles];
            }
            
        } else {               
            if (typeof target === 'function') {
                return getValue(target.call(tmodel, key, cycle, lastValue));
            } else if (typeof target === 'number' 
                    || typeof target === 'string'
                    || typeof target === 'boolean'            
                    || (target instanceof TModel)
                    || (typeof target === 'object')) {
                
                return [target, steps, stepInterval, cycles];
            } else {      
                return [value, steps, stepInterval, cycles];
            }
        }
    }
   
    var valueArray = getValue(_target);
      
    return valueArray;
};

TargetUtil.assignValueArray = function(tmodel, key, valueArray) {
    
    if (Array.isArray(valueArray)) {
        var newValue = valueArray[0];
        var newSteps = valueArray[1];
        var newStepInterval = valueArray[2];        
        var newCycles = valueArray[3];
        var target = tmodel.targets[key];
               
        var cycle = tmodel.getTargetCycle(key);
        var targetValue = tmodel.targetValues[key];        
        var theValue = targetValue ? targetValue.value : undefined;
        var newValueFlag = !TUtil.areEqual(theValue, newValue, target.deepEquality) 
                || !TUtil.isDefined(targetValue)
                || (!tmodel.isTargetUpdating(key) && !tmodel.doesTargetEqualActual(key));
                
        if (newValueFlag || targetValue.steps !== newSteps || targetValue.cycles !== newCycles || targetValue.stepInterval !== newStepInterval) {
                     
            tmodel.setTargetValue(key, newValue, newSteps, newStepInterval, newCycles, key);
            tmodel.targetValues[key].executionCounter++;
            
            if (newValueFlag) {
                tmodel.resetTargetStep(key);
               
                tmodel.resetLastActualValue(key);
            }
        }
    }
};

TargetUtil.getIntervalValue = function(tmodel, key, interval) {
    var intervalValue = typeof interval === 'function' ? interval.call(tmodel, key) : interval;

    return TUtil.isNumber(intervalValue) ? intervalValue : 0;
};

TargetUtil.getActualSchedulePeriod = function(tmodel, key, intervalValue) {   
    
    var now = browser.now();
    var pastPeriod;
    var schedulePeriod = 0;
    
    if (intervalValue > 0) {
        if (TUtil.isDefined(tmodel.getActualTimeStamp(key))) {
            pastPeriod = now - tmodel.getActualTimeStamp(key);
            if (pastPeriod < intervalValue) {
                schedulePeriod = intervalValue - pastPeriod;
            } else {
                schedulePeriod = 0;
            }
        } else {
            tmodel.setActualTimeStamp(key, now);
            schedulePeriod = intervalValue;
        }
    } else if (TUtil.isDefined(tmodel.getActualTimeStamp(key))) {
        pastPeriod = now - tmodel.getActualTimeStamp(key);
        if (pastPeriod < 0) {
            schedulePeriod = -pastPeriod;
        } else {
            schedulePeriod = 0;
        }
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
            tmodel.targets[key].onValueChange.call(tmodel, key, newValue, lastValue, cycle);     
        }
    }    
};

TargetUtil.setWidthFromDom = function(child) {
    var width = TUtil.isDefined(child.domWidth) ? child.domWidth.width : 10 ;
    
    if (child.hasDom()) {
        if (!TUtil.isDefined(child.domWidth) 
                || child.domWidth.height !== child.getHeight() 
                || child.hasTargetUpdatedAfter('width', 'width', child.getParent())) {
            child.$dom.width('auto');
            width = child.$dom.width();
        }
    }
    
    child.domWidth = { width: width, height: child.getHeight() };
    child.setValue('width', width);
};


TargetUtil.setHeightFromDom = function(child) {
    var height = TUtil.isDefined(child.domHeight) ? child.domHeight.height : 10 ;
    
    if (child.hasDom()) {
        if (!TUtil.isDefined(child.domHeight) 
                || child.domHeight.width !== child.getWidth() 
                || child.hasTargetUpdatedAfter('height', 'height', child.getParent())) {
            child.$dom.height('auto');
            height = child.$dom.height();
        }
    }
    
    child.domHeight = { height: height, width: child.getWidth() };
    
    child.setValue('height', height);
};