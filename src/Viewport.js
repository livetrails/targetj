import { TUtil } from "./TUtil.js";

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

        this.yNext = 0;
        this.yNorth = 0;
        this.yWest = 0;
        this.yEast = 0;
        this.ySouth = 0;

        this.reset();
    }

    reset() {       
        
        if (this.tmodel.type === 'BI') {
            const x = this.tmodel.getX();
            const y = this.tmodel.getY();
            
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
            this.ySouth = this.tmodel.getRealParent().viewport?.ySouth ?? y;

        } else {
            const x = -this.tmodel.getScrollLeft();
            const y = -this.tmodel.getScrollTop(); 
        
            this.xNext = x;
            this.xNorth = x;
            this.xEast = x;
            this.xSouth = x;
            this.xWest = x;
            
            this.xOverflow = this.tmodel.val('xOverflow') || 0;

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
    }

    getXNext() {
        return this.xNext + this.currentChild.getLeftMargin();
    }

    getYNext() {
        return this.yNext + this.currentChild.getTopMargin();
    }

    isVisible(child) {
        const x = child.absX;
        const y = child.absY;

        const parentScale = child.getDomParent() ? child.getDomParent().getMeasuringScale() : 1;
        const scale = parentScale * child.getMeasuringScale();
        const maxWidth = TUtil.isDefined(child.getWidth()) ? scale * child.getWidth() : 0;
        const maxHeight = TUtil.isDefined(child.getHeight()) ? scale * child.getHeight() : 0;

        const status = child.visibilityStatus;
        
        const parent = child.getDomParent();
        

        status.right = x <= parent.absX + parent.getWidth();
        status.left = x + maxWidth >= parent.absX;
        status.bottom = y <= parent.absY + parent.getHeight();
        status.top = y + maxHeight >= parent.absY;

        child.visible = status.left && status.right && status.top && status.bottom;

        return child.isVisible();
    }
    
    isOverflow(outerOverflowWidth, innerOverflowWidth) {
        return TUtil.isNumber(outerOverflowWidth) && TUtil.isNumber(innerOverflowWidth) && outerOverflowWidth > innerOverflowWidth;
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
}

export { Viewport };
