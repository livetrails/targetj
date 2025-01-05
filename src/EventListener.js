import { $Dom } from "./$Dom.js";
import { SearchUtil } from "./SearchUtil.js";
import { TUtil } from "./TUtil.js";
import { TargetUtil } from "./TargetUtil.js";
import { tApp, getRunScheduler, tRoot } from "./App.js";

/**
 * It provides a central place to manage all events. 
 */
class EventListener {
    constructor() {
         this.$document = new $Dom(document);

        this.currentTouch = {
            deltaY: 0,
            deltaX: 0,
            pinchDelta: 0,
            key: '',
            manualMomentumFlag: false,
            orientation: "none",
            dir: "",
            source: ""
        };
        
        this.lastEvent = undefined;

        this.touchTimeStamp = 0;
        this.ignoreStartEvents = true;

        this.cursor = { x: 0, y: 0 };
        this.start0 = undefined;
        this.start1 = undefined;
        this.end0 = undefined;
        this.end1 = undefined;
        this.touchCount = 0;
        this.canFindHandlers = true;
        
        this.swipeStartX = 0;
        this.swipeStartY = 0;
        
        this.currentEventName = "";
        this.currentEventType = "";
        this.currentEventTarget = undefined;
        this.currentHandlers = { 
            touch: null, 
            scrollLeft: null, 
            scrollTop: null,
            swipe: null,
            pinch: null,
            enterEvent: null,
            leaveEvent: null,
            focus: null,
            justFocused: null,
            blur: null
        };
        
        this.eventQueue = [];
        
        this.attachedEventMap = {};
        this.eventTargetMap = {};
               
        this.startEvents = {
            touchstart: { eventName: 'touchstart', inputType: 'touch', eventType: 'start', order: 1, windowEvent: false, queue: true },
            pointerdown: { eventName: 'mousedown', inputType: 'pointer', eventType: 'start', order: 2, windowEvent: false, queue: true },
            mousedown: { eventName: 'mousedown', inputType: 'mouse', eventType: 'start', order: 3, windowEvent: false, queue: true },
        };
        
        this.endEvents = {
            touchend: { eventName: 'touchend', inputType: 'touch', eventType: 'end', order: 1, windowEvent: false, queue: true },
            pointerup: { eventName: 'mouseup', inputType: 'pointer', eventType: 'end', order: 1, windowEvent: false, queue: true },
            mouseup: { eventName: 'mouseup', inputType: 'mouse', eventType: 'end', order: 3, windowEvent: false, queue: true },
        };        
        
        this.cancelEvents = {
            touchcancel: { eventName: 'touchend', inputType: 'touch', eventType: 'cancel', order: 1, windowEvent: false, queue: true },       
            pointercancel: { eventName: 'mousecancel', inputType: 'pointer', eventType: 'cancel', order: 2, windowEvent: false, queue: true },
            mousecancel: { eventName: 'mouseup', inputType: 'mouse', eventType: 'cancel', order: 3, windowEvent: false, queue: true },
        };
                
        this.windowEvents = {
            keyup: { eventName: 'key', inputType: '', eventType: 'key', order: 1, windowEvent: true, queue: true },
            keydown: { eventName: 'key', inputType: '', eventType: 'key', order: 1, windowEvent: true, queue: true },
            blur: { eventName: 'blur', inputType: 'mouse', eventType: 'cancel', order: 2, windowEvent: true, queue: true },
            resize: { eventName: 'resize', inputType: '', eventType: 'resize', order: 1, windowEvent: true, queue: false },
            orientationchange: { eventName: 'resize', inputType: '', eventType: 'resize', order: 1, windowEvent: true, queue: false },
        };
        
        this.windowScrollEvents = {
            scroll: { eventName: 'scroll', inputType: '', eventType: 'windowScroll', order: 1, windowEvent: true, queue: true }            
        }
        
        this.leaveEvents = {
            mouseleave: { eventName: 'mouseleave', inputType: 'mouse', eventType: 'cancel', order: 3, windowEvent: false, queue: true },
        }        
        
        this.moveEvents = {
            touchmove: { eventName: 'touchmove', inputType: 'touch', eventType: 'move', order: 1, windowEvent: false, queue: true },            
            pointermove: { eventName: 'mousemove', inputType: 'pointer', eventType: 'move', order: 2, windowEvent: false, queue: true },                   
            mousemove: { eventName: 'mousemove', inputType: 'mouse', eventType: 'move', order: 3, windowEvent: false, queue: true  }
        };
        
        this.wheelEvents = {
            wheel: { eventName: 'wheel', inputType: '', eventType: 'wheel', order: 1, windowEvent: false, queue: true },
            mousewheel: { eventName: 'wheel', inputType: '', eventType: 'wheel', order: 1, windowEvent: false, queue: true },                
        };
        
        this.allEvents = {
            ...this.startEvents,
            ...this.endEvents,
            ...this.cancelEvents,
            ...this.leaveEvents,            
            ...this.moveEvents,
            ...this.wheelEvents,
            ...this.windowEvents,
            ...this.windowScrollEvents            
        };        

        this.bindedHandleEvent = this.bindedHandleEvent || this.handleEvent.bind(this);
    }

