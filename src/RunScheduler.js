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
        this.rerunQueue = [];
        this.isRunningRerun = false;        
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
        this.rerunQueue = [];
        this.isRunningRerun = false;          
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
        
        TargetExecutor.needsRerun = false;
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
            TUtil.log(true)(`Request from: ${runId} delay: ${delay} ${this.domProcessing}`);
        }
                
        if (this.domProcessing === 0) {
            this.addToRerunQueue();
        }
    }
    
    addToRerunQueue() {
        this.runningFlag = false;
        
        if (this.rerunQueue.length > 0) {
            return;
        }
        
        if (this.rerunId) {
            this.rerunQueue.push(this.rerunId);
        } else if (getEvents().eventQueue.length > 0) {
            this.rerunQueue.push(`events-${getEvents().eventQueue.length}`);
        } else if (TargetExecutor.needsRerun) {
            this.rerunQueue.push(`targetExecutor-needsRerun}`);
        }
        
        if (this.rerunQueue.length > 0 && !this.isRunningRerun) {
            this.processRerunQueue();
        }        
    }
    
    processRerunQueue() {
        this.isRunningRerun = true;

        while (this.rerunQueue.length > 0) {
            const nextRunId = this.rerunQueue.shift();
            this.run(0, nextRunId);
        }

        this.isRunningRerun = false;
    }
    
    domOperations(runningStep) {
        this.domProcessing = 1;
                
        if (runningStep === 5) {
            this.domFixStyles();
        } else {
            Promise.all(RunScheduler.steps.filter((_, index) => index >= runningStep).map(step => Promise.resolve().then(step)))
            .then(() => {
                if (getManager().lists.restyle.length) {
                    this.domFixStyles();            
                } else {
                    this.domProcessing = 0;    
                    this.addToRerunQueue();
                }
            });            
        }
    }
    
    domFixStyles() {
        this.domProcessing = 2;    
        requestAnimationFrame(() => {            
            getManager().fixStyles();
            this.domProcessing = 0;
            this.addToRerunQueue();
        });          
    }

    setDelayProcess(runId, insertTime, runTime, delay) {
        this.delayProcess = {
            runId,
            insertTime,
            runTime: runTime,
            delay,
            timeoutId: setTimeout(() => {
                this.run(delay, runId);
                const nextRun = this.nextRuns.length > 0 ? this.nextRuns.shift() : undefined;
                if (nextRun) {
                    const now = TUtil.now();
                    const newDelay = Math.max(0, nextRun.delay - (now - nextRun.insertTime));
                    this.setDelayProcess(nextRun.runId, nextRun.insertTime, now + newDelay, newDelay);
                } else {
                    this.delayProcess = undefined;
                }
            }, delay)
        };
    }

    delayRun(delay, runId) {
        const insertTime = TUtil.now();
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

    insertRun(runId, now, delay) {
        let low = 0, high = this.nextRuns.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            const nextRunDelay = this.nextRuns[mid].delay;
            const diff = nextRunDelay - delay;
            if (diff > 0) {
                high = mid;
            } else if (diff < 0) {
                low = mid + 1;                
            } else {   
                return;
            }
        }
             
        this.nextRuns.splice(low, 0, { runId, insertTime: now, delay }); 
    }
}

export { RunScheduler };
