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
    lineHeight: true,
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
        interval: 0, 
        initialValue: undefined,
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
        ['value', 'enabledOn', 'onStepsEnd', 'onValueChange', 'loop', 'onImperativeEnd', 'onImperativeStep'].forEach(function(method) {
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
    if (arr.length > 4 || arr.length === 0) {
        return false;
    }

    var result = arr.length >= 2;
    for (var i = 1; i < arr.length; i++) {
        if (typeof arr[i] !== 'number') {
            result = false;
        }
    }

    return result && (typeof arr[0] === 'number' || TargetUtil.isListTarget(arr[0]) || typeof arr[0] === 'string') ? true : false;
};

TargetUtil.isListTarget = function(value) {
    return typeof value === 'object' && Array.isArray(value.list);
};

TargetUtil.isAddChildTarget = function(key, value) {
    return value instanceof TModel && key === 'addChild';
};

TargetUtil.getValueStepsCycles = function(tmodel, key) {
    var _target = tmodel.targets[key];
    var valueOnly = _target && _target.valueOnly ? true : false;
    var cycle = tmodel.getTargetCycle(key);
    var lastValue = tmodel.val(key);
    
    var value = null, steps = 0, interval = 0, cycles = 0;
    
    function getValue(target) {             
        if (Array.isArray(target)) {                      
            if (valueOnly || !TargetUtil.isValueStepsCycleArray(target)) {
                return [target, steps, interval, cycles];
            } else if (Array.isArray(_target)) {
                return _target;
            } else {
                value = target[0];
                steps = target.length >= 2 ? target[1] : steps;
                interval = target.length >= 3 ? target[2] : interval;                
                cycles = target.length >= 4 ? target[3] : cycles;

                return [value, steps, interval, cycles];
            } 
        }
        
        if (typeof target === 'object' && target !== null) {
            value = typeof target.value === 'function' ? target.value.call(tmodel, cycle, lastValue) : TUtil.isDefined(target.value) ? target.value : target;
            steps = typeof target.steps === 'function' ? target.steps.call(tmodel, cycle) : TUtil.isDefined(target.steps) ? target.steps : 0;
            interval = typeof target.interval === 'function' ? target.interval.call(tmodel, cycle) : TUtil.isDefined(target.interval) ? target.interval : 0;            
            cycles = typeof target.cycles === 'function' ? target.cycles.call(tmodel, cycle, tmodel.getTargetCycles(key)) : TUtil.isDefined(target.cycles) ? target.cycles : 0;

            return Array.isArray(value) ? getValue(value) : [value, steps, interval, cycles];
        }
        
        if (typeof target === 'function') {
            return getValue(target.call(tmodel, cycle, lastValue));
        } 
                
        return [target, steps, interval, cycles];
    }
   
    return getValue(_target);
};

TargetUtil.getIntervalValue = function(tmodel, key, interval) {
    var intervalValue = typeof interval === 'function' ? interval.call(tmodel, key) : interval;

    return TUtil.isNumber(intervalValue) ? intervalValue : 0;
};

TargetUtil.scheduleExecution = function(tmodel, key) { 
    var now = browser.now();    
    var interval = tmodel.getTargetInterval(key);
    var lastScheduledTime = tmodel.getScheduleTimeStamp(key);
    
    var schedulePeriod = 0;

    if (interval > 0) {
        if (TUtil.isDefined(lastScheduledTime)) {
            var elapsed = now - lastScheduledTime;
            schedulePeriod = Math.max(interval - elapsed, 0);
        } else {
            schedulePeriod = interval;
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
    
    var easing = tmodel.getTargetEasing(key);
    var easingStep = easing ? easing(tmodel.getTargetStepPercent(key, step)) : tmodel.getTargetStepPercent(key, step); 
    
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
    var rerender = false;
    
    if (getManager().needsRerender(child)) {
        child.isTextOnly() ? child.$dom.text(child.getHtml()) : child.$dom.html(child.getHtml());
        rerender = true;
    }
    
    if (!TUtil.isDefined(child.domWidth) 
            || rerender
            || height !== child.getHeight()
            || (domParent && child.getActualValueLastUpdate('width') <= domParent.getActualValueLastUpdate('width'))) {
        child.$dom.width('auto');
        width = child.$dom.width();
        height = child.$dom.height();
    }
    
    child.domWidth = { width: width, height: height };
    child.val('width', width);
    
    return width;
};

TargetUtil.setHeightFromDom = function(child) {    
    var height = TUtil.isDefined(child.domHeight) ? child.domHeight.height : undefined;
    var width = TUtil.isDefined(child.domHeight) ? child.domHeight.width : undefined;
    var domParent = child.getDomParent();
    var rerender = false;
    
    if (getManager().needsRerender(child)) {
        child.isTextOnly() ? child.$dom.text(child.getHtml()) : child.$dom.html(child.getHtml());
        rerender = true;
    }    
    
    if (!TUtil.isDefined(child.domHeight) 
            || rerender
            || width !== child.getWidth() 
            || (domParent && child.getActualValueLastUpdate('height') <= domParent.getActualValueLastUpdate('height'))) {
        child.$dom.height('auto');
        width =  child.$dom.width();
        height = child.$dom.height();
    }
    
    child.domHeight = { height: height, width: width };
    child.val('height', height);
    
    return height;
};

export { TargetUtil };
