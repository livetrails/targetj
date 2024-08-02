import { $Dom } from "./$Dom.js";
import { browser } from "./Browser.js";
import { SearchUtil } from "./SearchUtil.js";
import { TUtil } from "./TUtil.js";
import { tapp } from "./App.js";


function EventListener() {

    this.currentTouch = {
        deltaY: 0, 
        deltaX: 0,
        pinchDelta: 0,
        key: '',
        manualMomentumFlag: false, 
        orientation: "none" ,
        dir: "",
        source: ""
    };
    
    this.touchTimeStamp = 0;

    this.cursor = { x: 0, y: 0};
    this.start0 = undefined;
    this.start1 = undefined;    
    this.end0 = undefined;
    this.end1 = undefined;
    this.touchCount = 0;    
        
    this.currentEvent = "";
    this.currentHandlers = { touch: null, scrollLeft: null, scrollTop: null, pinch: null };
    
    this.eventQueue = [];
    
    this.eventMap = {
        touchstart: { to: 'touchstart', inputType: 'touch', eventType: 'start', order: 1, windowEvent: false },
        touchmove: { to: 'touchmove', inputType: 'touch', eventType: 'move', order: 1, windowEvent: false },
        touchend: { to: 'touchend', inputType: 'touch', eventType: 'end', order: 1, windowEvent: false },
        touchcancel: { to: 'touchend', inputType: 'touch', eventType: 'cancel', order: 1, windowEvent: false },
        
        mousedown: { to: 'mousedown', inputType: 'mouse', eventType: 'start', order: 2, windowEvent: false },
        mousemove: { to: 'mousemove', inputType: 'mouse', eventType: 'move', order: 2, windowEvent: false },
        mouseup: { to: 'mouseup', inputType: 'mouse', eventType: 'end', order: 2, windowEvent: false },
        mousecancel:  { to: 'mouseup', inputType: 'mouse', eventType: 'cancel', order: 2, windowEvent: false },
        
        pointerdown: { to: 'mousedown', inputType: 'pointer', eventType: 'start', order: 3, windowEvent: false },    
        pointermove: { to: 'mousemove', inputType: 'pointer', eventType: 'move', order: 3, windowEvent: false },
        pointerup: { to: 'mouseup', inputType: 'pointer', eventType: 'end', order: 3, windowEvent: false },
        pointercancel:  { to: 'mousecancel', inputType: 'pointer', eventType: 'cancel', order: 3, windowEvent: false },

        wheel:  { to: 'wheel', inputType: '', eventType: 'wheel', order: 1, windowEvent: false },
        DOMMouseScroll:  { to: 'wheel', inputType: '', eventType: 'wheel', order: 1, windowEvent: false },
        mousewheel:  { to: 'wheel', inputType: '', eventType: 'wheel', order: 1, windowEvent: false },
        
        keyup: { to: 'key', inputType: '', eventType: 'key', order: 1, windowEvent: true },
        keydown: { to: 'key', inputType: '', eventType: 'key', order: 1, windowEvent: true },        
        resize: { to: 'resize', inputType: '', eventType: 'resize', order: 1, windowEvent: true },
        orientationchange: { to: 'resize', inputType: '', eventType: 'resize', order: 1, windowEvent: true }
    };
    
    var self = this;
    this.domEvents = Object.keys(this.eventMap).filter(function(key) { return self.eventMap[key].windowEvent === false; });
    this.windowEvents = Object.keys(this.eventMap).filter(function(key) { return self.eventMap[key].windowEvent; }); 
    
    this.bindedHandleEvent = this.bindedHandleEvent ? this.bindedHandleEvent : this.handleEvent.bind(this);
    
}

EventListener.prototype.removeHandlers = function ($dom) {
    
    var self = this;
    this.domEvents.forEach(function(key) {
        $dom.detachEvent(key, self.bindedHandleEvent);
    });  
};

EventListener.prototype.addHandlers = function ($dom) {   
    var self = this;
    this.domEvents.forEach(function(key) {
        $dom.addEvent(key, self.bindedHandleEvent);
    });
};

