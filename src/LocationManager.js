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

    calculateContainer(container, shouldCalculateChildTargets = true) {
        const allChildren = this.getChildren(container);
        const viewport = container.createViewport();
        container.visibleChildren.length = 0;
                        
        const visibleChildrenLength = container.visibleChildren.length;  
        const childrenLength = container.getChildren().length;
        const length = allChildren.length;
        let i = 0;        

        while (i < length) {
            const child = allChildren[i++];
            if (!child) {
                continue;
            }
            
            viewport.setCurrentChild(child);
            viewport.setLocation();  
            
            if (container.manageChildTargetExecution(child, shouldCalculateChildTargets)) {
                this.calculateTargets(child);
            }

            child.overflowingFlag = false;
            if (container.getContainerOverflowMode() === 'always' 
                    || child.getItemOverflowMode() === 'always' 
                    || (container.getContainerOverflowMode() === 'auto' && child.getItemOverflowMode() === 'auto' && viewport.isOverflow())) {
                child.overflowingFlag = true;
                viewport.overflow();
                viewport.setLocation();  
            }
            
            if (child.isIncluded() && !this.hasLocationMap[child.oid]) {
                this.addToLocationList(child);
            }
            
            if (child.isTargetEnabled('x') && !child.isTargetUpdating('x') && !child.isTargetImperative('x')) {
                TargetExecutor.executeDeclarativeTarget(child, 'x');
            } else if (!TUtil.isDefined(child.targetValues.x)) {
                child.val('x', child.x);
            }

            if (child.isTargetEnabled('y') && !child.isTargetUpdating('y') && !child.isTargetImperative('y')) {
                TargetExecutor.executeDeclarativeTarget(child, 'y');
            } else if (!TUtil.isDefined(child.targetValues.y)) {
                child.val('y', child.y);
            }

            child.addToStyleTargetList('x');
            child.addToStyleTargetList('y');                
                    
            child.calcAbsolutePosition(child.getX(), child.getY());
            
            const isVisible = child.isVisible();
            
            TUtil.isDefined(child.targets.isVisible) 
                ? TargetExecutor.executeDeclarativeTarget(child, 'isVisible') 
                : child.calcVisibility();
                
            child.isNowVisible = isVisible === false && child.isVisible();
            
            child.addToParentVisibleChildren();
           
            if (child.shouldCalculateChildren()) {
                this.calculateContainer(child, shouldCalculateChildTargets && container.shouldCalculateChildTargets() !== false);
            }
            
            if (child.isInFlow()) {
                const _contentWidth = container.getContentWidth();
                const _contentHeight = container.getContentHeight();
                if (TUtil.isNumber(child.val('appendNewLine'))) {
                    viewport.appendNewLine();
                    container.calcContentWidthHeight();
                } else {
                    container.calcContentWidthHeight();
                    viewport.nextLocation();
                }
                
                if (_contentWidth !== container.getContentWidth() || _contentHeight !== container.getContentHeight()) {
                    this.activateTargets(container, container.targets['onContentResize']);
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
        
        if ((visibleChildrenLength !== container.visibleChildren.length || container.visibleChildren.length  === 0) && container.targets['onVisibleChildrenChange']) {
            this.activateTargets(container, container.targets['onVisibleChildrenChange']);
        }
        
        if (childrenLength !== container.getChildren().length && container.targets['onChildrenChange']) {
            this.activateTargets(container, container.targets['onChildrenChange']); 
        }        
    }

    calculateTargets(tmodel) {
        const childrenLength = tmodel.getChildren().length;
        this.activateTargetsOnEvents(tmodel);
        tApp.targetManager.applyTargetValues(tmodel);
        tApp.targetManager.setActualValues(tmodel);

        if (tmodel.getChildren().length === 0 && childrenLength > 0 && tmodel.targets['onChildrenChange']) {
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

            if (preWidth !== tmodel.getWidth() || !TUtil.isDefined(tmodel.styleMap['width'])) {
                tmodel.addToStyleTargetList('width');
            }
            
            if (preHeight !== tmodel.getHeight() || !TUtil.isDefined(tmodel.styleMap['height'])) {
                tmodel.addToStyleTargetList('height');                
            }
        }
        
        tmodel.isNowVisible = false;
        tmodel.targetExecutionCount++;
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
                        this.activateSingleTarget(tmodel, target);                           
                    });
                }
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