    attachEvents($dom, eventMap) {
        Object.keys(eventMap).forEach(key => {
            $dom.addEvent(key, this.bindedHandleEvent);
        });
    }
    
    detachWindowEvents() {
        Object.keys(this.windowEvents).forEach(key => {
            tApp.$window.detachEvent(key, this.bindedHandleEvent);
        });
    }
    
    attachWindowEvents() {
        this.attachEvents(tApp.$window, this.windowEvents);
    }
    
    attachTargetEvents(targetName) {
        if (this.eventTargetMap[targetName]) {
            return;
        }
        this.eventTargetMap[targetName] = true;
        const events = TargetUtil.targetToEventsMapping[targetName];
        events.forEach(event => {
            if (targetName === 'onTouchStart') {
                this.ignoreStartEvents = false;
            }
            if (!this.attachedEventMap[event]) {
                this.attachedEventMap[event] = this.$document;
                this.attachEvents(this.attachedEventMap[event], this[event]);
            }
        })
    }
    
    detachAll() {
        const events = Object.keys(this.attachedEventMap);
        events.forEach(event => {
            const $dom = this.attachedEventMap[event];
            const eventMap = this[event];
            Object.keys(eventMap).forEach(key => {
                $dom.detachEvent(key, this.bindedHandleEvent);
            });
        });   
    }
    
    resetEventsOnTimeout() {
        if (this.currentTouch.deltaY || this.currentTouch.deltaX || this.currentTouch.pinchDelta) {
            const diff = this.touchTimeStamp - TUtil.now();
                                                
            if (diff > 100) {
                                                
                this.currentTouch.deltaY *= 0.95;
                this.currentTouch.deltaX *= 0.95;
                this.currentTouch.pinchDelta *= 0.95;
                
                if (Math.abs(this.currentTouch.deltaY) < 0.1) {
                    this.currentTouch.deltaY = 0;
                }
                if (Math.abs(this.currentTouch.deltaX) < 0.1) {
                    this.currentTouch.deltaX = 0;
                }
                if (Math.abs(this.currentTouch.pinchDelta) < 0.1) {
                    this.currentTouch.pinchDelta = 0;
                }                

                if (this.currentTouch.deltaX === 0 && this.currentTouch.deltaY === 0 && this.currentTouch.pinchDelta === 0) { 
                    this.touchTimeStamp = 0;
                }
                                
            }
            
            if (diff <= 0 || this.touchTimeStamp === 0) {
                this.currentTouch.deltaY = 0;
                this.currentTouch.deltaX = 0;
                this.currentTouch.pinchDelta = 0;
                this.touchTimeStamp = 0;
            }
            
            getRunScheduler().schedule(10, "scroll decay");      
        }
    }
    