EventListener.prototype.removeWindowHandlers = function () {    
    var self = this;
    this.windowEvents.forEach(function(key) {
        tapp.$window.detachEvent(key, self.bindedHandleEvent);
    });
};

EventListener.prototype.addWindowHandlers = function () {    
    var self = this;
    this.windowEvents.forEach(function(key) {
        tapp.$window.addEvent(key, self.bindedHandleEvent);
    });
};

EventListener.prototype.captureEvents = function() {

    if (this.eventQueue.length === 0) { 
        this.currentEvent = "";
        this.currentKey = "";       
        return;
    }
    var lastEvent = this.eventQueue.shift();
    
    if (lastEvent.eventName === 'resize') {
        tapp.dim.measureScreen();
    } else {
        this.findEventHandlers(lastEvent.tmodel);
        this.currentEvent = lastEvent.eventName;
        this.currentKey = this.currentTouch.key;
        this.currentTouch.key = "";        
    }

    tapp.manager.scheduleRun(10, 'captureEvents' + '-' + lastEvent);   
    
};
    
EventListener.prototype.handleEvent = function (event) {
    if (!event) return;
    
    var eventName, inputType, eventType, eventOrder;
    
    var originalName = event.type;
    var eventItem = this.eventMap[originalName];

    if (eventItem) {
        eventName = eventItem.to;
        inputType = eventItem.inputType;
        eventType = eventItem.eventType;  
        eventOrder = eventItem.order;
    }
    
    var now = browser.now();
    this.touchTimeStamp = now > this.touchTimeStamp ? now : this.touchTimeStamp;

    var tmodel = this.getTModelFromEvent(event);
    
    var lastEvent = this.eventQueue.length > 0 ? this.eventQueue[this.eventQueue.length - 1] : null;
    
    if (lastEvent) {
        var lastEventItem = lastEvent.eventItem;
        var rate  = now - lastEvent.timeStamp; 

        if ((inputType && lastEventItem.inputType && lastEventItem.inputType !== inputType && eventOrder > lastEventItem.order)) {
            return;
        } else if (this.eventQueue.length > 10 && rate < 50) {
            var capacity = 0, i;
            for (i = this.eventQueue.length - 1; i >= 0 && this.eventQueue[i].eventItem.eventType === eventType; i--) {
                if (++capacity > 5) {
                    return;
                }
            }
        } 
    }

    this.eventQueue.push({ eventName: eventName, eventItem: eventItem, originalName: originalName, tmodel: tmodel, timeStamp: now });
        
    switch (eventName) { 
        
        case 'mousedown':
        case 'touchstart':  
            this.clearStart();            
            this.clearTouch(); 
            
            this.touchCount = this.countTouches(event);
            if (this.preventDefault(tmodel, eventName)) event.preventDefault();
            
            this.start0 = this.getTouch(event);
            this.start1 = this.getTouch(event, 1);

            this.cursor.x = this.start0.x;
            this.cursor.y = this.start0.y;
            
            event.stopPropagation();
            break;
            
        case 'mousemove':
        case 'touchmove':
            
            var touch = this.getTouch(event);
            this.cursor.x = touch.x;
            this.cursor.y = touch.y;
            if (this.preventDefault(tmodel, eventName)) event.preventDefault();
            if (this.touchCount > 0) {                
                this.move(event);
                event.stopPropagation();
            }
            break;

        case 'mouseup':
        case 'touchend':
                        
            if (this.preventDefault(tmodel, eventName)) event.preventDefault();
            this.end(event);
                        
            if (this.start0) {
                var deltaX = 0, deltaY = 0, period = now - this.start0.timeStamp;
                
                if (this.end0) {
                    deltaX = Math.abs(this.end0.originalX - this.start0.originalX);
                    deltaY = Math.abs(this.end0.originalY - this.start0.originalY);
                    period = Math.abs(this.end0.timeStamp - this.start0.timeStamp);
                }
                                
                if (deltaX <= 1 && deltaY <= 1 && period <= 300) {
                    this.eventQueue.push({ eventName: 'click', eventItem: eventItem, originalName: originalName, tmodel: tmodel, timeStamp: now });
                }     
            }
            
            this.clearStart();
            this.touchCount = 0;
                
            event.stopPropagation();
            break;

        case 'wheel':
            
            if (this.preventDefault(tmodel, eventName)) event.preventDefault();   
            this.wheel(event);
            break;

        case 'key':
            this.currentTouch.key = event.which || event.keyCode;
            break;  
    }
    
    tapp.manager.scheduleRun(0, originalName + '-' + eventName + '-' + (event.target.tagName || "").toUpperCase());     
};
    
