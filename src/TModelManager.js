import { $Dom } from "./$Dom.js";
import { browser } from "./Browser.js";
import { TUtil } from "./TUtil.js";
import { tApp } from "./App.js";

class TModelManager {
    constructor() {
        this.init();
    }

    init() {
        this.lists = {
            visible: [],
            rerender: [],
            restyle: [],
            reattach: [],
            invisibleDom: [],
            visibleNoDom: [],
            updatingTModels: [],
            updatingTargets: [],
            activeTargets: []
        };
        this.visibleTypeMap = {};
        this.visibleOidMap = {};
        this.targetMethodMap = {};

        this.doneTargets = [];

        this.nextRuns = [];
        this.runningStep = 0;
        this.runningFlag = false;
        this.rerunOid = '';
        this.cycleStats = {
            duration: 0,
            count: 0,
            totalDuration: 0,
            average: 0
        };
    }

    resetRuns() {
        this.nextRuns = [];
        this.runningStep = 0;
        this.runningFlag = false;
        this.rerunOid = '';
    }

    resetCycle() {
        this.cycleStats.duration = 0;
        this.cycleStats.count = 0;
        this.cycleStats.totalDuration = 0;
        this.cycleStats.average = 0;
    }

    clear() {
        this.lists.visible.length = 0;
        this.lists.rerender.length = 0;
        this.lists.restyle.length = 0;
        this.lists.reattach.length = 0;
        this.lists.visibleNoDom.length = 0;
        this.lists.updatingTModels.length = 0;
        this.lists.updatingTargets.length = 0;
        this.lists.activeTargets.length = 0;
        this.visibleTypeMap = {};
        this.visibleOidMap = {};
        this.targetMethodMap = {};
    }

    visibles(type) {
        return this.lists.visible
            .filter(tmodel => tmodel.type === type || !type)
            .map(tmodel => tmodel.oid);
    }

    findVisible(type) {
        return this.lists.visible.find(tmodel => tmodel.type === type);
    }

    findLastVisible(type) {
        return this.lists.visible.reverse().find(tmodel => tmodel.type === type);
    }

    analyze() {
        const lastVisibleMap = TUtil.list2map(this.lists.visible);
        this.clear();

        for (const tmodel of tApp.locationManager.hasLocationList) {
            const visible = tmodel.isVisible();

            if (visible) {
                lastVisibleMap[tmodel.oid] = null;

                if (tmodel.hasDom() && !tmodel.canHaveDom() && !this.lists.invisibleDom.includes(tmodel)) {
                    this.lists.invisibleDom.push(tmodel);
                }

                this.lists.visible.push(tmodel);
                this.needsRerender(tmodel);
                this.needsRestyle(tmodel);
                this.needsReattach(tmodel);

                if (tmodel.updatingTargetList.length > 0) {
                    this.lists.updatingTModels.push(tmodel);
                    this.lists.updatingTargets = [...this.lists.updatingTargets, ...tmodel.updatingTargetList];
                }

                const activeTargets = Object.keys(tmodel.activeTargetMap);
                if (activeTargets.length > 0) {
                    this.lists.activeTargets = [...this.lists.activeTargets, `'${tmodel.oid}'`, ...activeTargets];
                }

                if (Object.keys(tmodel.targetMethodMap).length > 0) {
                    this.targetMethodMap[tmodel.oid] = { ...tmodel.targetMethodMap };
                }

                this.visibleOidMap[tmodel.oid] = tmodel;
                if (!this.visibleTypeMap[tmodel.type]) {
                    this.visibleTypeMap[tmodel.type] = [];
                }
                this.visibleTypeMap[tmodel.type].push(tmodel);

                if (
                    tmodel.canHaveDom() &&
                    !tmodel.hasDom() &&
                    tmodel.getDomHolder() &&
                    tmodel.getDomHolder().exists() &&
                    !this.lists.visibleNoDom.includes(tmodel)
                ) {
                    this.lists.visibleNoDom.push(tmodel);
                }
            }
        }

        const lastVisible = Object.values(lastVisibleMap)
            .filter(tmodel => tmodel !== null && tmodel.hasDom() && tmodel.isDomDeletable());

        lastVisible.forEach(tmodel => {
            tApp.manager.lists.invisibleDom.push(tmodel);
        });
    }

