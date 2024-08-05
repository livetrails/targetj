import { browser } from "./Browser.js";
import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";

import { tapp } from "./App.js";

function TargetManager() {}

TargetManager.prototype.setTargetValues = function(tmodel) {
    tmodel.targetMethodMap = {};

    var activeList = tmodel.activeTargetList.slice(0);
    for (var i = 0; i < activeList.length; i++) {
        var key = activeList[i];
             
        if (!tmodel.isTargetImperative(key)) {
            tmodel.addToStyleTargetList(key);
            this.setTargetValue(tmodel, key);
        }
    }
};

TargetManager.prototype.setTargetValue = function(tmodel, key) {
    var target = tmodel.targets[key];
    
    if (!TUtil.isDefined(target)) {
        tmodel.removeFromActiveTargets(key);        
        return;
    }

    if (typeof target.enabledOn === 'function') {
        tmodel.setTargetMethodName(key, 'enabledOn');
    }
    
    if (!tmodel.isTargetEnabled(key)) {        
        tapp.manager.scheduleRun(10, "setTargetValue-disabled-" + tmodel.oid + "__" + key);
        return;
    }
    
    if (TargetUtil.scheduleExecution(tmodel, key) > 0) {
        return;
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
        tmodel.actualValues[key] = TargetUtil.calculateActualValue(tmodel, key, targetValue, tmodel.getLastActualValue(key), step, steps);
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
    var stepInterval = tmodel.getTargetStepInterval(key) || 0;  
    var oldValue = tmodel.actualValues[key], oldStep = step, oldCycle = cycle;
              
    if (step < steps) { 
        if (!TUtil.isDefined(tmodel.getLastActualValue(key))) {
            tmodel.setLastActualValue(key, tmodel.actualValues[key]);
        }
        tmodel.actualValues[key] = TargetUtil.calculateActualValue(tmodel, key, targetValue, tmodel.getLastActualValue(key), step, steps);
             
        tmodel.setActualValueLastUpdate(key);
        
        step = tmodel.setTargetStep(key, step + 1);  
        
        TargetUtil.handleValueChange(tmodel, key, tmodel.actualValues[key], oldValue, oldStep, oldCycle);
        
        tmodel.resetScheduleTimeStamp(key);
        
        tmodel.updateTargetStatus(key);
        
        if (tmodel.isTargetUpdating(key)) {
            tapp.manager.scheduleRun(stepInterval, tmodel.oid + "---" + key + "-" + step + "/" + steps + "-" + cycle + "-" + stepInterval); 
            return;
        }
    } 

    tmodel.actualValues[key] = targetValue;      
    tmodel.setActualValueLastUpdate(key);

    if (typeof tmodel.targets[key] === 'object' && typeof tmodel.targets[key].onStepsEnd === 'function') {
        tmodel.targets[key].onStepsEnd.call(tmodel, key, cycle);                      
        tmodel.setTargetMethodName(key, 'onStepsEnd');
    }
    
    if (tmodel.getTargetCycle(key) < tmodel.getTargetCycles(key)) {
        tmodel.setTargetCycle(key, tmodel.getTargetCycle(key) + 1);
        tmodel.resetTargetStep(key);
        tmodel.resetLastActualValue(key);
        
        TargetUtil.executeTarget(tmodel, key);
    }   

    if (tmodel.isTargetImperative(key)) {
        var originalTargetName = tmodel.targetValues[key].originalTargetName;
        var originalTarget = tmodel.targets[tmodel.targetValues[key].originalTargetName];
        if (originalTarget && typeof originalTarget.onImperativeEnds === 'function') {
            originalTarget.onImperativeEnds.call(tmodel, key);
            tmodel.updateTargetStatus(originalTargetName);
        }
    }
    
    tmodel.updateTargetStatus(key);

    tapp.manager.scheduleRun(0, tmodel.oid + "---" + key + "-" + step + "/" + steps + "-" + cycle + "-" + stepInterval);  
};

export { TargetManager };