EventListener.prototype.findEventHandlers = function(tmodel) {

    var touchHandler = tmodel ? SearchUtil.findFirstTouchHandler(tmodel) : null;
    var scrollLeftHandler = tmodel ? SearchUtil.findFirstScrollLeftHandler(tmodel) : null;
    var scrollTopHandler = tmodel ? SearchUtil.findFirstScrollTopHandler(tmodel) : null;
    var pinchHandler = tmodel ? SearchUtil.findFirstPinchHandler(tmodel) : null;

    if (this.currentHandlers.scrollLeft !== scrollLeftHandler || this.currentHandlers.scrollTop !== scrollTopHandler) {
        this.clearTouch();
    }

    this.currentHandlers.touch = touchHandler;
    this.currentHandlers.scrollLeft = scrollLeftHandler;
    this.currentHandlers.scrollTop = scrollTopHandler; 
    this.currentHandlers.pinch = pinchHandler; 
};

EventListener.prototype.preventDefault = function(tmodel, eventName) {

    if (tmodel && (tmodel.keepEventDefault() === true || (Array.isArray(tmodel.keepEventDefault()) && tmodel.keepEventDefault().includes(eventName)))) {
        return false;
    }
    
    return true;
};

EventListener.prototype.getTModelFromEvent = function(event) {
    var oid = typeof event.target.getAttribute === 'function' ? event.target.getAttribute('id') : '';
    
    if (!oid || !tapp.manager.visibleOidMap[oid]) {
        oid = $Dom.findNearestParentWithId(event.target);
    }
      
    return tapp.manager.visibleOidMap[oid];
};

EventListener.prototype.clearStart = function() {
    this.start0 = undefined;
    this.start1 = undefined;
    this.end0 = undefined;
    this.end1 = undefined;
    this.touchCount = 0;   
};

EventListener.prototype.clearTouch = function() {
    this.currentTouch.deltaY = 0;
    this.currentTouch.deltaX = 0;
    this.currentTouch.pinchDelta = 0;
    this.currentTouch.manualMomentumFlag = false;
    this.currentTouch.dir = "";
    this.currentTouch.orientation = "none";
    this.currentTouch.key = ''; 
    this.currentTouch.source = '';
};

EventListener.prototype.clearAll = function() {
    this.clearStart();
    this.clearTouch();
    this.eventQueue.length = 0;
    this.touchTimeStamp = 0;
};

EventListener.prototype.resetEventsOnTimeout = function () {
    if (this.touchTimeStamp > 0) {
    
        var diff = browser.now() - this.touchTimeStamp;
        var runDelay = 0;
        
        if (Math.abs(this.currentTouch.deltaY) > 0.001 
                || Math.abs(this.currentTouch.deltaX) > 0.001 
                || Math.abs(this.currentTouch.pinchDelta) > 0.001)
        {           
            if (diff > 70) {
                this.currentTouch.deltaY = 0;
                this.currentTouch.deltaX = 0;
                this.currentTouch.source = '';
                this.currentTouch.pinchDelta = 0;                
            } else if (this.currentTouch.manualMomentumFlag) {
                this.currentTouch.deltaY *= 0.85;
                this.currentTouch.deltaX *= 0.85;
                this.currentTouch.source = '';
                
                runDelay = 10;
            }
        } else if (diff > 600) {
            this.clearTouch();
            this.touchTimeStamp = 0;
        } 
    
        tapp.manager.scheduleRun(runDelay, "scroll decay"); 
    }

};

