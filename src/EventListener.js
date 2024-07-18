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
        source: "",
        timeStamp: 0
    };
    
    this.bindedHandleEvent = this.bindedHandleEvent ? this.bindedHandleEvent : this.handleEvent.bind(this);
    
    this.eventMap = {
        touchstart: { to: 'touchstart', windowEvent: false },
        touchmove: { to: 'touchmove', windowEvent: false },
        touchend: { to: 'touchend', windowEvent: false },
        touchcancel: { to: 'touchend', windowEvent: false },
        mousedown: { to: 'mousedown', windowEvent: false },
        mousemove: { to: 'mousemove', windowEvent: false },               
        pointerup: { to: 'mouseup', windowEvent: false },
        MSPointerUp: { to: 'mouseup', windowEvent: false },
        mouseup: { to: 'mouseup', windowEvent: false },
        pointercancel:  { to: 'mouseup', windowEvent: false },
        MSPointerCancel:  { to: 'mouseup', windowEvent: false },
        mousecancel:  { to: 'mouseup', windowEvent: false },
        wheel:  { to: 'wheel', windowEvent: false },
        DOMMouseScroll:  { to: 'wheel', windowEvent: false },
        mousewheel:  { to: 'wheel', windowEvent: false },
        keyup: { to: 'key', windowEvent: true },
        resize: { to: 'resize', windowEvent: true },
        orientationchange: { to: 'resize', windowEvent: true }
    };
    
    var self = this;
    this.domEvents = Object.keys(this.eventMap).filter(function(key) { return self.eventMap[key].windowEvent === false; });
    this.windowEvents = Object.keys(this.eventMap).filter(function(key) { return self.eventMap[key].windowEvent; });
    
    this.lastEvents = [];
    
    this.cursor = { x: 0, y: 0};
    this.start0 = undefined;
    this.start1 = undefined;    
    this.end0 = undefined;
    this.end1 = undefined;
    this.touchCount = 0;
        
    this.currentEvent = "";
    this.currentHandlers = { touch: null, scrollLeft: null, scrollTop: null, pinch: null };
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

    if (this.lastEvents.length === 0) { 
        this.currentEvent = "";
        this.currentKey = "";       
        return;
    }
    var lastEvent = this.lastEvents.pop();
    
    if (lastEvent.eventName === 'resize') {
        tapp.dim.measureScreen();
    } else {
        this.findEventHandlers(lastEvent.tmodel);
        this.currentEvent = lastEvent.eventName;
        this.currentKey = this.currentTouch.key;
        this.currentTouch.key = "";        
    }
};
    
EventListener.prototype.handleEvent = function (event) {
    
    var eventName = this.eventMap[event.type] ? this.eventMap[event.type].to : null;
    var tmodel = this.getTModelFromEvent(event);
            
    switch (eventName) { 
        
        case 'mousedown':
        case 'touchstart':
            this.lastEvents.push({ eventName: eventName, tmodel: tmodel });
            
            this.clear();            
            this.touchCount = this.countTouches(event);
            if (this.preventDefault(tmodel, eventName)) event.preventDefault();
            this.start(event);
            event.stopPropagation();
            break;
            
        case 'mousemove':
        case 'touchmove':
            this.lastEvents.push({ eventName: eventName, tmodel: tmodel });
            
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
            this.lastEvents.push({ eventName: eventName, tmodel: tmodel });
            
            if (this.preventDefault(tmodel, eventName)) event.preventDefault();
            this.end(event);
            event.stopPropagation();
            break;

        case 'wheel':
            this.lastEvents.push({ eventName: eventName, tmodel: tmodel });
            
            if (this.preventDefault(tmodel, eventName)) event.preventDefault();   
            this.wheel(event);
            break;

        case 'key':
            this.lastEvents.push({ eventName: eventName, tmodel: tmodel });
            
            this.keyUpHandler(event);
            break;
            
        case 'resize':
            if (this.lastEvents.length === 0 || this.lastEvents[this.lastEvents.length - 1].eventName !== 'resize') {
                this.lastEvents.push({ eventName: eventName, tmodel: tmodel });
            }
            break;
            
    }
    
    tapp.manager.scheduleRun(0, event.type + '-' + eventName + '-' + (event.target.tagName || "").toUpperCase()); 
    tapp.manager.scheduleRun(20, event.type + '-' + eventName + '-' + (event.target.tagName || "").toUpperCase());   
    
};
    
