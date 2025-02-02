import { TModel } from "./TModel.js";
import { getRunScheduler, getManager, getEvents, getResizeLastUpdate } from "./App.js";
import { TUtil } from "./TUtil.js";
import { ColorUtil } from "./ColorUtil.js";

/**
 * It provides helper functions for target management, such as deriving the values for steps, intervals, and cycles from targets.
 */
class TargetUtil {

    static transformMap = {
        x: true,
        y: true,
        z: true,
        translateX: true,
        translateY: true,
        translateZ: true,
        perspective: true,
        rotate: true,
        rotateX: true,
        rotateY: true,
        rotateZ: true,
        rotate3DX: true,
        rotate3DY: true,
        rotate3DZ: true,
        rotate3DAngle: true,
        scale: true,
        scaleX: true,
        scaleY: true,
        scaleZ: true,
        scale3DX: true,
        scale3DY: true,
        scale3DZ: true,
        skew: true,
        skewX: true,
        skewY: true
    };
  
    static dimMap = {
        width: true,
        height: true
    };
    
    static styleWithUnitMap = {
        fontSize: true,
        lineHeight: true,
        borderRadius: true,
        padding: true,
        left: true,
        top: true,
        letterSpacing: true
    }

    static colorMap = {
        color: true,
        background: true,
        backgroundColor: true
    };
    
    static styleTargetMap = {
        ...TargetUtil.transformMap,
        ...TargetUtil.dimMap,
        ...TargetUtil.styleWithUnitMap,
        ...TargetUtil.colorMap,
        opacity: true,
        zIndex: true,
        border: true,
        borderTop: true,
        borderLeft: true,
        borderRight: true,
        borderBottom: true
    };
    
    static asyncStyleTargetMap = {
        position: true,
        css: true,
        style: true,
        textAlign: true,
        boxSizing: true,
        transformStyle: true,
        transformOrigin: true,
        attributes: true,
        justifyContent: true,
        alignItems: true,
        display: true,
        cursor: true,
        fontFamily: true,
        overflow: true,
        textDecoration: true,
        boxShadow: true,
        fontWeight: true
    };
    
    static scaleMap = {
        scale: true,
        scaleX: true,
        scaleY: true,
        scaleZ: true,
        scale3DX: true,
        scale3DY: true,
        scale3DZ: true        
    };    
    
    static rotate3D = {
        rotate3DX: true,
        rotate3DY: true,
        rotate3DZ: true       
    };
    
    static attributeTargetMap = {
        lang: true, 
        autofocus: true,
        placeholder: true,
        autocomplete: true,
        name: true,
        type: true,
        src: true,
        href: true,
        method: true,
        size: true,
        value: true,
        maxlength: true,
        minlength: true,
        max: true,
        min: true,
        readonly: true,
        required: true,
        alt: true,
        disabled: true,
        action: true,
        accept: true,
        selected: true,
        rows: true,
        cols: true,
        tabindex: true
    };
    
    static mustExecuteTargets = {
        width: true,
        height: true,
        canHandleEvents: true,
        heightFromDom: true,
        widthFromDom: true
    };
    
    static coreTargetMap = {
        x: true,
        y: true
    };
    
    static cssFunctionMap = {
        skew: { x: 0, y: 0 },
        translate3d: { x: 0, y: 0, z: 0 },
        rotate3d: { x: 0, y: 0, z: 0, a: 0 },
        scale3d: { x: 0, y: 0, z: 0 }
    };
     
    static emptyValue() {
        return {
            value: undefined,
            step: 0,
            steps: 0,
            cycle: 0,
            cycles: 0,
            interval: 0,
            initialValue: undefined,
            scheduleTimeStamp: undefined,
            actualValueLastUpdate: 0,
            status: '',
            executionCount: 0,
            executionFlag: false,
            isImperative: false,
            originalTargetName: undefined,
            easing: undefined,
            creationTime: TUtil.now()
        };
    }
    
    static bypassInitialProcessingTargetMap = {
        onChildrenChange: true,
        onVisibleChildrenChange: true,
        onPageClose: true,
        onVisible: true
    };
    
