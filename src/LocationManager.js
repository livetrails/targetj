import { BracketGenerator } from "./BracketGenerator.js";
import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { TargetExecutor } from "./TargetExecutor.js";
import { tApp, getEvents, getScreenWidth, getScreenHeight } from "./App.js";
import { browser } from "./Browser.js";

class LocationManager {
    constructor() {
        this.hasLocationList = [];
        this.hasLocationMap = {};

        this.locationList = [];

        this.screenWidth = getScreenWidth();
        this.screenHeight = getScreenHeight();
        this.resizeFlag = false;
    }

    calculateAll() {
        this.hasLocationList.length = 0;
        this.hasLocationMap = {};
        this.locationList.length = 0;
        this.startTime = browser.now();
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

            const preX = child.domValues.x;
            const preY = child.domValues.y;

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

            if (preX !== child.getX() || preY !== child.getY()) {
                child.addToStyleTargetList('transform');
            }

            child.calculateAbsolutePosition(child.getX(), child.getY());
            viewport.isVisible(child);
            child.addToParentVisibleList();

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
            this.locationList.push(`${child.oid}-${child.updatingTargetList.length}-${browser.now() - this.startTime}`);
        }
    }

    calculateTargets(tmodel) {
        this.activateTargetsOnEvents(tmodel);
        tApp.targetManager.applyTargetValues(tmodel);
        tApp.targetManager.setActualValues(tmodel);

        if (tmodel.hasDom()) {
            const preWidth = tmodel.getWidth();
            const preHeight = tmodel.getHeight();

            if (
                (!TUtil.isDefined(tmodel.targetValues.width) && !TUtil.isDefined(tmodel.targets.width) && !TUtil.isDefined(tmodel.targetValues.contentWidth)) ||
                tmodel.getTargetValue('widthFromDom')
            ) {
                TargetUtil.setWidthFromDom(tmodel);
            }
            if (
                (!TUtil.isDefined(tmodel.targetValues.height) && !TUtil.isDefined(tmodel.targets.height) && !TUtil.isDefined(tmodel.targetValues.contentHeight)) ||
                tmodel.getTargetValue('heightFromDom')
            ) {
                TargetUtil.setHeightFromDom(tmodel);
            }

            if (preWidth !== tmodel.getWidth() || preHeight !== tmodel.getHeight()) {
                tmodel.addToStyleTargetList('dim');
            }
        }
    }

    activateTargetsOnEvents(tmodel) {
        let activateTargets = [];

        if (this.resizeFlag && tmodel.targets['onResize']) {
            activateTargets = activateTargets.concat(tmodel.targets['onResize']);
        }

        if (getEvents().isTouchHandler(tmodel) && tmodel.targets['onTouchEvent']) {
            activateTargets = activateTargets.concat(tmodel.targets['onTouchEvent']);
        }

        if (getEvents().isClickHandler(tmodel) && tmodel.targets['onClickEvent']) {
            activateTargets = activateTargets.concat(tmodel.targets['onClickEvent']);
        }

        if ((getEvents().isScrollLeftHandler(tmodel) && getEvents().deltaX()) || (getEvents().isScrollTopHandler(tmodel) && getEvents().deltaY())) {
            if (tmodel.targets['onScrollEvent']) {
                activateTargets = activateTargets.concat(tmodel.targets['onScrollEvent']);
            }
        }

        if (getEvents().currentKey && tmodel.targets['onKeyEvent']) {
            activateTargets = activateTargets.concat(tmodel.targets['onKeyEvent']);
        }

        activateTargets.forEach(target => {
            const key = typeof target === 'object' ? target.key : target;
            const obj = typeof target === 'object' && target.tmodel ? target.tmodel : tmodel;

            if (obj.targets[key] && (obj.isTargetComplete(key) || obj.getTargetStatus(key) === '')) {
                obj.activateTarget(key);
            }
        });
    }

    addToLocationList(child) {
        this.hasLocationList.push(child);
        this.hasLocationMap[child.oid] = child;
    }
}

export { LocationManager };
