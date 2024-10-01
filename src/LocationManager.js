import { BracketGenerator } from "./BracketGenerator.js";
import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { TargetExecutor } from "./TargetExecutor.js";
import { tApp, getScreenWidth, getScreenHeight } from "./App.js";

/*
 * It calculates the locations and dimensions of all objects and triggers the calculation of all targets. 
 * It functions as an integral part of TargetJ process cycle, playing a crucial role."
 */
class LocationManager {
    constructor() {
        this.hasLocationList = [];
        this.hasLocationMap = {};

        this.locationListStats = [];
               
        this.screenWidth = getScreenWidth();
        this.screenHeight = getScreenHeight();
        this.resizeFlag = false;
    }

    calculateAll() {
        this.hasLocationList.length = 0;
        this.hasLocationMap = {};
        this.locationListStats.length = 0;
        this.startTime = TUtil.now();
        this.resizeFlag = false;

        if (this.screenWidth !== getScreenWidth() || this.screenHeight !== getScreenHeight()) {
            this.resizeFlag = true;
            this.screenWidth = getScreenWidth();
            this.screenHeight = getScreenHeight();
        }

        this.calculate();
    }

    calculate() {
        this.addToLocationList(tApp.tRoot);
        this.calculateContainer(tApp.tRoot);
    }

    getChildren(container) {
        if (container.shouldBeBracketed()) {
            return BracketGenerator.generate(container);
        }
        
        if (BracketGenerator.bracketMap[container.oid]) {
            delete BracketGenerator.bracketMap[container.oid];            
        }
        
        return container.getChildren();
    }

    calculateContainer(container) {
        const allChildren = this.getChildren(container);
        const viewport = container.createViewport();
        const inFlowVisibleCount = container.inFlowVisibles.length;
        container.inFlowVisibles.length = 0;

        let i = 0;
        const length = allChildren.length;

        while (i < length && tApp.isRunning()) {
            const child = allChildren[i++];
            if (!child) {
                continue;
            }

            let outerXEast;
            let innerXEast;

            const preX = child.getX();
            const preY = child.getY();

            this.calculateTargets(child);

            viewport.setCurrentChild(child);
            child.setLocation(viewport);
            child.calculateAbsolutePosition(child.x, child.y);

            innerXEast = TUtil.isDefined(container.val('innerXEast')) ? container.val('innerXEast') : container.getInnerXEast();
            outerXEast = TUtil.isDefined(child.val('outerXEast')) ? child.val('outerXEast') : child.getOuterXEast();

            if (viewport.isOverflow(outerXEast, innerXEast)) {
                viewport.overflow();
                child.setLocation(viewport);
            } else {
                child.setLocation(viewport);
            }

            if (child.isIncluded() && !this.hasLocationMap[child.oid]) {
                this.addToLocationList(child);
            }
            
            if (child.isTargetEnabled('x') && !child.isTargetUpdating('x') && !child.isTargetImperative('x') && child.getTargetSteps('x') === 0) {
                TargetExecutor.resolveTargetValue(child, 'x');
                TargetExecutor.snapActualToTarget(child, 'x');
            } else if (!TUtil.isDefined(child.targetValues.x)) {
                child.val('x', child.x);
            }

            if (child.isTargetEnabled('y') && !child.isTargetUpdating('y') && !child.isTargetImperative('y') && child.getTargetSteps('y') === 0) {
                TargetExecutor.resolveTargetValue(child, 'y');
                TargetExecutor.snapActualToTarget(child, 'y');
            } else if (!TUtil.isDefined(child.targetValues.y)) {
                child.val('y', child.y);
            }

            if (preX !== child.getX()) {
                child.addToStyleTargetList('x');
            }
            
            if (preY !== child.getY()) {
                child.addToStyleTargetList('y');                
            }

            child.calculateAbsolutePosition(child.getX(), child.getY());
            viewport.isVisible(child);
            container.addToVisibleList(child);

            if (child.shouldCalculateChildren()) {
                this.calculateContainer(child);
            }

            if (child.isInFlow()) {
                if (TUtil.isNumber(child.val('appendNewLine'))) {
                    viewport.appendNewLine();
                    viewport.calcContentWidthHeight();
                } else {
                    viewport.calcContentWidthHeight();
                    viewport.nextLocation();
                }
            }

            if (Array.isArray(child.val('contentHeight'))) {
                child.val('contentHeight').forEach(key => {
                    const preVal = child.val(key);
                    child.val(key, child.getContentHeight());
                    if (preVal !== child.val(key)) {
                        child.addToStyleTargetList(key);
                    }
                });
            }

            if (Array.isArray(child.val('contentWidth'))) {
                child.val('contentWidth').forEach(key => {
                    const preVal = child.val(key);
                    child.val(key, child.getContentWidth());
                    if (preVal !== child.val(key)) {
                        child.addToStyleTargetList(key);
                    }
                });
            }

            viewport.calcContentWidthHeight();
            this.locationListStats.push(`${child.oid}-${child.updatingTargetList.length}-${TUtil.now() - this.startTime}`);
        }
        
        console.log("inflow: " + container.oid + ", " + container.inFlowVisibles.length + ', ' + inFlowVisibleCount)
        
        
    }