    findEventHandlers({ tmodel, eventType }) {
        
        let touchHandler, swipeHandler, scrollLeftHandler, scrollTopHandler, pinchHandler, focusHandler;
        
        if (tmodel) {
            touchHandler = SearchUtil.findFirstTouchHandler(tmodel);
            swipeHandler = SearchUtil.findFirstSwipeHandler(tmodel);
            scrollLeftHandler = SearchUtil.findFirstScrollLeftHandler(tmodel, eventType);
            scrollTopHandler = SearchUtil.findFirstScrollTopHandler(tmodel, eventType);
            pinchHandler = SearchUtil.findFirstPinchHandler(tmodel);
            focusHandler = $Dom.hasFocus(tmodel) ? tmodel : this.currentHandlers.focus;
        }
                
        if (this.currentHandlers.scrollLeft !== scrollLeftHandler || this.currentHandlers.scrollTop !== scrollTopHandler) {
            this.clearTouch();
        }

        if (this.currentHandlers.touch !== touchHandler) {
            this.currentHandlers.enterEvent = touchHandler;
            this.currentHandlers.leaveEvent = this.currentHandlers.touch;
        }
        
        if (this.currentHandlers.focus !== focusHandler) {
            this.currentHandlers.justFocused = focusHandler;
            this.currentHandlers.blur = this.currentHandlers.focus;
        }
       
        this.currentHandlers.touch = touchHandler;
        this.currentHandlers.swipe = swipeHandler;
        this.currentHandlers.scrollLeft = scrollLeftHandler;
        this.currentHandlers.scrollTop = scrollTopHandler;
        this.currentHandlers.pinch = pinchHandler;
        this.currentHandlers.focus = focusHandler;
    }

    captureEvents() {
        this.currentHandlers.enterEvent = undefined;
        this.currentHandlers.leaveEvent = undefined;
        this.currentHandlers.justFocused = undefined;
        this.currentHandlers.blur = undefined;
        
        if (this.eventQueue.length === 0) {
            this.currentEventName = "";
            this.currentEventType = "";
            this.currentEventTarget = undefined;
            this.currentKey = "";
            return;
        }
        
        const lastEvent = this.eventQueue.shift();
                        
        if (this.canFindHandlers) {
            this.findEventHandlers(lastEvent);
        }
        
        if (lastEvent.eventType === 'end' || lastEvent.eventType === 'click') {
            this.canFindHandlers = true;
        }
        
        this.currentEventName = lastEvent.eventName;
        this.currentEventType = lastEvent.eventType;
        this.currentEventTarget = lastEvent.eventTarget;
        this.currentKey = this.currentTouch.key;
        this.currentTouch.key = "";      
    }    