EventListener.prototype.findEventHandlers = function(tmodel) {

    var touchHandler = tmodel ? SearchUtil.findFirstTouchHandler(tmodel) : null;
    var scrollLeftHandler = tmodel ? SearchUtil.findFirstScrollLeftHandler(tmodel) : null;
    var scrollTopHandler = tmodel ? SearchUtil.findFirstScrollTopHandler(tmodel) : null;
    var pinchHandler = tmodel ? SearchUtil.findFirstPinchHandler(tmodel) : null;

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

EventListener.prototype.clear = function () {
    this.start0 = undefined;
    this.start1 = undefined;
    this.end0 = undefined;
    this.end1 = undefined;
    this.touchCount = 0;   
    this.resetCurrentTouch();
};

EventListener.prototype.resetCurrentTouch = function() {
    this.currentTouch.deltaY = 0;
    this.currentTouch.deltaX = 0;
    this.currentTouch.pinchDelta = 0;
    this.currentTouch.manualMomentumFlag = false;
    this.currentTouch.dir = "";
    this.currentTouch.orientation = "none";
    this.currentTouch.key = ''; 
    this.currentTouch.source = '';
};

EventListener.prototype.resetEvents = function () {
    if (this.currentTouch.timeStamp > 0) {
    
        var diff = browser.now() - this.currentTouch.timeStamp;
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
                this.currentTouch.deltaY *= 0.95;
                this.currentTouch.deltaX *= 0.95;
                this.currentTouch.source = '';
                
                runDelay = 10;
            }
        } else if (diff > 600) {
            this.clear();
            this.currentTouch.timeStamp = 0;
        } 
    
        tapp.manager.scheduleRun(runDelay, "scroll decay"); 
    }

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

EventListener.prototype.isTouchHandler = function(target) {
    return this.getTouchHandler() === target;
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

EventListener.prototype.isScrollLeftHandler = function(handler)  {
    return this.currentHandlers.scrollLeft === handler;
};

EventListener.prototype.isScrollTopHandler = function(handler)  {
    return this.currentHandlers.scrollTop === handler;
};

EventListener.prototype.isPinchHandler = function(handler)  {
    return this.currentHandlers.pinch === handler;
};

EventListener.prototype.countTouches = function(event)   {
    var count =  event.touches && event.touches.length ? event.touches.length : 
        event.originalEvent && event.originalEvent.touches && event.originalEvent.touches.length ? event.originalEvent.touches.length : 1;

    return count;
};
      
EventListener.prototype.keyUpHandler = function (e) {
    e = e || window.event;
    var key = e.which || e.keyCode;
        
    this.currentTouch.key = key;
};

EventListener.prototype.getTouch = function (event, index) {
    if (!event)  return undefined;
    index = index || 0;
    var e = event.touches && event.touches[index] ? event.touches[index] : event;
    if (e.originalEvent && e.originalEvent.touches) {
        e = e.originalEvent.touches[index];
    }
    
    return { 
        x: e.pageX || e.clientX || 0,
        y: e.pageY || e.clientY || 0,
        target: e.target,
        timeStamp: browser.now()
    };
};

EventListener.prototype.start = function (event) {
    this.start0 = this.getTouch(event);
    this.start1 = this.getTouch(event, 1);
    
    this.cursor.x = this.start0.x;
    this.cursor.y = this.start0.y;             
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

        this.currentTouch.diff = length2 - length1;

        this.setCurrentTouchParam('pinchDelta', this.currentTouch.diff > 0 ? 0.3 : this.currentTouch.diff  < 0 ? -0.3 : 0);
    }
};