    needsRerender(tmodel) {
        if (
            tmodel.hasDom() &&
            TUtil.isDefined(tmodel.getHtml()) &&
            (tmodel.$dom.html() !== tmodel.getHtml() || tmodel.$dom.textOnly !== tmodel.isTextOnly())
        ) {
            this.lists.rerender.push(tmodel);
            return true;
        }

        return false;
    }

    needsRestyle(tmodel) {
        if (tmodel.hasDom() && tmodel.styleTargetList.length > 0) {
            this.lists.restyle.push(tmodel);
            return true;
        }

        return false;
    }

    needsReattach(tmodel) {
        if (tmodel.hasDom() && tmodel.hasDomHolderChanged()) {
            this.lists.reattach.push(tmodel);
            return true;
        }

        return false;
    }

    renderTModels() {
        for (const tmodel of this.lists.rerender) {
            tmodel.isTextOnly() ? tmodel.$dom.text(tmodel.getHtml()) : tmodel.$dom.html(tmodel.getHtml());
            tmodel.setActualValueLastUpdate('html');
            tmodel.domHeight = undefined;
            tmodel.domWidth = undefined;
        }
    }

    reattachTModels() {
        for (const tmodel of this.lists.reattach) {
            tmodel.$dom.detach();
            tmodel.getDomHolder().appendTModel$Dom(tmodel);
        }
    }

    deleteDoms() {
        for (const tmodel of this.lists.invisibleDom) {
            tmodel.domValues = {};

            const activateTargets = [].concat(tmodel.targets['onInvisibleEvent'], tmodel.targets['onResize']);

            activateTargets?.forEach(key => {
                if (tmodel.targets[key] && tmodel.isTargetComplete(key)) {
                    tmodel.activateTarget(key);
                }
            });

            tmodel.$dom.detach();
            tmodel.$dom = null;
        }

        const rerun = this.lists.invisibleDom.length > 0;

        this.lists.invisibleDom.length = 0;

        if (rerun) {
            this.scheduleRun(0, "deleteDoms");
        }
    }

    fixStyles() {
        for (const tmodel of this.lists.restyle) {
            tmodel.styleTargetList.forEach(key => {
                switch (key) {
                    case 'transform': {
                        const x = Math.floor(tmodel.getX());
                        const y = Math.floor(tmodel.getY());
                        const rotate = Math.floor(tmodel.getRotate());
                        const scale = TUtil.formatNum(tmodel.getScale(), 2);

                        if (
                            tmodel.domValues.x !== x ||
                            tmodel.domValues.y !== y ||
                            tmodel.domValues.rotate !== rotate ||
                            tmodel.domValues.scale !== scale
                        ) {
                            tmodel.$dom.transform(x, y, rotate, scale);
                            tmodel.domValues.y = y;
                            tmodel.domValues.x = x;
                            tmodel.domValues.rotate = rotate;
                            tmodel.domValues.scale = scale;
                        }

                        break;
                    }
                    case 'dim': {
                        const width = Math.floor(tmodel.getWidth());
                        const height = Math.floor(tmodel.getHeight());

                        if (tmodel.$dom.width() !== width || tmodel.$dom.height() !== height) {
                            tmodel.$dom.width(width);
                            tmodel.$dom.height(height);
                        }
                        break;
                    }
                    case 'style': {
                        const style = tmodel.getStyle();
                        if (TUtil.isDefined(style) && tmodel.domValues.style !== style) {
                            tmodel.$dom.setStyleByMap(tmodel.getStyle());
                            tmodel.domValues.style = style;
                        }
                        break;
                    }
                    case 'css': {
                        const css = tmodel.getCss();
                        if (tmodel.$dom.css() !== css) {
                            tmodel.$dom.css(css);
                        }
                        break;
                    }
                    case 'borderRadius':
                    case 'padding':
                    case 'lineHeight':
                    case 'fontSize': {
                        if (TUtil.isDefined(tmodel.val(key)) && tmodel.domValues[key] !== tmodel.val(key)) {
                            tmodel.$dom.style(
                                key,
                                TUtil.isNumber(tmodel.val(key)) ? `${tmodel.val(key)}px` : tmodel.val(key)
                            );
                            tmodel.domValues[key] = tmodel.val(key);
                        }
                        break;
                    }
                    default:
                        if (TUtil.isDefined(tmodel.val(key)) && tmodel.domValues[key] !== tmodel.val(key)) {
                            tmodel.$dom.style(key, tmodel.val(key));
                            tmodel.domValues[key] = tmodel.val(key);
                        }
                }
            });

            tmodel.styleTargetMap = {};
            tmodel.styleTargetList.length = 0;
        }
    }

