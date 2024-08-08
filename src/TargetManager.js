import { browser } from "./Browser.js";
import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";

import { tapp } from "./App.js";

function TargetManager() {}

TargetManager.prototype.applyTargetValues = function(tmodel) {
    tmodel.targetMethodMap = {};

    var activeList = tmodel.activeTargetList.slice(0);
    for (var i = 0; i < activeList.length; i++) {
        var key = activeList[i];
                     
        if (!tmodel.isTargetImperative(key)) {
            tmodel.addToStyleTargetList(key);
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
    
    if (tmodel.getTargetStep(key) === tmodel.getTargetSteps(key)) {
        if (TargetUtil.scheduleExecution(tmodel, key) > 0) {
            return;
        }
    }
    
    tmodel.resetScheduleTimeStamp(key);

    if (tmodel.isExecuted(key) && tmodel.getTargetCycle(key) < tmodel.getTargetCycles(key)) {        
        tmodel.setTargetCycle(key, tmodel.getTargetCycle(key) + 1);
        tmodel.resetTargetStep(key);
        tmodel.resetLastActualValue(key);
    }   
    
    TargetUtil.executeTarget(tmodel, key);

    if (tmodel.getTargetSteps(key) === 0) {
        TargetUtil.snapToTarget(tmodel, key);
    }
    
    tmodel.updateTargetStatus(key); 
    
    var schedulePeriod = TargetUtil.scheduleExecution(tmodel, key);
    if (schedulePeriod > 0) {
        tapp.manager.scheduleRun(schedulePeriod, "actualInterval__" + tmodel.oid + "__" + key); 
    }
};

TargetManager.prototype.setJustActualValue = function(tmodel, key)  {
    
    var targetValue = tmodel.getTargetValue(key);
   
    var step = tmodel.getTargetStep(key);
    var steps = tmodel.getTargetSteps(key);
    
    if (step < steps) {
        if (!TUtil.isDefined(tmodel.getLastActualValue(key))) {
            tmodel.setLastActualValue(key, tmodel.actualValues[key]);
        }
        tmodel.actualValues[key] = TargetUtil.morph(tmodel, key, tmodel.getLastActualValue(key), targetValue, step, steps);
    } else {          
        tmodel.actualValues[key] = targetValue;
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
    
    if (!tmodel.targetValues[key]) return;
    
    if (!tmodel.isTargetEnabled(key)) {
        tapp.manager.scheduleRun(10, "setActualValue-disabled-" + tmodel.oid + "__" + key);
        return;
    }
    
    var targetValue = tmodel.getTargetValue(key);
    var step = tmodel.getTargetStep(key);
    var steps = tmodel.getTargetSteps(key);
    var cycle = tmodel.getTargetCycle(key);
    var interval = tmodel.getTargetInterval(key) || 0;  
    var oldValue = tmodel.actualValues[key], oldStep = step, oldCycle = cycle;
              
    if (step <= steps) {
        if (!TUtil.isDefined(tmodel.getLastActualValue(key))) {
            tmodel.setLastActualValue(key, tmodel.actualValues[key]);
        }
        tmodel.actualValues[key] = TargetUtil.morph(tmodel, key, tmodel.getLastActualValue(key), targetValue, step, steps);
                 
        tmodel.setActualValueLastUpdate(key);
                
        if (tmodel.isTargetImperative(key)) {
            var originalTargetName = tmodel.targetValues[key].originalTargetName;
            var originalTarget = tmodel.targets[tmodel.targetValues[key].originalTargetName];
            if (originalTarget && typeof originalTarget.onImperativeStep === 'function') {
                originalTarget.onImperativeStep.call(tmodel, key, tmodel.actualValues[key], step, steps);
                tmodel.setTargetMethodName(originalTargetName, 'onImperativeStep');
            }
        } else {
            TargetUtil.handleValueChange(tmodel, key, tmodel.actualValues[key], oldValue, oldStep, oldCycle);            
        }
        
        tmodel.setTargetStep(key, step + 1);  

        tmodel.resetScheduleTimeStamp(key);
        
        tmodel.updateTargetStatus(key);
        
        if (tmodel.isTargetUpdating(key)) {
            tapp.manager.scheduleRun(interval, tmodel.oid + "---" + key + "-" + step + "/" + steps + "-" + cycle + "-" + interval); 
            return;
        }
    } 

    tmodel.actualValues[key] = targetValue;      
    tmodel.setActualValueLastUpdate(key);
    
    var scheduleTime = 0;
    
    if (tmodel.isTargetImperative(key)) {
        var targetValue = tmodel.targetValues[key];
        if (targetValue.valueList && cycle < targetValue.valueList.length - 1) {
            tmodel.setTargetCycle(key, ++cycle);
            tmodel.resetTargetStep(key);
            targetValue.lastActualValue = targetValue.value;
            targetValue.value = targetValue.valueList[cycle];
            targetValue.steps = targetValue.stepList[cycle % targetValue.stepList.length];
            targetValue.interval = targetValue.intervalList[cycle % targetValue.intervalList.length];
            targetValue.easing = targetValue.easingList[cycle % targetValue.easingList.length];
            scheduleTime = interval;
        } else {
            var originalTargetName = targetValue.originalTargetName;
            var originalTarget = tmodel.targets[targetValue.originalTargetName];
            if (originalTarget && typeof originalTarget.onImperativeEnd === 'function') {
                originalTarget.onImperativeEnd.call(tmodel, key, tmodel.actualValues[key]);
                tmodel.setTargetMethodName(originalTargetName, 'onImperativeEnd');
            }
        }
    } else {
        if (tmodel.getTargetCycle(key) < tmodel.getTargetCycles(key)) {
            tmodel.setTargetCycle(key, tmodel.getTargetCycle(key) + 1);
            tmodel.resetTargetStep(key);
            tmodel.resetLastActualValue(key);

            TargetUtil.executeTarget(tmodel, key);
        }
        
        if (typeof tmodel.targets[key] === 'object' && typeof tmodel.targets[key].onStepsEnd === 'function') {
            tmodel.targets[key].onStepsEnd.call(tmodel, cycle);                      
            tmodel.setTargetMethodName(key, 'onStepsEnd');
        }
    } 
   
    tmodel.updateTargetStatus(key);

    tapp.manager.scheduleRun(scheduleTime, tmodel.oid + "---" + key + "-" + step + "/" + steps + "-" + cycle + "-" + interval);
};

export { TargetManager };