    static targetToEventsMapping = {
        onClickEvent: [ 'clickEvents', 'touchStart', 'touchEnd', 'startEvents' ],
        onTouchStart: [ 'touchStart', 'startEvents' ],
        onTouchEnd: [ 'touchEnd', 'endEvents' ],
        onSwipeEvent: [ 'touchStart', 'startEvents', 'touchEnd', 'endEvents', 'cancelEvents', 'moveEvents' ],
        onAnySwipeEvent: [ 'touchStart', 'startEvents', 'touchEnd', 'endEvents', 'cancelEvents', 'moveEvents' ],
        onTouchEvent: [ 'touchStart', 'startEvents', 'touchEnd', 'endEvents', 'cancelEvents' ],
        onEnterEvent: [ 'moveEvents', 'leaveEvents' ],
        onLeaveEvent: [ 'moveEvents', 'leaveEvents' ],
        onScrollEvent: [ 'touchStart', 'startEvents', 'touchEnd', 'endEvents', 'cancelEvents', 'moveEvents', 'wheelEvents' ],
        onWindowScrollEvent: [ 'windowScrollEvents' ],
        
        onClick: [ 'clickEvents', 'touchStart', 'touchEnd', 'startEvents' ],
        onSwipe: [ 'touchStart', 'startEvents', 'touchEnd', 'endEvents', 'cancelEvents', 'moveEvents' ],
        onAnySwipe: [ 'touchStart', 'startEvents', 'touchEnd', 'endEvents', 'cancelEvents', 'moveEvents' ],
        onTouch: [ 'touchStart', 'startEvents', 'touchEnd', 'endEvents', 'cancelEvents' ],
        onEnter: [ 'moveEvents', 'leaveEvents' ],
        onLeave: [ 'moveEvents', 'leaveEvents' ],
        onScroll: [ 'touchStart', 'startEvents', 'touchEnd', 'endEvents', 'cancelEvents', 'moveEvents', 'wheelEvents' ],
        onScrollLeft: [ 'touchStart', 'startEvents', 'touchEnd', 'endEvents', 'cancelEvents', 'moveEvents', 'wheelEvents' ],
        onScrollTop: [ 'touchStart', 'startEvents', 'touchEnd', 'endEvents', 'cancelEvents', 'moveEvents', 'wheelEvents' ],        
        onWindowScroll: [ 'windowScrollEvents' ]
    };
    
    static touchEventMap = {
        onClickEvent: tmodel => getEvents().getEventType() === 'click' && getEvents().isClickHandler(tmodel),
        onTouchStart: tmodel => getEvents().isStartEvent() && getEvents().containsTouchHandler(tmodel),
        onTouchEnd: tmodel => getEvents().isEndEvent() && getEvents().containsTouchHandler(tmodel),
        onEnterEvent: tmodel => getEvents().isEnterEventHandler(tmodel),
        onLeaveEvent: tmodel => getEvents().isLeaveEventHandler(tmodel),        
        onSwipeEvent: tmodel => getEvents().containsTouchHandler(tmodel) && getEvents().isSwipeEvent(),        
        onAnySwipeEvent: () => getEvents().isSwipeEvent(),
        onTouchEvent: tmodel => getEvents().isTouchHandler(tmodel),
        
        onClick: tmodel => getEvents().getEventType() === 'click' && getEvents().isClickHandler(tmodel),
        onEnter: tmodel => getEvents().isEnterEventHandler(tmodel),
        onLeave: tmodel => getEvents().isLeaveEventHandler(tmodel),        
        onSwipe: tmodel => getEvents().containsTouchHandler(tmodel) && getEvents().isSwipeEvent(),        
        onAnySwipe: () => getEvents().isSwipeEvent(),
        onTouch: tmodel => getEvents().isTouchHandler(tmodel)
    };
    
    static internalEventMap = {
        onVisibleEvent: tmodel => tmodel.isNowVisible,
        onDomEvent: tmodel => tmodel.hasDomNow,
        onVisible: tmodel => tmodel.isNowVisible,
        onResize: tmodel => {            
            const lastUpdate = tmodel.getDimLastUpdate();
            const parent = tmodel.getParent();
            const resizeLastUpdate = parent ? Math.max(parent.getDimLastUpdate(), getResizeLastUpdate()) : getResizeLastUpdate();

            if (lastUpdate > 0 && resizeLastUpdate > lastUpdate) {
                return true;
            }
            
            return false;
        }       
    };
 
