import { TModel } from "./TModel.js";
import { TUtil } from "./TUtil.js";

class Bracket extends TModel {
    constructor(parent) {
        super("BI", {
            canHaveDom: false,
            outerXEast: 0
        });

        this.parent = parent;
        this.newFlag = true;
    }

    getWidth() {
        return this.getContentWidth();
    }

    getHeight() {
        return this.getContentHeight();
    }

    getInnerWidth() {
        return this.innerContentWidth;
    }

    getInnerXEast() {
        this.initParents();        
        return TUtil.isDefined(this.getRealParent().val('innerXEast')) ? this.getRealParent().val('innerXEast') : this.getRealParent().absX + this.getRealParent().getWidth();
    }

    getInnerContentHeight() {
        return this.innerContentHeight;
    }

    getScrollTop() {
        this.initParents();
        return this.getRealParent().getScrollTop();
    }

    getScrollLeft() {
        this.initParents();
        return this.getRealParent().getScrollLeft();
    }

    getBoundingRect() {
        this.initParents();
        return TUtil.getBoundingRect(this.getRealParent());
    }

    calculateAbsolutePosition(x, y) {
        const rect = this.getBoundingRect();
        this.absX = rect.left + x;
        this.absY = rect.top + y;
    }

    isVisible() {
        return this.visibilityStatus.top && this.visibilityStatus.bottom;
    }

    addToUpdatingChildren(child) {
        this.initParents();        
        this.getRealParent().addToUpdatingChildren(child);
    }

    createViewport() {
        this.initParents();        
        return this.getRealParent().createViewport.call(this);
    }

    getRealParent() {
        this.initParents();
        return this.realParent;
    }

    shouldCalculateChildren() {
        const result = this.isVisible() || this.newFlag;
        this.newFlag = false;
        return result;
    }

    getChildren() {
        return this.actualValues.children;
    }

    addToParentVisibleList() {}

    initParents() {
        if (this.realParent) {
            return;
        }

        let parent = this.bracketParent;

        while (parent) {
            if (parent.type !== 'BI') {
                break;
            } else {
                parent = parent.bracketParent;
            }
        }

        this.realParent = parent;
    }

    getChildrenOids() {
        let oids = [];
        const list = this.getChildren();

        for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (item.type === 'BI') {
                const goids = item.getChildrenOids();
                oids = [].concat(oids, [item.oid], goids);
            } else {
                oids.push(item.oid + ":" + item.getHeight());
            }
        }

        return oids;
    }

}

export { Bracket };
