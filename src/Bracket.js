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
        return TUtil.isDefined(this.getRealParent().val('innerXEast')) ? this.getRealParent().val('innerXEast') : this.getRealParent().absX + this.getRealParent().getWidth();
    }

    getInnerContentHeight() {
        return this.innerContentHeight;
    }

    getScrollTop() {
        return this.getRealParent().getScrollTop();
    }

    getScrollLeft() {
        return this.getRealParent().getScrollLeft();
    }

    getBoundingRect() {
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
        this.getRealParent().addToUpdatingChildren(child);
    }

    createViewport() {
        return this.getRealParent().createViewport.call(this);
    }

    getRealParent() {
        return this.realParent;
    }

    shouldCalculateChildren() {
        const result = this.isVisible() || this.newFlag;
        this.newFlag = false;
        return result;
    }
    
    indexRange() {
        return [this.startIndex, this.endIndex];
    }

    getChildren() {
        return this.allChildren;
    }

    addToParentVisibleList() {}
}

export { Bracket };