    static allEventMap = {
        ...TargetUtil.touchEventMap,
        onFocusEvent: tmodel => getEvents().onFocus(tmodel),
        onBlurEvent: tmodel => getEvents().onBlur(tmodel),
        onKeyEvent: () => getEvents().getEventType() === 'key' && getEvents().currentKey, 
        onScrollEvent: tmodel => (getEvents().isScrollLeftHandler(tmodel) && getEvents().deltaX()) || 
              (getEvents().isScrollTopHandler(tmodel) && getEvents().deltaY()),    
        onWindowScrollEvent: () => getEvents().getEventType() === 'windowScroll',
        
        onFocus: tmodel => getEvents().onFocus(tmodel),
        onBlur: tmodel => getEvents().onBlur(tmodel),
        onKey: () => getEvents().getEventType() === 'key' && getEvents().currentKey, 
        onScroll: tmodel => (getEvents().isScrollLeftHandler(tmodel) && getEvents().deltaX()) || 
              (getEvents().isScrollTopHandler(tmodel) && getEvents().deltaY()),
        onScrollTop: tmodel => getEvents().getOrientation() !== 'horizontal' && getEvents().isScrollTopHandler(tmodel) && getEvents().deltaY(), 
        onScrollLeft: tmodel => getEvents().getOrientation() !== 'vertical' && getEvents().isScrollLeftHandler(tmodel) && getEvents().deltaX(),
        onWindowScroll: () => getEvents().getEventType() === 'windowScroll'        
    };
    
    static getAutoHandleEvents(tmodel) {
        const autoHandleEvents = [];
        const touchEvents = Object.keys(TargetUtil.touchEventMap);

        if (touchEvents.some(event => tmodel.eventTargetMap[event])) {
            autoHandleEvents.push('touch');
        }

        if (tmodel.eventTargetMap['onScrollEvent'] || tmodel.eventTargetMap['onScroll']) {
            autoHandleEvents.push('scrollTop', 'scrollLeft');
        }

        if (tmodel.eventTargetMap['onScrollTop'] && autoHandleEvents.indexOf('scrollTop') === -1) {
            autoHandleEvents.push('scrollTop');
        }
        
        if (tmodel.eventTargetMap['onScrollLeft'] && autoHandleEvents.indexOf('scrollLeft') === -1) {
            autoHandleEvents.push('scrollLeft');
        }        
        
        if (tmodel.eventTargetMap['onSwipeEvent'] || tmodel.eventTargetMap['onSwipe']) {
            autoHandleEvents.push('swipe');
        }

        return autoHandleEvents;
    }
   
    static bindTargetName(instance, key) {
        const target = instance.targets[key];
        const keys = Object.keys(instance.targets);
        const keyIndex = keys.indexOf(key);
        const prevKey = keyIndex > 0 ? keys[keyIndex - 1] : undefined;
        
        const getPrevValue = () => (prevKey !== undefined ? instance.val(prevKey) : undefined);

        let lastPrevUpdateTime = prevKey !== undefined ? instance.getActualValueLastUpdate(prevKey) : undefined;

        const getPrevUpdateTime = () => prevKey !== undefined ? instance.getActualValueLastUpdate(prevKey) : undefined;

        const isPrevTargetUpdated = () => {
            const currentPrevUpdateTime = getPrevUpdateTime();
            if (lastPrevUpdateTime === undefined && currentPrevUpdateTime === undefined) {
                return false;
            }
            if (lastPrevUpdateTime === undefined && currentPrevUpdateTime !== undefined) {
                return true;
            }
            return currentPrevUpdateTime !== lastPrevUpdateTime;
        };

        if (typeof target === 'object') {
            const stepPattern = /^on[A-Za-z]+Step$/;
            const endPattern = /^on[A-Za-z]+End$/;  
            const methods = ['value', 'enabledOn', 'onStepsEnd', 'onValueChange', 'loop', 'onImperativeEnd', 'onImperativeStep', 'onSuccess', 'onError'];

            Object.keys(target).forEach(method => {
                if (typeof target[method] === 'function' && (methods.includes(method) || stepPattern.test(method) || endPattern.test(method))) {
                    const originalMethod = target[method];
                    target[method] = function() {
                        this.key = key;
                        this.prevTargetValue = getPrevValue();
                        this.isPrevTargetUpdated = isPrevTargetUpdated;
                        const result = originalMethod.apply(this, arguments);
                        lastPrevUpdateTime = getPrevUpdateTime() ?? lastPrevUpdateTime;
                        return result;
                    };
                }
            });
        } else if (typeof target === 'function') {
            const originalFunction = target;
            instance.targets[key] = function() {
                this.key = key;
                this.prevTargetValue = getPrevValue();
                this.isPrevTargetUpdated = isPrevTargetUpdated;
                const result = originalFunction.apply(this, arguments);
                lastPrevUpdateTime = getPrevUpdateTime() ?? lastPrevUpdateTime;
                return result;
            };
        }
    }