EventListener.prototype.deltaX = function()  {
    return this.currentTouch.deltaX;
};

EventListener.prototype.deltaY = function()  {
    return this.currentTouch.deltaY;
};

EventListener.prototype.pinchDelta = function()  {
    return this.currentTouch.pinchDelta;
};

EventListener.prototype.dir = function()  {
    return this.currentTouch.dir;
};

EventListener.prototype.getScrollLeftHandler = function()  {
    return this.currentHandlers.scrollLeft;
};

EventListener.prototype.getScrollTopHandler = function()  {
    return this.currentHandlers.scrollTop;
};

EventListener.prototype.getPinchHandler = function()  {
    return this.currentHandlers.pinch;
};

EventListener.prototype.getTouchHandler = function() {
    return this.currentHandlers.touch;
};

EventListener.prototype.getTouchHandlerType = function() {
    return this.currentHandlers.touch ? this.currentHandlers.touch.type : null;
};


EventListener.prototype.getTouchHandlerOid = function() {
    return this.currentHandlers.touch ? this.currentHandlers.touch.oid : null;
};

EventListener.prototype.isClickEvent = function() {
    return this.currentEvent === 'click';
};

EventListener.prototype.isResizeEvent = function() {
    return this.currentEvent === 'resize';
};

EventListener.prototype.getCurrentEvent = function() {
    return this.currentEvent;
};

EventListener.prototype.isClickHandler = function(target) {
    return this.getTouchHandler() === target && this.isClickEvent();
};

EventListener.prototype.isClickHandlerType = function(type) {
    return this.getTouchHandlerType() === type && this.isClickEvent();
};

EventListener.prototype.isTouchHandler = function(handler) {
    return this.getTouchHandler() === handler;
};

EventListener.prototype.isScrollLeftHandler = function(handler)  {
    return this.currentHandlers.scrollLeft === handler;
};

EventListener.prototype.isScrollTopHandler = function(handler)  {
    return this.currentHandlers.scrollTop === handler;
};

EventListener.prototype.isPinchHandler = function(handler)  {
    return this.currentHandlers.pinch === handler;
};

EventListener.prototype.isCurrentSource = function(source) {
    return this.currentTouch.source === source;
};

EventListener.prototype.isTouchHandlerType = function(type) {
    return this.getTouchHandlerType() === type;
};

EventListener.prototype.isTouchHandlerOrAncestor = function(target) {
    var handler = this.getTouchHandler();

    while (handler) {
        if (handler === target) {
            return true;
        }
        
        handler = handler.getParent();
    }
    
    return false;
};

EventListener.prototype.countTouches = function(event)   {
    var count =  event.touches && event.touches.length ? event.touches.length : 
        event.originalEvent && event.originalEvent.touches && event.originalEvent.touches.length ? event.originalEvent.touches.length : 1;

    return count;
};

EventListener.prototype.getTouch = function (event, index) {    
    index = index || 0;
    var e = event.touches && event.touches[index] ? event.touches[index] : event.originalEvent && event.originalEvent.touches && event.originalEvent.touches[index] ? event.originalEvent.touches[index] : event;

    var x = TUtil.isDefined(e.clientX) ? e.clientX : e.pageX || 0;
    var y = TUtil.isDefined(e.clientY) ? e.clientY : e.pageY || 0;
    return { 
        x: x,
        y: y,
        originalX: x,
        originalY: y,
        target: e.target,
        timeStamp: browser.now()
    };
};