    handleEvent(event) {
        if (!event) {
            return;
        }

        const { type: originalName, target: eventTarget } = event;
        const eventItem = this.allEvents[originalName];
                        
        if (!eventItem) {
            return;
        }
                
        let { eventName, inputType, eventType, order: eventOrder, queue } = eventItem;
        
        const now = TUtil.now();
                
        const tmodel = this.getTModelFromEvent(event);
        
        const newEvent = { eventName, eventItem, eventType, originalName, tmodel, eventTarget, timeStamp: now };

        if (this.lastEvent?.eventItem) {
            const { eventItem: lastEventItem, timeStamp: lastTimeStamp } = this.lastEvent;
            const rate = now - lastTimeStamp;

            if (inputType && lastEventItem.inputType && lastEventItem.inputType !== inputType && eventOrder > lastEventItem.order) {
                return;
            } else if (this.eventQueue.length > 10 && rate < 50) {
                let capacity = 0;
                for (let i = this.eventQueue.length - 1; i >= 0 && this.eventQueue[i].eventItem?.eventType === eventType; i--) {
                    if (++capacity > 2) {
                        return;
                    }
                }
            }
        }
              
        this.lastEvent = newEvent;
                                
        if (queue) {
            this.eventQueue.push(this.lastEvent);
        }
                       
        switch (eventName) {
            case 'mousedown':
            case 'touchstart':
                this.clearStart();
                this.clearTouch();

                this.touchCount = this.countTouches(event);
                this.canFindHandlers = false;
                if (this.preventDefault(tmodel, eventName)) {
                    event.preventDefault();
                }
                
                this.start0 = this.getTouch(event);
                this.start1 = this.getTouch(event, 1);
                
                this.cursor.x = this.start0.x;
                this.cursor.y = this.start0.y;
                
                this.findEventHandlers(this.lastEvent); 
                
                this.swipeStartX = this.start0.x - this.currentHandlers.swipe?.getX();
                this.swipeStartY = this.start0.y - this.currentHandlers.swipe?.getY();
                
                event.stopPropagation();
                
                if (this.ignoreStartEvents) {
                    return;
                } else {
                    break;
                }

            case 'mousemove':
            case 'touchmove': {
                const touch = this.getTouch(event);
                this.cursor.x = touch.x;
                this.cursor.y = touch.y;
                if (this.preventDefault(tmodel, eventName)) {
                    event.preventDefault();
                }
                if (this.touchCount > 0) {
                    this.touchTimeStamp = now + 10;
                    
                    this.move(event);
                    event.stopPropagation();
                } else if (this.isCurrentSource('wheel')) {
                    this.clearTouch();                    
                }
                break;
            }
            case 'mouseup':
            case 'touchend':
                if (this.preventDefault(tmodel, eventName)) {
                    event.preventDefault();
                }
                this.end(event);

                if (this.start0) {
                    const deltaX = this.end0 ? Math.abs(this.end0.originalX - this.start0.originalX) : 0;
                    const deltaY = this.end0 ? Math.abs(this.end0.originalY - this.start0.originalY) : 0;
                    const period = this.end0 ? Math.abs(this.end0.timeStamp - this.start0.timeStamp) : 300;

                    if (deltaX <= 1 && deltaY <= 1 && period <= 300) {
                        this.eventQueue.length = 0; //remove the end event as it is not a swipe and all the others
                        eventName = 'click';
                        eventType = 'click';
                        this.eventQueue.push({ eventName, eventItem, eventType, originalName, tmodel, eventTarget, timeStamp: now });
                    }
                }

                this.clearStart();
                this.touchCount = 0; 

                event.stopPropagation();
                break;

            case 'wheel':
                if (this.preventDefault(tmodel, eventName)) {
                    event.preventDefault();
                }
                this.touchTimeStamp = now + 500;
                this.wheel(event);
                break;

            case 'key':
                this.currentTouch.key = event.which || event.keyCode;
                break;
                
            case 'resize':
                this.resizeRoot();
                break;              
        }
        
        getRunScheduler().schedule(0, `${originalName}-${eventName}-${(event.target.tagName || "").toUpperCase()}`);
    }
    
    resizeRoot() {
        tRoot().val('width', tRoot().targets.width());
        tRoot().val('height', tRoot().targets.height());        
    }

    preventDefault(tmodel, eventName) {
        if (tmodel && (tmodel.keepEventDefault() === true || (Array.isArray(tmodel.keepEventDefault()) && tmodel.keepEventDefault().includes(eventName)))) {
            return false;
        }
        return true;
    }

    getTModelFromEvent(event) {
        let oid = event.target?.id;
        
        if (!oid || !tApp.manager.visibleOidMap[oid]) {
            oid = $Dom.findNearestParentWithId(event.target);
        }
        
        return tApp.manager.visibleOidMap[oid];
    }

    clearStart() {
        this.start0 = undefined;
        this.start1 = undefined;
        this.end0 = undefined;
        this.end1 = undefined;
    }

    clearTouch() {
        this.currentTouch = {
            deltaY: 0,
            deltaX: 0,
            pinchDelta: 0,
            key: '',
            manualMomentumFlag: false,
            orientation: "none",
            dir: "",
            source: ""
        };
    }

    clearAll() {
        this.clearStart();
        this.clearTouch();
        this.eventQueue.length = 0;
        this.touchTimeStamp = 0;
        this.touchCount = 0; 
        this.canFindHandlers = true;
        this.lastEvent = undefined;
        this.attachedEventMap = {};
        this.eventTargetMap = {};
        this.ignoreStartEvents = true;
        this.swipeStartX = 0;
        this.swipeStartY = 0;
    }

    deltaX() {
        return this.currentTouch.deltaX;
    }

    deltaY() {
        return this.currentTouch.deltaY;
    }
    