    calculateTargets(tmodel) {
        const childrenCount = tmodel.getChildren().length;
        this.activateTargetsOnEvents(tmodel);
        tApp.targetManager.applyTargetValues(tmodel);
        tApp.targetManager.setActualValues(tmodel);

        if (childrenCount !== tmodel.getChildren().length && tmodel.targets['onChildrenUpdate']) {
            this.activateTargets(tmodel, Array.isArray(tmodel.targets['onChildrenUpdate']) ? tmodel.targets['onChildrenUpdate'] : [ tmodel.targets['onChildrenUpdate'] ]);
        }

        if (tmodel.hasDom()) {
            const preWidth = tmodel.getWidth();
            const preHeight = tmodel.getHeight();

            if ((!TUtil.isDefined(tmodel.targetValues.width) && !TUtil.isDefined(tmodel.targets.width) && !TUtil.isDefined(tmodel.targetValues.contentWidth)) ||
                tmodel.getTargetValue('widthFromDom')
            ) {
                TargetUtil.setWidthFromDom(tmodel);
            }
            if ((!TUtil.isDefined(tmodel.targetValues.height) && !TUtil.isDefined(tmodel.targets.height) && !TUtil.isDefined(tmodel.targetValues.contentHeight)) ||
                tmodel.getTargetValue('heightFromDom')
            ) {
                TargetUtil.setHeightFromDom(tmodel);
            }

            if (preWidth !== tmodel.getWidth()) {
                tmodel.addToStyleTargetList('width');
            }
            
            if (preHeight !== tmodel.getHeight()) {
                tmodel.addToStyleTargetList('height');                
            }
        }
    }

    activateTargetsOnEvents(tmodel) {
        let activateTargets = [];

        tmodel.eventTargets.forEach(target => {
            if (TargetUtil.targetConditionMap[target](tmodel)) {
                activateTargets = activateTargets.concat(tmodel.targets[target]);
            }
        });

        this.activateTargets(tmodel, activateTargets);
    }

    activateTargets(tmodel, targetList) {
        targetList.forEach(targetName => {
            if (typeof targetName === 'function') {
                let targets = targetName.call(tmodel);
                if (targets) {
                    targets = Array.isArray(targets) ? targets : [targets];
                    targets.forEach(target => {
                        if (typeof target === 'object') {
                            const { key, handler } = target;
                            this.activateSingleTarget(handler, key);
                        } else {
                            this.activateSingleTarget(tmodel, target);
                        }                        
                    });
                }
            } else if (typeof targetName === 'object') {
                const { key, handler } = targetName;
                this.activateSingleTarget(handler, key);
            } else {
                this.activateSingleTarget(tmodel, targetName);
            }
        });
    }

    activateSingleTarget(tmodel, targetName) {
        if (tmodel.targets[targetName]) {
            if (tmodel.isTargetEnabled(targetName)) {
                tmodel.activateTarget(targetName);
            } else {
                tmodel.addToActiveTargets(targetName);
            }
        }
    }

    addToLocationList(child) {
        this.hasLocationList.push(child);
        this.hasLocationMap[child.oid] = child;
    }
}

export { LocationManager };
