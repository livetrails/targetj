import { TUtil } from "./TUtil.js";
import { tApp, getEvents, getManager, getLocationManager } from "./App.js";
import { TargetExecutor } from "./TargetExecutor.js";

/**
 *  It is responsible for scheduling and managing the execution of TargetJ process cycle. 
 *  It tracks execution timing and maintains statistics for each cycle.
 */

class RunScheduler {
    static steps = [
        () => getManager().createDoms(),
        () => getManager().reattachTModels(),
        () => getManager().relocateTModels(),
        () => getManager().renderTModels(),
        () => getManager().fixAsyncStyles(),
        () => {
            if (getManager().lists.invisibleDom.length > 0) {
                getManager().deleteDoms();
            }
        }
    ];
    
    constructor() {
        this.nextRuns = [];
        this.domProcessing = 0;
        this.runningFlag = false;
        this.runId = '';
        this.runStartTime = undefined;
        this.rerunId = '';
        this.delayProcess = undefined;
        this.resetting = false;
    }
   
    async resetRuns() { 
        this.resetting = true;
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        if (this.delayProcess?.timeoutId) {
            clearTimeout(this.delayProcess.timeoutId);
        }
        
        this.nextRuns = [];
        this.domProcessing = 0;        
        this.runningFlag = false;
        this.runId = '';
        this.runStartTime = undefined;        
        this.rerunId = '';
        this.delayProcess = undefined;
        this.resetting = false;
    }
    
    schedule(delay, runId) {
        if (!tApp.isRunning() || this.resetting || (delay === 0 && this.rerunId)) {
            return;
        }
                
        if (delay === 0 && tApp.throttle === 0) {
            this.run(delay, runId);
        } else {
            this.delayRun(tApp.throttle === 0 ? delay || 0 : tApp.throttle, runId);
        }
    }

    run(delay, runId) {
        if (!tApp.isRunning() || this.resetting) {
            return;
        }
                
        if (this.runningFlag) {
            if (!this.rerunId) {
                this.rerunId = `rerun ${runId}`;
            }
            return;
        }
        
        this.rerunId = '';      
        this.runId = runId;
        this.runningFlag = true;
        this.runStartTime = TUtil.now();
        
        getEvents().captureEvents();
        
        if (getManager().doneTargets.length > 0) {
            getManager().completeDoneTModels();
            getManager().doneTargets.length = 0;
        }
        
        tApp.targetManager.applyTargetValues(tApp.tRoot);            
        getLocationManager().calculateAll();      
        getLocationManager().calculateActivated();    
        tApp.events.resetEventsOnTimeout();
                
        const runningStep = tApp.manager.analyze();
                
        if (runningStep >= 0) {
            if (this.domProcessing === 0) {
                this.domOperations(runningStep);
            } else if (!this.rerunId) {
                this.rerunId = `domrun ${runId}`; 
            }
        }

        if (tApp.debugLevel === 1) {
            TUtil.log(true)(`Request from: ${runId} dly: ${delay} step:${runningStep} dom:${this.domProcessing} runs:${this.nextRuns.length} D:${this.delayProcess?.delay}`);
        }
                
        if (this.domProcessing === 0) {
            this.needsRerun();
        }
    }
    
    needsRerun() {
        this.runningFlag = false;

        if (this.rerunId) {
            this.schedule(1, `rerun-${this.rerunId}`); 
        } else {
            const newDelay = this.nextRuns.length > 0 ? this.nextRuns[0].delay - (TUtil.now() - this.nextRuns[0].insertTime) : 15;

            if (newDelay >= 15) {
                if (getEvents().eventQueue.length > 0) {
                    this.schedule(15, `events-${getEvents().eventQueue.length}`);                
                } else if (TargetExecutor.needsRerun) {
                    TargetExecutor.needsRerun = false;
                    this.schedule(15, 'targetExecutor-needsRerun');
                }
            }
        }   
    }
    
    doesExecuterNeedsRerun() {
        return TargetExecutor.needsRerun;
    }
    
    domOperations(runningStep) {
        this.domProcessing = 1;
                
        if (runningStep === 10) {
            this.domFixStyles();
        } else {
            Promise.all(RunScheduler.steps.filter((_, index) => index >= runningStep).map(step => Promise.resolve().then(step)))
            .then(() => {
                if (getManager().lists.restyle.length) {
                    this.domFixStyles();            
                } else {
                    this.domProcessing = 0;    
                    this.needsRerun();
                }
            });            
        }
    }
    
    domFixStyles() {
        this.domProcessing = 2;    
        requestAnimationFrame(() => {            
            getManager().fixStyles();
            this.domProcessing = 0;
            this.needsRerun();
        });          
    }

    setDelayProcess(runId, insertTime, runTime, delay) {
        if (delay > 0) {
            this.delayProcess = {
                runId,
                insertTime,
                runTime: runTime,
                delay,
                timeoutId: setTimeout(() => {
                    this.run(delay, runId);
                    this.executeNextRun();
                }, delay)
            };
        } else {
            this.delayProcess = {
                runId,
                insertTime,
                runTime: runTime,
                delay: 0
            };
                               
            this.run(delay, runId);
            this.executeNextRun();            
        }
    }
    
    executeNextRun() {
        const nextRun = this.nextRuns.length > 0 ? this.nextRuns.shift() : undefined;
        if (nextRun) {
            const now = TUtil.now();
            const newDelay = nextRun.delay - (now - nextRun.insertTime);
            this.setDelayProcess(nextRun.runId, nextRun.insertTime, now + newDelay, newDelay);
        } else {
            this.delayProcess = undefined;
        }        
    }

    delayRun(delay, runId) {
        const insertTime = this.runStartTime;        
        const runTime = insertTime + delay;

        if (!this.delayProcess) {
            this.setDelayProcess(runId, insertTime, runTime, delay);
        } else if (this.delayProcess.timeoutId && runTime < this.delayProcess.runTime) {
            clearTimeout(this.delayProcess.timeoutId);

            this.insertRun(this.delayProcess.runId, this.delayProcess.insertTime, this.delayProcess.delay);
            
            this.setDelayProcess(runId, insertTime, runTime,  delay);
        } else {
            this.insertRun(runId, insertTime, delay);
        }
    }

    insertRun(newRunId, newInsertTime, newDelay) {
        let low = 0, high = this.nextRuns.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            const delay = this.nextRuns[mid].delay;
            const insertTime = this.nextRuns[mid].insertTime;
            const diff = (insertTime + delay) - (newInsertTime + newDelay);
            if (diff > 0) {
                high = mid;
            } else if (diff < 0) {
                low = mid + 1;                
            } else {   
                return;
            }
        }
             
        this.nextRuns.splice(low, 0, { runId: newRunId, insertTime: newInsertTime, delay: newDelay }); 
    }
}

export { RunScheduler };
