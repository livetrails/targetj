import { $Dom } from "./$Dom.js";
import { SearchUtil } from "./SearchUtil.js";
import { TUtil } from "./TUtil.js";
import { tApp, getRunScheduler, tRoot } from "./App.js";

/**
 * It provides a central place to manage all events. 
 */
class EventListener {
    constructor() {
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

        this.touchTimeStamp = 0;

        this.cursor = { x: 0, y: 0 };
        this.start0 = undefined;
        this.start1 = undefined;
        this.end0 = undefined;
        this.end1 = undefined;
        this.touchCount = 0;
        this.canFindHandlers = true;
        
        this.currentEventName = "";
        this.currentEventType = "";
        this.currentHandlers = { 
            touch: null, 
            scrollLeft: null, 
            scrollTop: null, 
            pinch: null,
            enterEvent: null,
            leaveEvent: null,
            focus: null,
            justFocused: null,
            blur: null
        };

        this.eventQueue = [];

        this.eventMap = {
            touchstart: { eventName: 'touchstart', inputType: 'touch', eventType: 'start', order: 1, windowEvent: false, queue: true },
            touchmove: { eventName: 'touchmove', inputType: 'touch', eventType: 'move', order: 1, windowEvent: false, queue: true },
            touchend: { eventName: 'touchend', inputType: 'touch', eventType: 'end', order: 1, windowEvent: false, queue: true },
            touchcancel: { eventName: 'touchend', inputType: 'touch', eventType: 'cancel', order: 1, windowEvent: false, queue: true },

            mousedown: { eventName: 'mousedown', inputType: 'mouse', eventType: 'start', order: 2, windowEvent: false, queue: true },
            mousemove: { eventName: 'mousemove', inputType: 'mouse', eventType: 'move', order: 2, windowEvent: false, queue: true  },
            mouseup: { eventName: 'mouseup', inputType: 'mouse', eventType: 'end', order: 2, windowEvent: false, queue: true },
            mousecancel: { eventName: 'mouseup', inputType: 'mouse', eventType: 'cancel', order: 2, windowEvent: false, queue: true },
            mouseleave: { eventName: 'mouseleave', inputType: 'mouse', eventType: 'cancel', order: 2, windowEvent: false, queue: true },

            pointerdown: { eventName: 'mousedown', inputType: 'pointer', eventType: 'start', order: 3, windowEvent: false, queue: true },
            pointermove: { eventName: 'mousemove', inputType: 'pointer', eventType: 'move', order: 3, windowEvent: false, queue: true },
            pointerup: { eventName: 'mouseup', inputType: 'pointer', eventType: 'end', order: 3, windowEvent: false, queue: true },
            pointercancel: { eventName: 'mousecancel', inputType: 'pointer', eventType: 'cancel', order: 3, windowEvent: false, queue: true },

            wheel: { eventName: 'wheel', inputType: '', eventType: 'wheel', order: 1, windowEvent: false, queue: true },
            DOMMouseScroll: { eventName: 'wheel', inputType: '', eventType: 'wheel', order: 1, windowEvent: false, queue: true },
            mousewheel: { eventName: 'wheel', inputType: '', eventType: 'wheel', order: 1, windowEvent: false, queue: true },

            blur: { eventName: 'blur', inputType: 'mouse', eventType: 'cancel', order: 2, windowEvent: true, queue: true },
            keyup: { eventName: 'key', inputType: '', eventType: 'key', order: 1, windowEvent: true, queue: true },
            keydown: { eventName: 'key', inputType: '', eventType: 'key', order: 1, windowEvent: true, queue: true },
            resize: { eventName: 'resize', inputType: '', eventType: 'resize', order: 1, windowEvent: true, queue: false },
            orientationchange: { eventName: 'resize', inputType: '', eventType: 'resize', order: 1, windowEvent: true, queue: false }          
        };

        this.domEvents = Object.keys(this.eventMap).filter(key => !this.eventMap[key].windowEvent);
        this.windowEvents = Object.keys(this.eventMap).filter(key => this.eventMap[key].windowEvent);

        this.bindedHandleEvent = this.bindedHandleEvent || this.handleEvent.bind(this);
    }

    removeHandlers($dom) {
        this.domEvents.forEach(key => {
            $dom.detachEvent(key, this.bindedHandleEvent);
        });
    }

    addHandlers($dom) {
        this.domEvents.forEach(key => {
            $dom.addEvent(key, this.bindedHandleEvent);
        });
    }

