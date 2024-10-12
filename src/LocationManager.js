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
        const visibleChildrenCount = container.visibleChildren.length;
        container.visibleChildren.length = 0;
        
        let i = 0;
        const childrenLength = allChildren.length;

        while (i < childrenLength && tApp.isRunning()) {
            const child = allChildren[i++];
            if (!child) {
                continue;
            }

            this.calculateTargets(child);

            viewport.setCurrentChild(child);
            child.setLocation(viewport);
            child.calculateAbsolutePosition(child.x, child.y);

            if (viewport.isOverflow(child.getOuterOverflowWidth(), container.getInnerOverflowWidth())) {
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

            child.addToStyleTargetList('x');
            child.addToStyleTargetList('y');                

            child.calculateAbsolutePosition(child.getX(), child.getY());
            viewport.isVisible(child);
            child.addToParentVisibleChildren();
           
            if (child.shouldCalculateChildren()) {
                this.calculateContainer(child);
            }

            if (child.isInFlow()) {
                if (TUtil.isNumber(child.val('appendNewLine'))) {
                    viewport.appendNewLine();
                    container.calcContentWidthHeight();
                } else {
                    container.calcContentWidthHeight();
                    viewport.nextLocation();
                }
            }
            
            if (!TUtil.isDefined(child.targetValues.height) && !TUtil.isDefined(child.targets.heightFromDom) && child.getContentHeight() > 0) {
                const preVal = child.getHeight();
                child.val('height', child.getContentHeight());
                if (preVal !== child.getHeight()) {
                    child.addToStyleTargetList('height');
                }
            }

            if (!TUtil.isDefined(child.targetValues.width) && !TUtil.isDefined(child.targets.widthFromDom) && child.getContentWidth() > 0) {
                const preVal = child.getWidth();
                child.val('width', child.getContentWidth());
                if (preVal !== child.getWidth()) {
                    child.addToStyleTargetList('width');
                }
            }
            
            container.calcContentWidthHeight();
            this.locationListStats.push(`${child.oid}-${child.updatingTargetList.length}-${TUtil.now() - this.startTime}`);
        }
        
        if (visibleChildrenCount !== container.visibleChildren.length && container.targets['onVisibleChildrenChange']) {
            this.activateTargets(container, container.targets['onVisibleChildrenChange']);
        }        
        
    }

    calculateTargets(tmodel) {
        const childrenCount = tmodel.getChildren().length;
        this.activateTargetsOnEvents(tmodel);
        tApp.targetManager.applyTargetValues(tmodel);
        tApp.targetManager.setActualValues(tmodel);

        if (childrenCount !== tmodel.getChildren().length && tmodel.targets['onChildrenChange']) {
            this.activateTargets(tmodel, tmodel.targets['onChildrenChange']);
        }

        if (tmodel.hasDom()) {
            const preWidth = tmodel.getWidth();
            const preHeight = tmodel.getHeight();

            if ((!TUtil.isDefined(tmodel.targetValues.width) && !TUtil.isDefined(tmodel.targets.width) && !tmodel.hasChildren()) ||
                tmodel.getTargetValue('widthFromDom')
            ) {
                TargetUtil.setWidthFromDom(tmodel);
            }
            if ((!TUtil.isDefined(tmodel.targetValues.height) && !TUtil.isDefined(tmodel.targets.height) && !tmodel.hasChildren()) ||
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
        if (!Array.isArray(targetList)) {
            targetList = [targetList];
        }
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