    completeDoneTModels() {
        tApp.manager.doneTargets.forEach(target => {
            const tmodel = target.tmodel;
            const key = target.key;
            if (tmodel.isTargetDone(key)) {
                tmodel.setTargetComplete(key);
                tmodel.removeFromActiveTargets(tmodel);
                tmodel.removeFromUpdatingTargets(tmodel);
            }
        });
    }

    createDoms() {
        const contentList = [];
        const needsDom = [];

        this.lists.visibleNoDom.sort((a, b) => {
            if (a.hasChildren() && b.hasChildren()) {
                return a.getUIDepth() < b.getUIDepth() ? -1 : 1;
            } else {
                return a.hasChildren() ? -1 : 1;
            }
        });

        for (const tmodel of this.lists.visibleNoDom) {
            let $dom;
            if ($Dom.query(`#${tmodel.oid}`)) {
                $dom = new $Dom(`#${tmodel.oid}`);
                tmodel.$dom = $dom;
            } else {
                needsDom.push(tmodel);
            }
        }
        
        for (const tmodel of needsDom) {
            const x = Math.floor(tmodel.getX());
            const y = Math.floor(tmodel.getY());
            const rotate = Math.floor(tmodel.getRotate());
            const scale = TUtil.formatNum(tmodel.getScale(), 2);
            const width = Math.floor(tmodel.getWidth());
            const height = Math.floor(tmodel.getHeight());
            const zIndex = Math.floor(tmodel.getZIndex());
            const opacity = tmodel.getOpacity() ? tmodel.getOpacity().toFixed(2) : 0;

            const style = {
                position: 'absolute',
                top: 0,
                left: 0,
                transform: [x, y, rotate, scale],
                width: `${width}px`,
                height: `${height}px`,
                opacity,
                zIndex
            };

            ['fontSize', 'borderRadius', 'padding', 'lineHeight'].forEach(prop => {
                const value = tmodel.val(prop);
                if (value) {
                    style[prop] = TUtil.isNumber(value) ? `${value}px` : value;
                }
            });

            ['backgroundColor', 'background', 'color'].forEach(prop => {
                const value = tmodel.val(prop);
                if (value) {
                    style[prop] = value;
                }
            });

            Object.assign(style, tmodel.getStyle());

            const $dom = new $Dom();
            $dom.create('div');
            $dom.setSelector(`#${tmodel.oid}`);
            $dom.setId(tmodel.oid);
            $dom.css(tmodel.getCss());
            $dom.setStyleByMap(style);

            tmodel.domValues = { x, y, rotate, scale, style };

            tmodel.$dom = $dom;

            const contentItem = contentList.find(item => item.domHolder === tmodel.getDomHolder());

            if (contentItem) {
                contentItem.tmodels.push(tmodel);
            } else {
                contentList.push({ domHolder: tmodel.getDomHolder(), tmodels: [tmodel] });
            }
        }

        contentList.map(content => {
            content.tmodels.map(tmodel => {
                content.domHolder.appendTModel$Dom(tmodel);
            });
        });

        if (contentList.length) {
            tApp.manager.scheduleRun(1, "createDom");
        }
    }

