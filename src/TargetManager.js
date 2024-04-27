import { browser } from "./Browser.js";
import { TUtil, EasingEffects } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { tapp } from "./App.js";

function TargetManager() {
    this.doneTargets = [];
}

TargetManager.prototype.setTargetValuesWithKeys = function(tmodel, keys, force) {
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (tmodel.targetValues[key] && tmodel.getCallingTargetKey(key) === key) {
            this.setTargetValue(tmodel, key, force);
        }
    }
};

TargetManager.prototype.setTargetValues = function(tmodel) {
         
    var activeKeys = Object.keys(tmodel.activeTargetKeyMap);
    
    if (tmodel.targets !== tmodel.actualValues.targets) {
        tmodel.actualValues.targets =  tmodel.targets;
        Object.keys(tmodel.targets).forEach(function(key) {
            if (activeKeys.indexOf(key) === -1) {
                activeKeys.push(key);
            }
        });
    }
                    
    tmodel.targetUpdatingMap = {};
    tmodel.targetUpdatingList = [];
                    
    for (var i = 0; i < activeKeys.length; i++) {
       
        var key = activeKeys[i];
                                
        if (tmodel.targetUpdatingMap[key]) {
            continue;
        }   
        
        if (tmodel.isTargetUpdating(key) && tmodel.getCallingTargetKey(key) !== key) {  
            tmodel.targetUpdatingMap[key] = true;
            tmodel.targetUpdatingList.push(key); 
            continue;
        }
        
        var result = this.setTargetValue(tmodel, key);

        if (result) {
            tmodel.targetUpdatingMap[key] = true;
            tmodel.targetUpdatingList.push(key);  
        } else if (tmodel.isTargetDone(key) && !tmodel.isTargetComplete(key)) {            
            this.doneTargets.push({ tmodel: tmodel, key: key });
        }
    }

    if (tmodel.getParent() && tmodel.targetUpdatingList.length === 0) {
        tmodel.getParent().removeUpdatingChild(tmodel);
    }
};

TargetManager.prototype.setTargetValue = function(tmodel, key, force) {
    var target = tmodel.targets[key];
    
    if (!TUtil.isDefined(target)) {
        delete tmodel.activeTargetKeyMap[key];        
        return;
    }

    if (tmodel.isTargetUpdating(key) || !tmodel.targetValues[key] || tmodel.isTargetInLoop(key) || !tmodel.hasTargetGotExecuted(key) || force) {

        if (tmodel.isTargetEnabled(key)) {

            var valueOnly = target ? !!target.valueOnly : false;

            if (!TUtil.isDefined(tmodel.getActualTimeStamp(key))) {
                var cycle = tmodel.getTargetCycle(key);
                var valueArray = TargetUtil.getValueStepsCycles(tmodel, target, cycle, valueOnly, key);               
                TargetUtil.assignValueArray(tmodel, key, valueArray);
            }

            if (tmodel.isTargetInLoop(key) 
                    || !tmodel.isTargetDone(key) 
                    || !tmodel.isTargetComplete(key) 
                    || TUtil.isDefined(tmodel.getActualTimeStamp(key))
                    || !tmodel.hasTargetGotExecuted(key)) {
                tmodel.activeTargetKeyMap[key] = true;
            } else if (tmodel.activeTargetKeyMap[key]) {
                delete tmodel.activeTargetKeyMap[key];
            }
            
            if (TUtil.isDefined(tmodel.getActualTimeStamp(key))) {
                var schedulePeriod = TargetUtil.getActualSchedulePeriod(tmodel, key, tmodel.getTargetStepInterval(key)); 
                if (schedulePeriod > 0) {
                    tapp.manager.scheduleRun(schedulePeriod, "actualInterval__" + tmodel.oid + "__" + key); 
                }
            }
            
            return (!tmodel.isTargetDone(key) && !tmodel.isTargetComplete(key)) || !tmodel.doesTargetEqualActual(key);
        } else {
            tmodel.activeTargetKeyMap[key] = true;
        }
    } else if (tmodel.activeTargetKeyMap[key]) {
        delete tmodel.activeTargetKeyMap[key];
    }
    
};

