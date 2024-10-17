import { $Dom } from "./$Dom.js";
import { TUtil } from "./TUtil.js";
import { getLocationManager,  getRunScheduler } from "./App.js";
import { TModelUtil } from "./TModelUtil.js";
import { TargetUtil } from "./TargetUtil.js";

/**
 * It analyzes all objects and based on their needs, creates or removes DOM elements, restyles objects, and rerenders them. 
 * It plays a crucial role in the TargetJ process cycle.
 */
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

    analyze() {
        const lastVisibleMap = TUtil.list2map(this.lists.visible);
        this.clear();

        for (const tmodel of getLocationManager().hasLocationList) {
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
            this.lists.invisibleDom.push(tmodel);
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
            tmodel.styleMap = {};
            tmodel.transformMap = {};
            
            let activateTargets = [];
            ['onInvisibleEvent', 'onResize' ].forEach(target => {
                if (tmodel.targets[target]) {
                    activateTargets = activateTargets.concat(tmodel.targets[target]);
                }
            });
            getLocationManager().activateTargets(tmodel, activateTargets);

            tmodel.$dom.detach();
            tmodel.$dom = null;
        }

        this.lists.invisibleDom.length = 0;

        getRunScheduler().schedule(0, "deleteDoms");
    }

    fixStyles() {
        for (const tmodel of this.lists.restyle) {
            this.fixStyle(tmodel);
        }
    }
    
    fixStyle(tmodel) {

        let transformUpdate = false;
        tmodel.styleTargetList.forEach(key => {
            if (key === 'x') {
                const x = tmodel.absX - tmodel.getDomParent().absX
                if (tmodel.transformMap['x'] !== x) {
                    tmodel.transformMap[key] = x;
                    transformUpdate = true;
                }
            } else if (key === 'y') {
                const y = tmodel.absY - tmodel.getDomParent().absY;
                if (tmodel.transformMap['y'] !== y) {
                    tmodel.transformMap[key] = y;
                    transformUpdate = true;
                }
            } else if (TargetUtil.transformMap[key]) {
                const value = TargetUtil.rotate3D[key] ? tmodel.val(key) : TargetUtil.scaleMap[key] ? TUtil.formatNum(tmodel.val(key), 2) : tmodel.floorVal(key);
                if (tmodel.transformMap[key] !== value) {
                    tmodel.transformMap[key] = value;
                    transformUpdate = true;
                } 
            } else if (key === 'width') {
                const width = Math.floor(tmodel.getWidth());

                if (tmodel.$dom.width() !== width) {
                    tmodel.styleMap['width'] = width;
                    tmodel.$dom.width(width);
                }
            } else if (key === 'height') {
                const height = Math.floor(tmodel.getHeight());

                if (tmodel.$dom.height() !== height) {
                    tmodel.styleMap['height'] = height;                    
                    tmodel.$dom.height(height);
                }                    
            } else if (key === 'style') {
                const style = tmodel.getStyle();
                if (TUtil.isDefined(style) && tmodel.styleMap.style !== style) {
                    tmodel.$dom.setStyleByMap(tmodel.getStyle());
                    tmodel.styleMap.style = style;
                }
            } else if (key === 'attributes') {
                const attributes = tmodel.getAttributes();
                if (TUtil.isDefined(attributes) && tmodel.styleMap.attributes !== attributes) {
                    Object.keys(attributes).forEach(key => {
                        tmodel.$dom.attr(key, attributes[key]);
                    });
                    tmodel.styleMap.attributes = attributes;
                }                  
            } else if (key === 'css') {
                const css = tmodel.getCss();
                if (tmodel.$dom.css() !== css) {
                    tmodel.$dom.css(css);
                }                    
            } else if (TargetUtil.styleWithUnitMap[key]) {
                if (TUtil.isDefined(tmodel.val(key)) && tmodel.styleMap[key] !== tmodel.val(key)) {
                    tmodel.$dom.style(key, TUtil.isNumber(tmodel.val(key)) ? `${tmodel.val(key)}px` : tmodel.val(key));
                    tmodel.styleMap[key] = tmodel.val(key);
                } 
            } else if (TargetUtil.attributeTargetMap[key]) {
                tmodel.$dom.attr(key, tmodel.val(key));
            } else {
                if (TUtil.isDefined(tmodel.val(key)) && tmodel.styleMap[key] !== tmodel.val(key)) {
                    tmodel.$dom.style(key, tmodel.val(key));
                    tmodel.styleMap[key] = tmodel.val(key);
                }                    
            }
        });
            
        if (transformUpdate) {
            tmodel.$dom.transform(TModelUtil.getTransformString(tmodel));
        }
        
        tmodel.styleTargetMap = {};
        tmodel.styleTargetList.length = 0;
        
    }

    completeDoneTModels() {
        this.doneTargets.forEach(target => {
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
            
            tmodel.$dom = new $Dom();
            tmodel.$dom.create(tmodel.getBaseElement());
            tmodel.$dom.setSelector(`#${tmodel.oid}`);
            tmodel.$dom.setId(tmodel.oid);

            tmodel.transformMap = {};
            tmodel.styleMap = {};
            tmodel.allStyleTargetList.forEach(function(key) {
                if (TUtil.isDefined(tmodel.val(key))) {
                    tmodel.addToStyleTargetList(key);
                }
            });           
            
            this.fixStyle(tmodel);

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
            getRunScheduler().schedule(1, "createDom");
        }
    }
}

export { TModelManager };