    scheduleRun(delay, oid) {
        if (delay < 1 && tApp.throttle === 0) {
            tApp.manager.run(oid, delay);
        } else {
            const nextRun = browser.delay(() => {
                tApp.manager.run(oid, delay);
            }, oid, tApp.throttle === 0 ? delay || 0 : tApp.throttle);

            const lastRun = this.nextRuns.length > 0 ? this.nextRuns[this.nextRuns.length - 1] : null;
            if (nextRun && (!lastRun || nextRun.delay > lastRun.delay)) {
                this.nextRuns.push(nextRun);
            } else if (nextRun && lastRun && nextRun.delay <= lastRun.delay && tApp.manager.runningFlag) {
                tApp.manager.rerunOid = oid;
            }
        }
    }

    run(oid, delay) {
        if (!tApp.isRunning()) {
            this.getNextRun();
            return;
        }

        if (tApp.manager.runningFlag) {
            tApp.manager.rerunOid = oid;
            return;
        }

        tApp.manager.runningFlag = true;

        window.requestAnimationFrame(() => {
            const startStep = tApp.manager.runningStep;
            const startTime = browser.now();

            while ((browser.now() - startTime) < 25 && tApp.manager.runningStep < 7 && tApp.isRunning()) {
                switch (tApp.manager.runningStep) {
                    case 0:
                        tApp.events.captureEvents();

                        if (tApp.manager.doneTargets.length > 0) {
                            tApp.manager.completeDoneTModels();
                            tApp.manager.doneTargets.length = 0;
                        }

                        tApp.locationManager.calculateTargets(tApp.tRoot);
                        tApp.locationManager.calculateAll();
                        tApp.events.resetEventsOnTimeout();
                        break;

                    case 1:
                        tApp.manager.analyze();
                        break;

                    case 2:
                        tApp.manager.createDoms();
                        break;

                    case 3:
                        tApp.manager.renderTModels();
                        tApp.manager.reattachTModels();
                        break;

                    case 4:
                        tApp.manager.fixStyles();
                        break;

                    case 5:
                        tApp.manager.deleteDoms();
                        break;

                    case 6:
                        tApp.loader.singleLoad();
                        tApp.loader.groupLoad();
                        tApp.loader.imgLoad();
                        break;
                }

                tApp.manager.runningStep++;
            }

            const cycleDuration = browser.now() - startTime;
            tApp.manager.cycleStats.duration = startStep === 0 ? cycleDuration : tApp.manager.cycleStats.duration + cycleDuration;

            if (tApp.debugLevel > 0) {
                browser.log(tApp.debugLevel > 0 && tApp.manager.cycleStats.duration > 10)(
                    `it took: ${tApp.manager.cycleStats.duration}, ${oid}`
                );
                browser.log(tApp.debugLevel > 0 && tApp.manager.cycleStats.duration > 10)(
                    `count: ${tApp.locationManager.locationCount}`
                );
                browser.log(tApp.debugLevel > 1)(`request from: ${oid} delay:  ${delay}`);
            }

            tApp.manager.runningFlag = false;

            if (tApp.manager.runningStep !== 7) {
                tApp.manager.run(`rendering: ${oid} ${tApp.manager.runningStep}`);
            } else {
                tApp.manager.cycleStats.count++;
                tApp.manager.cycleStats.totalDuration += tApp.manager.cycleStats.duration;
                tApp.manager.cycleStats.average = tApp.manager.cycleStats.totalDuration / tApp.manager.cycleStats.count;

                if (tApp.manager.rerunOid) {
                    tApp.manager.runningStep = 0;
                    const rerunOid = tApp.manager.rerunOid;
                    tApp.manager.rerunOid = '';
                    tApp.manager.run(rerunOid);
                } else {
                    tApp.manager.runningStep = 0;
                    tApp.manager.getNextRun();
                }
            }
        });
    }

    getNextRun() {
        if (this.nextRuns.length > 0 && tApp.isRunning()) {
            const nextRun = this.nextRuns.pop();
            if (nextRun) {
                tApp.manager.scheduleRun(nextRun.timeStamp - browser.now(), nextRun.oid);
            }
        }
    }
}

export { TModelManager };