    removeWindowHandlers() {
        this.windowEvents.forEach(key => {
            tApp.$window.detachEvent(key, this.bindedHandleEvent);
        });
    }

    addWindowHandlers() {
        this.windowEvents.forEach(key => {
            tApp.$window.addEvent(key, this.bindedHandleEvent);
        });
    }
    
    resetEventsOnTimeout() {
        if (this.touchTimeStamp > 0) {
            const diff = TUtil.now() - this.touchTimeStamp;
            let runDelay = 0;

            if (
                Math.abs(this.currentTouch.deltaY) > 0.001 ||
                Math.abs(this.currentTouch.deltaX) > 0.001 ||
                Math.abs(this.currentTouch.pinchDelta) > 0.001
            ) {
                if (diff > 70) {
                    this.clearTouch();
                } else if (this.currentTouch.manualMomentumFlag) {
                    this.currentTouch.deltaY *= 0.85;
                    this.currentTouch.deltaX *= 0.85;
                    runDelay = 10;
                }
            } else if (diff > 600) {
                this.clearTouch();
                this.touchTimeStamp = 0;
            }

            getRunScheduler().schedule(runDelay, "scroll decay");
        }
    } 
    
    findEventHandlers({ tmodel, eventType, eventTarget }) {
        
        let touchHandler, scrollLeftHandler, scrollTopHandler, pinchHandler, focusHandler;
       
        if (tmodel) {
            touchHandler = SearchUtil.findFirstTouchHandler(tmodel);            
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
            this.currentHandlers.leaveEvent = this.currentHandlers.touch?.$dom?.contains(eventTarget) ? undefined : this.currentHandlers.touch;
        }
        
        if (this.currentHandlers.focus !== focusHandler) {
            this.currentHandlers.justFocused = focusHandler;
            this.currentHandlers.blur = this.currentHandlers.focus;
        }
       
        this.currentHandlers.touch = touchHandler;
        this.currentHandlers.scrollLeft = scrollLeftHandler;
        this.currentHandlers.scrollTop = scrollTopHandler;
        this.currentHandlers.pinch = pinchHandler;
        this.currentHandlers.focus = focusHandler;
    }    

    captureEvents() {
        this.currentHandlers.enterEvent = null;
        this.currentHandlers.leaveEvent = null;
        this.currentHandlers.justFocused = null;
        this.currentHandlers.blur = null;
        
        if (this.eventQueue.length === 0) {
            this.currentEventName = "";
            this.currentEventType = "";
            this.currentKey = "";
            return;
        }
        const lastEvent = this.eventQueue.shift();
        
        if (this.canFindHandlers) {
            this.findEventHandlers(lastEvent);
        }
        
        if (lastEvent.eventType === 'end') {
            this.canFindHandlers = true;
        }

        this.currentEventName = lastEvent.eventName;
        this.currentEventType = lastEvent.eventType;
        this.currentKey = this.currentTouch.key;
        this.currentTouch.key = "";
        
        getRunScheduler().schedule(10, `captureEvents-${lastEvent}`);
    }    

