import { TUtil } from "./TUtil.js";
import { getScreenWidth, getScreenHeight } from "./App.js";

/**
 * It calculates the locations and visibility of objects
 */
class Viewport {
    constructor(tmodel) {
        this.tmodel = tmodel;
        this.xNext = 0;
        this.xNorth = 0;
        this.xWest = 0;
        this.xEast = 0;
        this.xSouth = 0;

        this.xOverflow = 0;

        this.xOffset = 0;

        this.yNext = 0;
        this.yNorth = 0;
        this.yWest = 0;
        this.yEast = 0;
        this.ySouth = 0;

        this.yOffset = 0;

        this.reset();
    }

    reset() {
        let x, y;
        if (this.tmodel.type === 'BI') {
            x = this.tmodel.getX() + this.tmodel.getScrollLeft();
            y = this.tmodel.getY() + this.tmodel.getScrollTop();

            this.xOffset = 0;
            this.yOffset = 0;

            this.xNext = x;
            this.xNorth = x;
            this.xEast = x;
            this.xSouth = x;
            this.xWest = x;

            this.xOverflow = this.tmodel.getRealParent().getX();

            this.yNext = y;
            this.yNorth = y;
            this.yWest = y;
            this.yEast = y;
            this.ySouth = this.tmodel.getRealParent().viewport ? this.tmodel.getRealParent().viewport.ySouth : y;

        } else {
            this.xOffset = 0;
            this.yOffset = 0;

            x = this.tmodel.getX();
            y = this.tmodel.getY();

            this.xNext = x;
            this.xNorth = x;
            this.xEast = x;
            this.xSouth = x;
            this.xWest = x;

            this.xOverflow = TUtil.isDefined(this.tmodel.val('xOverflow')) ? this.tmodel.val('xOverflow') : x;

            this.yNext = y;
            this.yNorth = y;
            this.yWest = y;
            this.yEast = y;
            this.ySouth = y;
        }

        return this;
    }

    setCurrentChild(child) {
        this.currentChild = child;

        this.xOffset = child.getDomParent() ? -child.getDomParent().getX() : 0;
        this.yOffset = child.getDomParent() ? -child.getDomParent().getY() : 0;
    }

    getXNext() {
        return this.xNext + this.currentChild.getLeftMargin() + this.xOffset - this.tmodel.getScrollLeft();
    }

    getYNext() {
        return this.yNext + this.currentChild.getTopMargin() + this.yOffset - this.tmodel.getScrollTop();
    }

    isVisible(child) {
        const x = child.absX;
        const y = child.absY;

        const parentScale = child.getDomParent() ? child.getDomParent().getMeasuringScale() : 1;
        const scale = parentScale * child.getMeasuringScale();
        const maxWidth = TUtil.isDefined(child.getWidth()) ? scale * child.getWidth() : 0;
        const maxHeight = TUtil.isDefined(child.getHeight()) ? scale * child.getHeight() : 0;

        const status = child.visibilityStatus;

        const rect = child.getBoundingRect();

        if (!child.hasChildren()) {
            status.right = x <= getScreenWidth() && x <= rect.right;
            status.left = x + maxWidth >= 0 && x + maxWidth >= rect.left;
            status.bottom = y <= getScreenHeight() && y <= rect.bottom;
            status.top = y + maxHeight >= 0 && y + maxHeight >= rect.top;
        } else {
            status.right = x <= rect.right;
            status.left = x + maxWidth >= rect.left;
            status.bottom = y <= rect.bottom;
            status.top = y + maxHeight >= rect.top;
        }

        child.visible = status.left && status.right && status.top && status.bottom;

        return child.isVisible();
    }

    isOverflow(outerXEast, innerXEast) {
        return TUtil.isNumber(outerXEast) && TUtil.isNumber(innerXEast) && outerXEast > innerXEast;
    }

    overflow() {
        this.xNext = this.xOverflow;
        this.yNext = this.ySouth;
    }

    appendNewLine() {
        const innerHeight = this.currentChild.getInnerHeight() * this.currentChild.getMeasuringScale();

        this.xNext = this.xOverflow;
        this.yNext = this.ySouth > this.yNext ? this.ySouth + this.currentChild.val('appendNewLine') : this.ySouth + innerHeight + this.currentChild.val('appendNewLine');

        this.yEast = this.yNext;
        this.xSouth = this.xNext;

        this.ySouth = Math.max(this.yNext, this.ySouth);

        this.currentChild.getRealParent().viewport.xEast = Math.max(this.currentChild.getRealParent().viewport.xEast, this.xEast);
        this.currentChild.getRealParent().viewport.ySouth = Math.max(this.currentChild.getRealParent().viewport.ySouth, this.ySouth);
    }

    nextLocation() {
        const innerWidth = this.currentChild.getInnerWidth() * this.currentChild.getMeasuringScale();
        const innerHeight = this.currentChild.getInnerHeight() * this.currentChild.getMeasuringScale();
        const innerContentHeight = this.currentChild.getInnerContentHeight() * this.currentChild.getMeasuringScale();

        const ySouth = this.yNext + innerHeight + this.currentChild.getTopMargin() + this.currentChild.getBottomMargin();
        this.xNext += innerWidth + this.currentChild.getLeftMargin() + this.currentChild.getRightMargin();
        this.yNext += innerContentHeight;

        this.xSouth = this.xNext;
        this.yEast = this.yNext;

        this.xEast = Math.max(this.xNext, this.xEast);
        this.ySouth = Math.max(ySouth, this.ySouth);

        this.currentChild.getRealParent().viewport.xEast = Math.max(this.currentChild.getRealParent().viewport.xEast, this.xEast);
        this.currentChild.getRealParent().viewport.ySouth = Math.max(this.currentChild.getRealParent().viewport.ySouth, this.ySouth);
    }

    calcContentWidthHeight() {
        this.tmodel.contentHeight = this.ySouth - this.yNorth;
        this.tmodel.innerContentHeight = this.yEast - this.yNorth;
        this.tmodel.innerContentWidth = this.xSouth - this.xWest;
        this.tmodel.contentWidth = this.xEast - this.xWest;
    }
}

export { Viewport };