    static isValueStepsCycleArray(arr) {
        if (arr.length > 4 || arr.length === 0) {
            return false;
        }

        const result = arr.length >= 2;
        for (let i = 1; i < arr.length; i++) {
            if (typeof arr[i] !== 'number') {
                return false;
            }
        }

        return result && (typeof arr[0] === 'number' || TargetUtil.isListTarget(arr[0]) || typeof arr[0] === 'string');
    }

    static isListTarget(value) {
        return typeof value === 'object' && value !== null && Array.isArray(value.list);
    }
    
    static isObjectTarget(key, value) {
        return key !== 'style'
            && typeof value === 'object'
            && value !== null
            && !Array.isArray(value)
            && Object.getPrototypeOf(value) === Object.prototype;
    }
    
    static isChildrenTarget(key, value) {
        return key === 'children' && (Array.isArray(value) || value instanceof TModel);
    }

    static getValueStepsCycles(tmodel, key) {
        const _target = tmodel.targets[key];
        const valueOnly = _target && _target.valueOnly;
        const cycle = tmodel.getTargetCycle(key);
        const lastValue = tmodel.val(key);

        let value = null, steps = 0, interval = 0, cycles = 0;

        function getValue(target) {
            if (Array.isArray(target)) {
                if (valueOnly || !TargetUtil.isValueStepsCycleArray(target)) {
                    return [target, steps, interval, cycles];
                } else if (Array.isArray(_target)) {
                    return _target;
                } else {
                    value = target[0];
                    steps = target.length >= 2 ? target[1] : steps;
                    interval = target.length >= 3 ? target[2] : interval;
                    cycles = target.length >= 4 ? target[3] : cycles;
                    return [value, steps, interval, cycles];
                }
            }

            if (typeof target === 'object' && target !== null && Object.getPrototypeOf(target) === Object.prototype) {
                value = typeof target.value === 'function' ? target.value.call(tmodel, cycle, lastValue) : TUtil.isDefined(target.value) ? target.value : target;
                steps = typeof target.steps === 'function' ? target.steps.call(tmodel, cycle) : TUtil.isDefined(target.steps) ? target.steps : 0;
                interval = typeof target.interval === 'function' ? target.interval.call(tmodel, cycle) : TUtil.isDefined(target.interval) ? target.interval : 0;
                cycles = typeof target.cycles === 'function' ? target.cycles.call(tmodel, cycle, tmodel.getTargetCycles(key)) : TUtil.isDefined(target.cycles) ? target.cycles : 0;

                return Array.isArray(value) ? getValue(value) : [value, steps, interval, cycles];
            }

            if (typeof target === 'function') {
                return getValue(target.call(tmodel, cycle, lastValue));
            }

            return [target, steps, interval, cycles];
        }

        return getValue(_target);
    }

    static getIntervalValue(tmodel, key, interval) {
        const intervalValue = typeof interval === 'function' ? interval.call(tmodel, key) : interval;
        return TUtil.isNumber(intervalValue) ? intervalValue : 0;
    }

    static scheduleExecution(tmodel, key) {
        const interval = tmodel.getTargetInterval(key);

        if (interval <= 0) {
            return 0;
        }
        
        const now = TUtil.now();
        const lastScheduledTime = tmodel.getScheduleTimeStamp(key);
        
        if (TUtil.isDefined(lastScheduledTime)) {
            const elapsed = now - lastScheduledTime;
            return Math.max(interval - elapsed, 0);
        }

        tmodel.setScheduleTimeStamp(key, now);
        
        return interval;
    }    

