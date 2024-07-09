import { browser } from "./Browser.js";
import { TUtil, EasingEffects } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { tapp } from "./App.js";

function TargetManager() {
    this.doneTargets = [];
}

TargetManager.prototype.setTargetValues = function(tmodel, activeKeys) {
        tmodel.targetUpdatingMap = {};
        tmodel.targetUpdatingList = [];
        tmodel.targetMethodMap = {};

    for (var i = 0; i < activeKeys.length; i++) {
        var key = activeKeys[i];
                                  
        if (tmodel.targetUpdatingMap[key]) {            
            continue;
        } 
        
        if (tmodel.isTargetImperative(key)) {
            tmodel.setTargetMethodName(key, 'value');
            
            if (tmodel.isTargetUpdating(key)) {
                tmodel.targetUpdatingMap[key] = true;
                tmodel.targetUpdatingList.push(key);
                continue;
            }
        }
        
        if (tmodel.isTargetDone(key)) {
            this.doneTargets.push({ tmodel: tmodel, key: key });
        } else if (tmodel.isTargetComplete(key)) {
            delete tmodel.activeTargetMap[key];
        } else {
            this.setTargetValue(tmodel, key);
            tmodel.updateTargetStatus(key);

            if (tmodel.isTargetUpdating(key)) {
                tmodel.targetUpdatingMap[key] = true;
                tmodel.targetUpdatingList.push(key);
            }
        }
       
    }

    if (tmodel.getParent() && tmodel.targetUpdatingList.length === 0) {
        tmodel.getParent().removeUpdatingChild(tmodel);
    }
};

TargetManager.prototype.setTargetValue = function(tmodel, key) {
    var target = tmodel.targets[key];
    
    if (!TUtil.isDefined(target)) {
        delete tmodel.activeTargetMap[key];        
        return;
    }

    if (tmodel.isTargetEnabled(key)) {
        if (tmodel.getScheduleTimeStamp(key) && tmodel.isTargetActive(key) && tmodel.getTargetStepInterval(key) > 0
                && tmodel.getScheduleTimeStamp(key) + tmodel.getTargetStepInterval(key) <= TargetJ.browser.now()) {
            tmodel.resetScheduleTimeStamp(key);
        }
        
        if (!TUtil.isDefined(tmodel.getScheduleTimeStamp(key))) {
            var newChange = TargetUtil.assignValueArray(tmodel, key);
            if (!newChange) {
                tmodel.targetValues[key].executionCount++;
            }
            tmodel.setTargetMethodName(key, 'value');
        }
                    
        var schedulePeriod = TargetUtil.scheduleExecution(tmodel, key);
        if (schedulePeriod > 0) {
            tapp.manager.scheduleRun(schedulePeriod, "actualInterval__" + tmodel.oid + "__" + key); 
        }
    } else {
        tmodel.setTargetMethodName(key, 'enabledOn');
    }
};

TargetManager.prototype.setActualValues = function(tmodel, keyList)  { 
    var i, key; 
    keyList = !keyList ? tmodel.targetUpdatingList : keyList;
    var length = keyList.length;
    
    for (i = 0; i < length; i++) {
        key = keyList[i];
         
        var schedulePeriod = TargetUtil.scheduleExecution(tmodel, key);
        if (schedulePeriod === 0) {
            this.setActualValue(tmodel, key);            
        } else { 
            tapp.manager.scheduleRun(schedulePeriod, "actualInterval__" + tmodel.oid + "__" + key);  
        }
    }
     
};

TargetManager.prototype.setJustActualValue = function(tmodel, key)  {
    
    if (!tmodel.targetUpdatingList[key]) {
        return false;
    }
    
    var targetValue = tmodel.getTargetValue(key);
   
    var step = tmodel.getTargetStep(key);
    var easing = TUtil.isDefined(tmodel.getTargetEasing(key)) ? tmodel.getTargetEasing(key) : EasingEffects.linear;
    var steps = tmodel.getTargetSteps(key);
    var easingStep = easing(tmodel.getTargetStepPercent(key, step)); 
    
    if (step < steps) {
        if (!TUtil.isDefined(tmodel.getLastActualValue(key))) {
            tmodel.setLastActualValue(key, tmodel.actualValues[key]);
        }
        tmodel.actualValues[key] = typeof targetValue  === 'number' ? targetValue * easingStep + tmodel.getLastActualValue(key) * (1 - easingStep) : targetValue;
    } else {          
        tmodel.actualValues[key] = targetValue;
    } 
};

TargetManager.prototype.setActualValue = function(tmodel, key) {
    
    if (!tmodel.targetValues[key]) return false;
    
    var targetValue = tmodel.getTargetValue(key);
    var step = tmodel.getTargetStep(key);
    var steps = tmodel.getTargetSteps(key);
    var easing = TUtil.isDefined(tmodel.getTargetEasing(key)) ? tmodel.getTargetEasing(key) : EasingEffects.linear;
    var cycle = tmodel.getTargetCycle(key);
    var easingStep = easing(tmodel.getTargetStepPercent(key, step)); 
    var stepInterval = tmodel.getTargetStepInterval(key) || 0;  
    var oldValue = tmodel.actualValues[key], oldStep = step, oldCycle = cycle;
          
    if (step < steps) { 
        if (!TUtil.isDefined(tmodel.getLastActualValue(key))) {
            tmodel.setLastActualValue(key, tmodel.actualValues[key]);
        }
        tmodel.actualValues[key] = typeof targetValue  === 'number' ? targetValue * easingStep + tmodel.getLastActualValue(key) * (1 - easingStep) : targetValue;
       
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

            tmodel.resetTargetStep(key);
            tmodel.resetLastActualValue(key);
        }        
    }
    
    TargetUtil.handleValueChange(tmodel, key, tmodel.actualValues[key], oldValue, oldStep, oldCycle);

    tmodel.resetScheduleTimeStamp(key);
    tmodel.updateTargetStatus(key);

    tapp.manager.scheduleRun(stepInterval, tmodel.oid + "---" + key + "-" + step + "/" + steps + "-" + cycle + "-" + stepInterval);      
};

export { TargetManager };
