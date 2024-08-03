import { browser } from "./Browser.js";
import { TUtil, EasingEffects } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { ColorUtil } from "./ColorUtil.js";
import { Easing } from "./Easing.js";

import { tapp } from "./App.js";

function TargetManager() {}

TargetManager.prototype.setTargetValues = function(tmodel) {
    tmodel.targetMethodMap = {};

    var activeList = tmodel.activeTargetList.slice(0);
    for (var i = 0; i < activeList.length; i++) {
        var key = activeList[i];
                                
        tmodel.addToStyleTargetList(key);
        this.setTargetValue(tmodel, key);
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
        tapp.manager.scheduleRun(0, "setTargetValue-disabled-" + tmodel.oid + "__" + key);
        return;
    }
    
    if (TargetUtil.scheduleExecution(tmodel, key) > 0) {
        return;
    }
        
    TargetUtil.executeTarget(tmodel, key);
    tmodel.updateTargetStatus(key);     

    var schedulePeriod = TargetUtil.scheduleExecution(tmodel, key);
    if (schedulePeriod > 0) {
        tapp.manager.scheduleRun(schedulePeriod, "actualInterval__" + tmodel.oid + "__" + key); 
    }
};

TargetManager.prototype.calculateActualValue = function(tmodel, key, targetValue, lastActualValue, step, steps)  {
    var easing = TUtil.isDefined(tmodel.getTargetEasing(key)) ? tmodel.getTargetEasing(key) : Easing.linear;
    var easingStep = easing(tmodel.getTargetStepPercent(key, step, steps)); 

    if (TargetUtil.colorMap[key]) {
        var targetColors = ColorUtil.color2Integers(targetValue);
        var lastColors = targetColors ? ColorUtil.color2Integers(lastActualValue) : undefined;
                
        if (targetColors && lastColors) {
            var red = targetColors[0] * easingStep + lastColors[0] * (1 - easingStep);
            var green = targetColors[1] * easingStep + lastColors[1] * (1 - easingStep);
            var blue = targetColors[2] * easingStep + lastColors[2] * (1 - easingStep);
            
            return 'rgb(' + red + ',' + green +  ',' + blue + ')';
        } else {
            return targetValue;
        }
        
    } else {
        return typeof targetValue  === 'number' ? targetValue * easingStep + lastActualValue * (1 - easingStep) : targetValue;
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
        tmodel.actualValues[key] = this.calculateActualValue(tmodel, key, targetValue, tmodel.getLastActualValue(key), step, steps);
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
    
    if (!tmodel.targetValues[key]) return false;
    
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
        tmodel.actualValues[key] = this.calculateActualValue(tmodel, key, targetValue, tmodel.getLastActualValue(key), step, steps);
             
        tmodel.setActualValueLastUpdate(key);
        
        step = tmodel.setTargetStep(key, step + 1);     
    } 

    if (step >= steps) {        
        tmodel.actualValues[key] = targetValue;      
        tmodel.setActualValueLastUpdate(key);
                
        if (typeof tmodel.targets[key] === 'object' && typeof tmodel.targets[key].onStepsEnd === 'function') {
            tmodel.targets[key].onStepsEnd.call(tmodel, key, cycle);                      
            tmodel.setTargetMethodName(key, 'onStepsEnd');
        }
        
        if (tmodel.getTargetCycle(key) < tmodel.getTargetCycles(key)) {
            tmodel.setTargetCycle(key, tmodel.getTargetCycle(key) + 1);

            TargetUtil.executeTarget(tmodel, key);
            
            tmodel.resetTargetStep(key);
            tmodel.resetLastActualValue(key);
        }        
    }
    
    TargetUtil.handleValueChange(tmodel, key, tmodel.actualValues[key], oldValue, oldStep, oldCycle);


    tmodel.resetScheduleTimeStamp(key);
    
    if (tmodel.targetValues[key]) {
        tmodel.updateTargetStatus(key);
    } else {
        tmodel.addToActiveTargets(key);
        tmodel.removeFromUpdatingTargets(key);        
    }
    
    if (tmodel.isTargetUpdating(key)) {
        tapp.manager.scheduleRun(stepInterval, tmodel.oid + "---" + key + "-" + step + "/" + steps + "-" + cycle + "-" + stepInterval);  
    } else {    
        tapp.manager.scheduleRun(0, tmodel.oid + "---" + key + "-" + step + "/" + steps + "-" + cycle + "-" + stepInterval);  
    }

};

export { TargetManager };
