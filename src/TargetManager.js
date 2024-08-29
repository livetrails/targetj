import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { TargetExecutor } from "./TargetExecutor";
import { SearchUtil } from "./SearchUtil";

import { tapp } from "./App.js";

function TargetManager() {}

TargetManager.prototype.applyTargetValues = function(tmodel) {
    tmodel.targetMethodMap = {};

    var activeList = tmodel.activeTargetList.slice(0);
    for (var i = 0; i < activeList.length; i++) {
        var key = activeList[i];
                     
        if (!tmodel.isTargetImperative(key)) {
            this.applyTargetValue(tmodel, key);
        }
    }
};

TargetManager.prototype.applyTargetValue = function(tmodel, key) {
    var target = tmodel.targets[key];
    
    if (!TUtil.isDefined(target)) {
        tmodel.removeFromActiveTargets(key);        
        return;
    }

    if (typeof target.enabledOn === 'function') {
        tmodel.setTargetMethodName(key, 'enabledOn');
    }
    
    if (!tmodel.isTargetEnabled(key)) {        
        tapp.manager.scheduleRun(10, "applyTargetValue-disabled-" + tmodel.oid + "__" + key);
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
    
    var schedulePeriod = TargetUtil.scheduleExecution(tmodel, key);
    if (schedulePeriod > 0) {
        tapp.manager.scheduleRun(schedulePeriod, "actualInterval__" + tmodel.oid + "__" + key); 
    }
};

TargetManager.prototype.setActualValues = function(tmodel) { 
    var i, key;
    var updatingList = tmodel.updatingTargetList.slice(0);
    var schedulePeriod = 0;
            
    for (i = 0; i < updatingList.length; i++) {
        key = updatingList[i];
                                         
        schedulePeriod = TargetUtil.scheduleExecution(tmodel, key);     
                
        if (schedulePeriod === 0) {
            tmodel.addToStyleTargetList(key);   
            this.setActualValue(tmodel, key);            
        } 
    }
};

TargetManager.prototype.setActualValue = function(tmodel, key) {
    var targetValue = tmodel.targetValues[key];

    if (!targetValue) {
        return;
    }
    
    if (!tmodel.isTargetEnabled(key)) {
        tapp.manager.scheduleRun(10, "setActualValue-disabled-" + tmodel.oid + "__" + key);
        return;
    }
    
    var theValue = tmodel.getTargetValue(key);
    var step = tmodel.getTargetStep(key);
    var steps = tmodel.getTargetSteps(key);
    var cycle = tmodel.getTargetCycle(key);
    var interval = tmodel.getTargetInterval(key) || 0;  
    var oldValue = tmodel.actualValues[key], oldStep = step, oldCycle = cycle;
    var initialValue = tmodel.getTargetInitialValue(key);
    var originalTargetName, originalTarget, originalTModel; 
          
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
            tapp.manager.scheduleRun(interval, tmodel.oid + "---" + key + "-" + step + "/" + steps + "-" + cycle + "-" + interval); 
            return;
        }
    } 

    tmodel.actualValues[key] = theValue;      
    tmodel.setActualValueLastUpdate(key);
    step = tmodel.getTargetStep(key);

    var scheduleTime = 0;
    
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
    
    tapp.manager.scheduleRun(scheduleTime, tmodel.oid + "---" + key + "-" + step + "/" + steps + "-" + cycle + "-" + interval);
};

export { TargetManager };