    static getTargetSchedulePeriod(tmodel, key, intervalValue) {
        const now = TUtil.now();
        let pastPeriod;
        let schedulePeriod = 0;

        if (intervalValue > 0) {
            if (TUtil.isDefined(tmodel.getTargetTimeStamp(key))) {
                pastPeriod = now - tmodel.getTargetTimeStamp(key);
                if (pastPeriod < intervalValue) {
                    schedulePeriod = intervalValue - pastPeriod;
                } else {
                    schedulePeriod = 0;
                }
            } else {
                tmodel.setTargetTimeStamp(key, now);
                schedulePeriod = intervalValue;
            }
        } else if (TUtil.isDefined(tmodel.getTargetTimeStamp(key))) {
            pastPeriod = now - tmodel.getTargetTimeStamp(key);
            if (pastPeriod < 0) {
                schedulePeriod = -pastPeriod;
            } else {
                schedulePeriod = 0;
            }
        }

        return schedulePeriod;
    }

    static handleValueChange(tmodel, key, newValue, lastValue, step, cycle) {
        if (typeof tmodel.targets[key] === 'object' && typeof tmodel.targets[key].onValueChange === 'function') {
            const valueChanged = !TUtil.areEqual(newValue, lastValue, tmodel.targets[key].deepEquality);
            if (valueChanged) {
                tmodel.targets[key].onValueChange.call(tmodel, newValue, lastValue, cycle);
                tmodel.setTargetMethodName(key, 'onValueChange');
            }
        }
    }

    static morph(tmodel, key, fromValue, toValue, step) {
        const easing = tmodel.getTargetEasing(key);
        const easingStep = easing ? easing(tmodel.getTargetStepPercent(key, step)) : tmodel.getTargetStepPercent(key, step);

        if (TargetUtil.colorMap[key]) {
            const targetColors = ColorUtil.color2Integers(toValue);
            const lastColors = fromValue ? ColorUtil.color2Integers(fromValue) : ColorUtil.color2Integers('#fff');

            if (targetColors && lastColors) {
                const red = Math.floor(targetColors[0] * easingStep + lastColors[0] * (1 - easingStep));
                const green = Math.floor(targetColors[1] * easingStep + lastColors[1] * (1 - easingStep));
                const blue = Math.floor(targetColors[2] * easingStep + lastColors[2] * (1 - easingStep));

                return `rgb(${red},${green},${blue})`;
            } else {
                return toValue;
            }
        } else {
            return typeof toValue === 'number' ? toValue * easingStep + fromValue * (1 - easingStep) : toValue;
        }
    }

    static setWidthFromDom(child) {
        const timestamp = child.domWidthTimestamp;
        const parent = child.getParent();
        const domParent = child.getDomParent();
        
        let rerender = false;
        if (getManager().needsRerender(child)) {
            child.isTextOnly() ? child.$dom.text(child.getHtml()) : child.$dom.html(child.getHtml());
            rerender = true;
        }

        if (rerender || (parent && timestamp <= parent.getDimLastUpdate()) || (domParent && timestamp <= domParent.getDimLastUpdate())) {
            child.$dom.width('auto');
            const width = child.$dom.width();
            child.domWidthTimestamp = TUtil.now();

            child.val('width', width);  
  
            getRunScheduler().schedule(15, 'resize');           
        }
    }

    static setHeightFromDom(child) {
        const timestamp = child.domHeightTimestamp;
        const parent = child.getParent();
        const domParent = child.getDomParent();
        
        let rerender = false;
        if (getManager().needsRerender(child)) {
            child.isTextOnly() ? child.$dom.text(child.getHtml()) : child.$dom.html(child.getHtml());
            rerender = true;
        }     
 
        if (rerender || (parent && timestamp <= parent.getDimLastUpdate()) || (domParent && timestamp <= domParent.getDimLastUpdate())) {
            child.$dom.height('auto');
            const height = child.$dom.height();
            child.domHeightTimestamp = TUtil.now();
               
            child.val('height', height);  

            getRunScheduler().schedule(15, 'resize');
        }
    }
}

export { TargetUtil };