    handleEvent(event) {
        if (!event) {
            return;
        }

        const { type: originalName, target: eventTarget } = event;
        const eventItem = this.eventMap[originalName];

        if (!eventItem) {
            return;
        }

        const { eventName, inputType, eventType, order: eventOrder, queue } = eventItem;

        const now = TUtil.now();
        this.touchTimeStamp = Math.max(now, this.touchTimeStamp);

        const tmodel = this.getTModelFromEvent(event);

        const lastEvent = this.eventQueue.length > 0 ? this.eventQueue[this.eventQueue.length - 1] : null;

        if (lastEvent && lastEvent.eventItem) {
            const { eventItem: lastEventItem, timeStamp: lastTimeStamp } = lastEvent;
            const rate = now - lastTimeStamp;

            if (inputType && lastEventItem.inputType && lastEventItem.inputType !== inputType && eventOrder > lastEventItem.order) {
                return;
            } else if (this.eventQueue.length > 10 && rate < 50) {
                let capacity = 0;
                for (let i = this.eventQueue.length - 1; i >= 0 && this.eventQueue[i].eventItem?.eventType === eventType; i--) {
                    if (++capacity > 5) {
                        return;
                    }
                }
            }
        }

        const newEvent = { eventName, eventItem, eventType, originalName, tmodel, timeStamp: now, eventTarget };

        if (queue) {
            this.eventQueue.push(newEvent);
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
                
                this.findEventHandlers(newEvent);                

                event.stopPropagation();
                break;

            case 'mousemove':
            case 'touchmove': {
                const touch = this.getTouch(event);
                this.cursor.x = touch.x;
                this.cursor.y = touch.y;
                if (this.preventDefault(tmodel, eventName)) {
                    event.preventDefault();
                }
                if (this.touchCount > 0) {                    
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
                        this.eventQueue.pop(); //remove the end event as it is not a swipe
                        this.eventQueue.push({ eventName: 'click', eventItem, eventType: 'click', originalName, tmodel, timeStamp: now });
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
                this.wheel(event);
                break;

            case 'key':
                this.currentTouch.key = event.which || event.keyCode;
                break;
                
            case 'resize':
                tRoot().val('width', tRoot().targets.width());
                tRoot().val('height', tRoot().targets.height());
                break;              
        }

        getRunScheduler().schedule(0, `${originalName}-${eventName}-${(event.target.tagName || "").toUpperCase()}`);
    }

    preventDefault(tmodel, eventName) {
        if (tmodel && (tmodel.keepEventDefault() === true || (Array.isArray(tmodel.keepEventDefault()) && tmodel.keepEventDefault().includes(eventName)))) {
            return false;
        }
        return true;
    }

    getTModelFromEvent(event) {
        let oid = typeof event.target.getAttribute === 'function' ? event.target.getAttribute('id') : '';

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
    
    swipeX(handler) {
        return this.cursor.x - (this.start0.x - handler.getX());
    }

    swipeY(handler) {
        return this.cursor.y - (this.start0.y - handler.getY());
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
        return this.deltaX() !== 0 || this.deltaY() !== 0;
    }
    isEndEvent() {
        return this.getEventType() === 'end';
    }
    
    isStartEvent() {
        return this.getEventType() === 'start';        
    }

    getEventName() {
        return this.currentEventName;
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
    
    isTouchEndHandler(handler) {
        return this.getTouchHandler() === handler && this.getEventType() === 'end';
    }

    isTouchHandler(handler) {
        return this.getTouchHandler() === handler && handler.canHandleEvents('touch');
    }
    
    isEnterEventHandler(handler) {
        return this.currentHandlers.enterEvent === handler || this.currentHandlers.enterEvent?.getDomParent() === handler;
    }
    
    isLeaveEventHandler(handler) {
        const parent = this.currentHandlers.leaveEvent?.getDomParent();
        return this.currentHandlers.leaveEvent === handler || (parent === handler && this.currentHandlers.enterEvent !== parent);
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
    
    isTouchHandlerOrChild(target) {
        const handler = this.getTouchHandler();
        return target === handler || handler?.getParent() === target;        
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
            const deltaX = this.end0 ? this.start0.x - this.end0.x : 0;
            const deltaY = this.end0 ? this.start0.y - this.end0.y : 0;
            const period = this.end0 ? this.end0.timeStamp - this.start0.timeStamp : 0;

            let momentum;

            if (this.currentTouch.orientation === "horizontal" && Math.abs(deltaX) > 1) {
                momentum = TUtil.momentum(0, deltaX, period);
                this.currentTouch.deltaX = momentum.distance;
                this.currentTouch.manualMomentumFlag = true;
                this.touchTimeStamp = TUtil.now() + momentum.duration;
            } else if (this.currentTouch.orientation === "vertical" && Math.abs(deltaY) > 1) {
                momentum = TUtil.momentum(0, deltaY, period);
                this.currentTouch.deltaY = momentum.distance;
                this.currentTouch.manualMomentumFlag = true;
                this.touchTimeStamp = TUtil.now() + momentum.duration;
            }
        }
    }

    setDeltaXDeltaY(deltaX, deltaY, source) {
        const diff = Math.abs(deltaX) - Math.abs(deltaY);

        if (diff >= 1) {
            if (
                this.currentTouch.orientation === "none" ||
                (this.currentTouch.orientation === "vertical" && diff > 3) ||
                this.currentTouch.orientation === "horizontal"
            ) {
                this.currentTouch.orientation = "horizontal";
                this.currentTouch.dir = deltaX <= -1 ? "left" : deltaX >= 1 ? "right" : this.currentTouch.dir;
                this.currentTouch.source = source;
            }
        } else if (
            this.currentTouch.orientation === "none" ||
            (this.currentTouch.orientation === "horizontal" && diff < -3) ||
            this.currentTouch.orientation === "vertical"
        ) {
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
