function Viewport(tmodel) {
    
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

Viewport.prototype.reset = function() {
    var x, y;
    if (this.tmodel.type === 'BI') {
        x = this.tmodel.getX() + this.tmodel.getScrollLeft();
        y = this.tmodel.getY() + this.tmodel.getScrollTop();

        this.xNext = x;
        this.xNorth = x;
        this.xEast = x;
        this.xSouth = x;
        this.xWest = x;
        
        this.xOverflow = TUtil.isDefined(this.tmodel.getValue('xOverflow')) ? this.tmodel.getValue('xOverflow') : x;

        this.yNext = y;
        this.yNorth = y;
        this.yWest = y;
        this.yEast = y;    
        this.ySouth = this.tmodel.getRealParent().viewport ? this.tmodel.getRealParent().viewport.ySouth : y;
              
    } else {
        x = this.tmodel.getX();
        y = this.tmodel.getY();

        this.xNext = x;
        this.xNorth = x;
        this.xEast = x;
        this.xSouth = x;
        this.xWest = x;
        
        this.xOverflow = TUtil.isDefined(this.tmodel.getValue('xOverflow')) ? this.tmodel.getValue('xOverflow') : x;


        this.yNext = y;
        this.yNorth = y;
        this.yWest = y;
        this.yEast = y;    
        this.ySouth = y;       
    }
               
    return this;
};

Viewport.prototype.setCurrentChild = function(child) {
    this.currentChild = child;
        
    this.xOffset = child.getDomParent() ? -child.getDomParent().getX() : 0;
    this.yOffset =  child.getDomParent() ? -child.getDomParent().getY() : 0;
};

Viewport.prototype.getXNext = function() {
    return this.xNext + this.currentChild.getLeftMargin() + this.xOffset - this.tmodel.getScrollLeft();
};

Viewport.prototype.getYNext = function() { 
    return this.yNext + this.currentChild.getTopMargin() + this.yOffset - this.tmodel.getScrollTop();
};

Viewport.prototype.isXVisible = function(child, x1, x2, minX, maxX) {
    return child.type === 'BI' ? true : x1 <= maxX && x2 >= minX;
};

Viewport.prototype.isYVisible = function(child, y1, y2, minY, maxY) {
    return y1 <= maxY && y2 >= minY;
};

Viewport.prototype.isVisible = function(child) {
    
    var parentScale = child.getDomParent() ? child.getDomParent().getScale() : 1;

    var minX = tapp.dim.screen.x;
    var minY = tapp.dim.screen.y;
    var maxX = tapp.dim.screen.width;
    var maxY = tapp.dim.screen.height;
         
    var x = child.getX();
    var y = child.getY();
    
    if (child.getDomHolder() !== tapp.$dom) {
        minX = child.getDomParent().isInFlow() ? child.getDomParent().absX : child.getDomParent().getX();
        minY = child.getDomParent().isInFlow() ? child.getDomParent().absY : child.getDomParent().getY();
        maxX = Math.min(maxX, minX + child.getDomParent().getWidth());
        maxY = Math.min(maxY, minY + child.getDomParent().getHeight());
        minX = Math.max(0, minX);
        minY = Math.max(0, minY);

        x = child.getDomParent().isInFlow() ? child.getDomParent().absX + child.getX() : child.getDomParent().getX() + child.getX();
        y = child.getDomParent().isInFlow() ? child.getDomParent().absY + child.getY() : child.getDomParent().getY() + child.getY();
                
    } else if (child.type === 'BI') {
        maxX = child.getRealParent().getX() + child.getRealParent().getWidth();
        maxY = child.getRealParent().getY() + child.getRealParent().getHeight();        
    }
   
    var scale = parentScale * child.getTargetScale();
    var maxWidth = scale * child.getTargetWidth();
    var maxHeight = scale * child.getTargetHeight();

    child.xVisible = this.isXVisible(child, x, x + maxWidth, minX, maxX);
    child.yVisible = this.isYVisible(child, y, y + maxHeight, minY, maxY);
        
    //browser.log(child.oid === 'desc')("oid: " + child.oid + " in " + this.tmodel.oid + " min-maxX:" + Math.round(minX) + "-" + Math.round(maxX) + " x:" + Math.round(x) + " w:" + Math.floor(maxWidth) +  " sc:" + scale +  " vx:" + child.xVisible);
    //browser.log(child.oid === 'closeButton')("oid: " + child.oid + " in " + this.tmodel.oid + " min-maxY:" + Math.round(minY) + "-" + Math.round(maxY) + " y:" + Math.round(y) + " h:" + Math.floor(maxHeight) + " sc:" + scale + " vy:" + child.yVisible);

    return child.isVisible();    
};

Viewport.prototype.isOverflow = function(outerXEast, innerXEast) {
    if (TUtil.isNumber(outerXEast) && TUtil.isNumber(innerXEast)) {
        return outerXEast > innerXEast;
    }
};

Viewport.prototype.overflow = function() {
    this.xNext = this.xOverflow;
    this.yNext = this.ySouth;
};

Viewport.prototype.appendNewLine = function() {
    
    var height = this.currentChild.getHeight() * this.currentChild.getScale();

    this.xNext = this.xOverflow;
    this.yNext =  this.ySouth + height + this.currentChild.getTopMargin() + this.currentChild.getBottomMargin() + this.currentChild.getValue('appendNewLine');
    
    this.yEast = this.yNext;
    this.xSouth = this.xNext;

    this.ySouth = Math.max(this.yNext, this.ySouth);

    this.currentChild.getRealParent().viewport.xEast = Math.max(this.currentChild.getRealParent().viewport.xEast, this.xEast);   
    this.currentChild.getRealParent().viewport.ySouth = Math.max(this.currentChild.getRealParent().viewport.ySouth, this.ySouth); 
};
 
Viewport.prototype.nextLocation = function() {
    
    var innerWidth  = this.currentChild.getInnerWidth() * this.currentChild.getScale();
    var innerHeight = this.currentChild.getInnerHeight() * this.currentChild.getScale();
    var innerContentHeight = this.currentChild.getInnerContentHeight() * this.currentChild.getScale();
            
    var ySouth = this.yNext + innerHeight + this.currentChild.getTopMargin() + this.currentChild.getBottomMargin();
    this.xNext += innerWidth + this.currentChild.getLeftMargin() + this.currentChild.getRightMargin();
    this.yNext += innerContentHeight;

    this.xSouth = this.xNext; 
    this.yEast = this.yNext; 
    
    this.xEast = Math.max(this.xNext, this.xEast);
    this.ySouth = Math.max(ySouth, this.ySouth);
            
    this.currentChild.getRealParent().viewport.xEast = Math.max(this.currentChild.getRealParent().viewport.xEast, this.xEast);       
    this.currentChild.getRealParent().viewport.ySouth = Math.max(this.currentChild.getRealParent().viewport.ySouth, this.ySouth); 
};

Viewport.prototype.calcContentWidthHeight = function() {
    this.tmodel.contentHeight = this.ySouth - this.yNorth;
    this.tmodel.innerContentHeight = this.yEast - this.yNorth;
    this.tmodel.innerContentWidth = this.xSouth - this.xWest;    
    this.tmodel.contentWidth = this.xEast - this.xWest;
};