TargetManager.prototype.setActualValues = function(tmodel)  { 
    var i;
    var target;
    var key, keys = [];
                                
    for (i = 0; i < tmodel.targetUpdatingList.length; i++) {
        key = tmodel.targetUpdatingList[i];
                
        target = tmodel.targets[key];
        var status = tmodel.getTargetStatus(key);
               
        if (tmodel.isTargetUpdating(key)) {
            keys.push(key);
        }
        
        if (status !== tmodel.getTargetStatus(key)) {
            tapp.manager.scheduleRun(1, tmodel.oid + "-" + key + '-statusChange');            
        }
    }
             
    for (i = 0; i < keys.length; i++) {
        key = keys[i];
        
        var schedulePeriod = TargetUtil.getActualSchedulePeriod(tmodel, key, tmodel.getTargetStepInterval(key));
        if (schedulePeriod === 0 || !TUtil.isDefined(schedulePeriod)) {
            this.setActualValue(tmodel, key);            
        } else {            
            tapp.manager.scheduleRun(schedulePeriod, "actualInterval__" + tmodel.oid + "__" + key);  
        }
    }
     
};

TargetManager.prototype.setJustActualValue = function(tmodel, key)  {
    
     var target = tmodel.targets[key];

    if (!tmodel.targetValues[key] || (target && typeof target.enabledOn === 'function' && !target.enabledOn.call(tmodel, key))) {
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
    var cycleUpdate = false;
    var stepInterval = tmodel.getTargetStepInterval(key);  
    var lastUpdate = tmodel.getActualValueLastUpdate(key);
    var oldValue = tmodel.actualValues[key], oldStep = step, oldCycle = cycle;
    var now = browser.now();
       
    if (step < steps) { 
        if (!TUtil.isDefined(tmodel.getLastActualValue(key))) {
            tmodel.setLastActualValue(key, tmodel.actualValues[key]);
        }
        tmodel.actualValues[key] = typeof targetValue  === 'number' ? targetValue * easingStep + tmodel.getLastActualValue(key) * (1 - easingStep) : targetValue;
       
        tmodel.setActualValueLastUpdate(key);
        tmodel.setActualValueLastUpdate(key);
        
        var stepIncrease = 1;
        if (!TUtil.isDefined(stepInterval) && false) {
            var expectedStepInterval = 10;
            stepIncrease = step > 0 && lastUpdate && tapp.throttle === 0 && expectedStepInterval > 0 ? Math.max(1, Math.floor((now - lastUpdate) / expectedStepInterval)) : 1;
        }
                 
        step = tmodel.setTargetStep(key, step + stepIncrease);         
    } 

    if (step >= steps) {        
        tmodel.actualValues[key] = targetValue;
        tmodel.setActualValueLastUpdate(key);
                
        if (typeof tmodel.targets[key] === 'object' && typeof tmodel.targets[key].onStepsEnd === 'function') {
            tmodel.targets[key].onStepsEnd.call(tmodel, key, cycle);
        }
        
        tmodel.updateTargetStatus(key);        

        if (tmodel.getTargetCycle(key) < tmodel.getTargetCycles(key)) {
            tmodel.setTargetCycle(key, tmodel.getTargetCycle(key) + 1);

            cycleUpdate = true;
            tmodel.resetTargetStep(key);
            tmodel.resetLastActualValue(key);
        }
                
    }
    
    TargetUtil.handleValueChange(tmodel, key, tmodel.actualValues[key], oldValue, oldStep, oldCycle);

    if (TUtil.isDefined(tmodel.getActualTimeStamp(key)))  {
        tmodel.resetActualTimeStamp(key); 
    }
       
    if (step < steps || cycleUpdate) {
        tapp.manager.scheduleRun(step < steps ? stepInterval : 0, tmodel.oid + "---" + key + "-" + step + "/" + steps + "-" + cycle + "-" + stepInterval);
    }            
};

export { TargetManager };