EventListener.prototype.end = function (event) {
    var momentum;
            
    if (!TUtil.isDefined(this.end0)) {
        this.end0 = this.getTouch(event);
    }
    
    var startToEndTime = TUtil.isDefined(this.end0) && TUtil.isDefined(this.start0) ? this.end0.timeStamp - this.start0.timeStamp : 0;
        
    if (this.touchCount <= 1) {

        if (TUtil.isDefined(this.end0) && TUtil.isDefined(this.start0)) {

            var deltaX = this.start0.x - this.end0.x;
            var deltaY = this.start0.y - this.end0.y;
            
            var period = this.end0.timeStamp - this.start0.timeStamp;
            
                            
            if (this.currentTouch.orientation === "horizontal" && Math.abs(deltaX) > 1) {
                momentum = TUtil.momentum(0, deltaX, period); 
                this.setCurrentTouchParam('deltaX', momentum.distance, browser.now() + momentum.duration);
                this.currentTouch.manualMomentumFlag = true;
            } else if (this.currentTouch.orientation === "vertical" && Math.abs(deltaY) > 1)  {
                momentum = TUtil.momentum(0, deltaY, period);
                this.setCurrentTouchParam('deltaY', momentum.distance,  browser.now() + momentum.duration);
                this.currentTouch.manualMomentumFlag = true;                     
            }
        } 
    }
           
    if (!momentum && this.touchCount === 1 && startToEndTime <= 300) {
        this.lastEvents.push({ eventName: 'click', tmodel: this.getTModelFromEvent(event) });
        this.clear();
        this.currentTouch.timeStamp = 0;
    }
     
    this.touchCount = 0;
};

EventListener.prototype.setDeltaXDeltaY = function(deltaX, deltaY, source) {
    var diff = Math.abs(deltaX) - Math.abs(deltaY);
    
    if (diff >= 1) {
        if (this.currentTouch.orientation === "none" || (this.currentTouch.orientation === "vertical" && diff > 3) || this.currentTouch.orientation === "horizontal") {
            this.currentTouch.orientation = "horizontal";
            this.currentTouch.dir = deltaX <= -1 ? "left" : deltaX >= 1 ? "right" : this.currentTouch.dir;
            this.currentTouch.source = source;
            this.setCurrentTouchParam('deltaX', deltaX);
            this.currentTouch.deltaY = 0;
        }
    } else if (this.currentTouch.orientation === "none" || (this.currentTouch.orientation === "horizontal" && diff < -3) || this.currentTouch.orientation === "vertical") {
            this.currentTouch.orientation = "vertical";
            this.currentTouch.dir = deltaY <= -1 ? "up" : deltaY >= 1 ? "down" : this.currentTouch.dir;
            this.currentTouch.source = source;            
            this.setCurrentTouchParam('deltaY', deltaY);
            this.currentTouch.deltaX = 0;
    } else {
        this.currentTouch.deltaX = 0;
        this.currentTouch.deltaY = 0;
    }     
};

EventListener.prototype.setCurrentTouchParam = function(name, value, timeStamp) {
    this.currentTouch[name] = value;
    this.currentTouch.timeStamp = TUtil.isDefined(timeStamp) ? timeStamp :  Math.max(this.currentTouch.timeStamp, browser.now());
};

EventListener.prototype.wheel = function (event) {
    var deltaX = 0, deltaY = 0;
        
    this.currentTouch.pinchDelta = 0;

    this.start0 = this.getTouch(event);

    if (event.ctrlKey && 'deltaY' in event) {
        this.setCurrentTouchParam('pinchDelta', -event.deltaY / 10);
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