    cursorX() {
        return this.cursor.x;
    }
    
    cursorY() {
        return this.cursor.y;
    }
    
    swipeX() {
        return this.cursor.x - this.swipeStartX;
    }

    swipeY() {
        return this.cursor.y - this.swipeStartY;
    }
    
    pinchDelta() {
        return this.currentTouch.pinchDelta;
    }

    dir() {
        return this.currentTouch.dir;
    }

    getScrollLeftHandler() {
        return this.currentHandlers.scrollLeft;
    }

    getScrollTopHandler() {
        return this.currentHandlers.scrollTop;
    }

    getPinchHandler() {
        return this.currentHandlers.pinch;
    }

    getTouchHandler() {
        return this.currentHandlers.touch;
    }

    getTouchHandlerType() {
        return this.currentHandlers.touch ? this.currentHandlers.touch.type : null;
    }

    getTouchHandlerOid() {
        return this.currentHandlers.touch ? this.currentHandlers.touch.oid : null;
    }
    
    getTouchCount() {
        return this.touchCount;
    }

    isClickEvent() {
        return this.getEventType() === 'click';
    }
    
    isResizeEvent() {
        return this.getEventType() === 'resize';
    }
    
    isSwipeEvent() {
        return this.hasDelta() && this.touchCount === 1;
    }
    
    isScrollEvent() {
        return this.hasDelta() && this.isCurrentSource('wheel');        
    }
    
    hasDelta() {
        return Math.abs(this.deltaX()) >= 0 || Math.abs(this.deltaY()) >= 0;
    }
    isEndEvent() {
        return this.getEventType() === 'end' || this.getEventType() === 'click';
    }
    
    isStartEvent() {
        return this.getEventType() === 'start';        
    }

    getEventName() {
        return this.currentEventName;
    }
    
    getEventTarget() {
        return this.currentEventTarget;
    }
    
    getEventType() {
        return this.currentEventType;
    }  
    
    isClickHandler(handler) {
        return this.getTouchHandler() === handler && this.isClickEvent();
    }

    isClickHandlerType(type) {
        return this.getTouchHandlerType() === type && this.isClickEvent();
    }
    
    isTouchHandler(handler) {
        return this.getTouchHandler() === handler && handler.canHandleEvents('touch');
    }
    
    isEnterEventHandler(handler) {
        return TUtil.contains(handler, this.currentHandlers.enterEvent) && !TUtil.contains(handler, this.currentHandlers.leaveEvent);
    }
    
    isLeaveEventHandler(handler) {
        return TUtil.contains(handler, this.currentHandlers.leaveEvent) && !TUtil.contains(handler, this.currentHandlers.enterEvent);
    }
    
    onFocus(handler) {
        return this.currentHandlers.justFocused === handler;        
    }
    
    onBlur(handler) {
        return this.currentHandlers.blur === handler;        
    } 
    
    hasFocus(handler) {
        return this.currentHandlers.focus === handler;
    }
    
    isTouchHandlerType(type) {
        return this.getTouchHandlerType() === type;
    }

    isScrollLeftHandler(handler) {
        return this.currentHandlers.scrollLeft === handler;
    }

    isScrollTopHandler(handler) {
        return this.currentHandlers.scrollTop === handler;
    }

    isPinchHandler(handler) {
        return this.currentHandlers.pinch === handler;
    }

    isCurrentSource(source) {
        return this.currentTouch.source === source;
    }

    isTouchHandlerOrAncestor(target) {
        const handler = this.getTouchHandler();

        while (target) {
            if (target === handler) {
                return true;
            }
            target = target.getParent();
        }

        return false;
    }
    
    isTouchHandlerOrParent(target) {
        const handler = this.getTouchHandler();

        return target === handler || target.getParent() === handler;
    }   
    
    containsTouchHandler(tmodel) {
        return TUtil.contains(tmodel, this.getTouchHandler());      
    }

    countTouches(event) {
        return event.touches?.length ||
            event.originalEvent?.touches?.length ||
            1;
    }