EventListener.prototype.move = function (event) {

    var deltaX, deltaY;

    if (this.touchCount === 1 ) {
        this.start0.y = this.end0 ? this.end0.y : this.start0.y;
        this.start0.x = this.end0 ? this.end0.x : this.start0.x;

        this.end0 = this.getTouch(event);
        this.start1 = undefined;
        this.end1 = undefined;
        
        if (TUtil.isDefined(this.end0)) {
            deltaX = this.start0.x - this.end0.x;
            deltaY = this.start0.y - this.end0.y;
            
            this.setDeltaXDeltaY(deltaX, deltaY, 'touch');
        }

    } else if (this.touchCount >= 2) {

        this.end0 = this.getTouch(event);
        this.end1 = this.getTouch(event, 1);
        
        var length1 = TUtil.distance(this.start0.x,  this.start0.y, this.start1.x, this.start1.y);        
        var length2 = TUtil.distance(this.end0.x,  this.end0.y, this.end1.x, this.end1.y);

        var diff = length2 - length1;

        this.currentTouch.pinchDelta = diff > 0 ? 0.3 : diff < 0 ? -0.3 : 0;
    }
};

EventListener.prototype.end = function () {
               
    if (this.touchCount <= 1 && this.start0) {
        
        var deltaX = 0, deltaY = 0, period = 0;
        
        if (this.end0) {
            deltaX = this.start0.x - this.end0.x;
            deltaY = this.start0.y - this.end0.y;
            period = this.end0.timeStamp - this.start0.timeStamp;
        }

        var momentum;

        if (this.currentTouch.orientation === "horizontal" && Math.abs(deltaX) > 1) {
            momentum = TUtil.momentum(0, deltaX, period);
            this.currentTouch.deltaX = momentum.distance;
            this.currentTouch.manualMomentumFlag = true;  
            this.touchTimeStamp =  browser.now() + momentum.duration;
        } else if (this.currentTouch.orientation === "vertical" && Math.abs(deltaY) > 1)  {                
            momentum = TUtil.momentum(0, deltaY, period);
            this.currentTouch.deltaY = momentum.distance;
            this.currentTouch.manualMomentumFlag = true;                
            this.touchTimeStamp =  browser.now() + momentum.duration;
        }
         
    }
};

EventListener.prototype.setDeltaXDeltaY = function(deltaX, deltaY, source) {
    var diff = Math.abs(deltaX) - Math.abs(deltaY);
    
    if (diff >= 1) {
        if (this.currentTouch.orientation === "none" || (this.currentTouch.orientation === "vertical" && diff > 3) || this.currentTouch.orientation === "horizontal") {
            this.currentTouch.orientation = "horizontal";
            this.currentTouch.dir = deltaX <= -1 ? "left" : deltaX >= 1 ? "right" : this.currentTouch.dir;
            this.currentTouch.source = source;
            this.currentTouch.deltaX = deltaX;
            this.currentTouch.deltaY = 0;
        }
    } else if (this.currentTouch.orientation === "none" || (this.currentTouch.orientation === "horizontal" && diff < -3) || this.currentTouch.orientation === "vertical") {
            this.currentTouch.orientation = "vertical";
            this.currentTouch.dir = deltaY <= -1 ? "up" : deltaY >= 1 ? "down" : this.currentTouch.dir;
            this.currentTouch.source = source;            
            this.currentTouch.deltaY = deltaY;
            this.currentTouch.deltaX = 0;
    } else {
        this.currentTouch.deltaY = 0;
        this.currentTouch.deltaX = 0;
    }     
};

EventListener.prototype.wheel = function (event) {
    var deltaX = 0, deltaY = 0;
        
    this.currentTouch.pinchDelta = 0;

    this.start0 = this.getTouch(event);

    if (event.ctrlKey && 'deltaY' in event) {
        this.currentTouch.pinchDelta = -event.deltaY / 10;
    } else if ('deltaX' in event) {
        deltaX = event.deltaX;
        deltaY = event.deltaY;
    } else if ('wheelDeltaX' in event) {
        deltaX = -event.wheelDeltaX / 120;
        deltaY = -event.wheelDeltaY / 120;       
    } else if ('wheelDelta' in event) {
        deltaX = -event.wheelDelta / 120;        
    } else if ('detail' in event) {
        deltaX = event.detail / 3;    
    }
            
    this.setDeltaXDeltaY(deltaX, deltaY, 'wheel');
};

export { EventListener };