    getTouch(event, index = 0) {
        const e = event.touches?.[index] ||
            event.originalEvent?.touches?.[index] ||
            event;

        const x = TUtil.isDefined(e.clientX) ? e.clientX : e.pageX || 0;
        const y = TUtil.isDefined(e.clientY) ? e.clientY : e.pageY || 0;
        return {
            x,
            y,
            originalX: x,
            originalY: y,
            target: e.target,
            timeStamp: TUtil.now()
        };
    }

    move(event) {
        if (this.touchCount === 1) {
            this.start0.y = this.end0 ? this.end0.y : this.start0.y;
            this.start0.x = this.end0 ? this.end0.x : this.start0.x;

            this.end0 = this.getTouch(event);
            
            if (TUtil.isDefined(this.end0)) {
                const deltaX = this.start0.x - this.end0.x;
                const deltaY = this.start0.y - this.end0.y;
                this.setDeltaXDeltaY(deltaX, deltaY, 'touch');
            }
        } else if (this.touchCount >= 2) {
            this.end0 = this.getTouch(event);
            this.end1 = this.getTouch(event, 1);

            const length1 = TUtil.distance(this.start0.x, this.start0.y, this.start1.x, this.start1.y);
            const length2 = TUtil.distance(this.end0.x, this.end0.y, this.end1.x, this.end1.y);

            const diff = length2 - length1;

            this.currentTouch.pinchDelta = diff > 0 ? 0.3 : diff < 0 ? -0.3 : 0;
        }
    }

    end() {
        if (this.touchCount <= 1 && this.start0) {
                        
            let deltaX = 0, deltaY = 0, period = 0, startPeriod = 0;
            
            if (TUtil.isDefined(this.end0)) {
                deltaX = this.start0.originalX - this.end0.x;
                deltaY = this.start0.originalY - this.end0.y;
                startPeriod = TUtil.now() - this.start0.timeStamp;
                period = startPeriod < 250 ? TUtil.now() - this.start0.timeStamp : 0;
            }
            let momentum;
                        
            if (this.currentTouch.orientation === "horizontal" && Math.abs(deltaX) > 0 && period > 0) {
                momentum = TUtil.momentum(0, deltaX, period);
                this.touchTimeStamp = this.end0.timeStamp + momentum.duration;
                if ((this.touchTimeStamp - TUtil.now()) > 0) {                
                    this.currentTouch.deltaX = momentum.distance;
                    this.currentTouch.manualMomentumFlag = true;
                }
            } else if (this.currentTouch.orientation === "vertical" && Math.abs(deltaY) > 0 && period > 0) {
                momentum = TUtil.momentum(0, deltaY, period);
                this.touchTimeStamp = this.end0.timeStamp + momentum.duration;
                if ((this.touchTimeStamp - TUtil.now()) > 0) {                    
                    this.currentTouch.deltaY = momentum.distance;
                    this.currentTouch.manualMomentumFlag = true;
                }
            } 
        }
    }

    setDeltaXDeltaY(deltaX, deltaY, source) {
        const diff = Math.abs(deltaX) - Math.abs(deltaY);

        if (diff >= 1) {
            if (this.currentTouch.orientation === "none" ||
                    (this.currentTouch.orientation === "vertical" && diff > 3) ||
                    this.currentTouch.orientation === "horizontal") {
                this.currentTouch.orientation = "horizontal";
                this.currentTouch.dir = deltaX <= -1 ? "left" : deltaX >= 1 ? "right" : this.currentTouch.dir;
                this.currentTouch.source = source;
            }
        } else if (this.currentTouch.orientation === "none" || 
                (this.currentTouch.orientation === "horizontal" && diff < -3) || 
                this.currentTouch.orientation === "vertical") {
            this.currentTouch.orientation = "vertical";
            this.currentTouch.dir = deltaY <= -1 ? "up" : deltaY >= 1 ? "down" : this.currentTouch.dir;
            this.currentTouch.source = source;
        }
        
        this.currentTouch.deltaY = deltaY;
        this.currentTouch.deltaX = deltaX;
    }

    wheel(event) {
        let deltaX = 0;
        let deltaY = 0;

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
    }
}

export { EventListener };
