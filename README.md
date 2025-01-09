# TargetJ: JavaScript UI framework and library - Programming the Front-End with a New Paradigm

Welcome to TargetJ, a powerful JavaScript UI framework and library that you might find redefines front-end development. (https://targetj.io)

TargetJ distinguishes itself by introducing a novel concept known as 'targets,' which forms its core. Targets give methods and variable assignments life cycles and the autonomy to operate independently, with various callbacks to adapt to changes, mimicking the behavior of living cells. This opens a new paradigm in programming.

⭐ We appreciate your star, it helps!

### Installation

To install TargetJ, run the following command in your terminal:

```bash
npm install targetj
```
## What are targets?

Targets are used as the main building blocks of components instead of direct variables and methods. Each component in TargetJ is a set of targets. Targets are employed across all aspects of the program. They are used in animation, controlling program flow, loading data from external APIs, handling user events, and more.

Targets provide a unified interface for variable assignments and methods, enabling them to operate autonomously. For example, targets give variables the ability to iterate in steps until reaching a specified value, rather than being immediately assigned. Targets can include pauses between these steps, track the progress of other variables, and manage their life cycles dynamically. Methods can execute themselves under specific conditions, control the number of executions, and more.

### Quick example

In our first example, `animate` is the main target. It has an indefinite lifecycle, specified by the `loop` property. After each animation cycle, a one-second pause is defined by the `interval` property. Both `loop` and `interval` can also be defined as methods (explained further below).

You'll also find `quickStart`, the first argument in the `TModel` constructor. If an HTML element with the same ID already exists on the page, it will be used in the new instance of `TModel`, and the animation will be applied to it. If no such element exists, TargetJ will create one.

![first example](https://targetj.io/img/quickExample2.gif)

```bash
import { App, TModel, getEvents } from "targetj";

App(new TModel('quickStart', {
    color: '#fff',
    html: 'Drag me',
    textAlign: 'center',
    moves: [
        { scale: 1, width: 200, height: 200, lineHeight: 200, background: 'blue', borderRadius: 0 },
        { scale: 1.5, width: 150, height: 150,lineHeight: 150, background: 'red', borderRadius: 75 },
        { scale: 1, width: 100, height: 100, lineHeight: 100, background: 'orange', borderRadius: 50 }
    ],
    animate: {
        loop: true,
        cycles: 2,
        interval: 1000,
        value() {
            const move = this.val('moves')[this.getTargetCycle(this.key)];
            const x = (this.getParentValue('width') - move.width) / 2;
            const y = (this.getParentValue('height') - move.height) / 2;
            this.setTarget({ ...move, x, y }, 30);
        },
        enabledOn() {
            return getEvents().getTouchCount() === 0;
        }
    },
    onSwipe() { 
        this.setTarget({ x: getEvents().swipeX(this), y: getEvents().swipeY(this) });
    }
}));
```


## Why TargetJ?

Imagine building a single-page web app using a unified approach for API integration, animations, event handling, and more—without having to manage asynchronous calls, loops, callbacks, promises, timeouts, state management, CSS, HTML attributes, tags, or HTML nesting. That’s exactly what TargetJ offers: it simplifies the entire development process with a new, simplified approach.

## Do I still need HTML and CSS files?

No, static HTML or CSS files are not necessary. We believe they introduce complexity, brittleness, and act as an intermediary that diverts focus from the end application. It's better to reduce the gap between the application and the user experience. In TargetJ, HTML elements, styles, and attributes are written as targets, enabling them to function independently while at the same time being well integrated with the other logic targets of the application. This provides a flexible and fluid medium for creating new user experiences that would otherwise be difficult to achieve.

## Can I integrate TargetJ as a library into my existing page?

Yes, you can integrate TargetJ as a library into your existing page! TargetJ is designed to work as either a library or a framework. It was developed to be flexible and compatible with other libraries and frameworks, allowing you to enhance your page with minimal changes. You can find an example at the end of this page.

## What does a target consist of?

Each target consists of the following:
1. Target Value and Actual Value. The target value is the value assigned to a variable or the result produced by a method. The actual value is typically the value used by the rest of the application. When the target value differs from the actual value, TargetJ iteratively updates the actual value until it matches the target value. This process is managed by two additional variables: Step, which dictates the number of iterations, and Interval, which specifies the duration (in milliseconds) the system waits before executing the next iteration.

2. State: Targets have four states that control their lifecycle: Active, Inactive, Updating, and Complete. Active: This is the default state for all targets. It indicates that the target is ready to be executed, and the target value needs to be initialized from the variable it represents or its value() method needs to be executed to calculate its output. Inactive: Indicates that the target is not ready to be executed. Updating: Indicates that the actual value is being adjusted to reach the target value. Complete: Indicates that the target execution is finished, and the actual value has matched the target value.

3. Target Methods: All methods are optional. They are used to control the lifecycle of targets or serve as callbacks to reflect changes. The controlling methods are: enabledOn, loop, steps, cycles. The callbacks are: onValueChange, onStepsEnd, onImperativeStep, onImperativeEnd. More details in the method section.

## Brief overview of how it operates

All targets are in the active state by default and ready to be executed. They can include an enabledOn function that delays their execution until the specified conditions are met. Targets can also be set to inactive and activated externally when needed. 

The target task monitors all active targets, and if a target is enabled, it will be executed. The target value is generated either from the result of a method or from a static value defined in the target. For simple targets without steps, cycles, or loops, the actual value is set immediately based on the target value. Once executed, the target’s state becomes complete, and it will not be executed again.

If the target has loop or cycle methods defined, its value method will be re-executed after a pause specified by the interval. The number of executions will be determined by the cycles or will continue as long as the loop condition returns true. If the target has steps defined, its state changes to updating, and the actual value is updated iteratively until it reaches the target value, according to the number of steps and pauses specified by steps and intervals.

A target can reactivate itself in the `onStepsEnd` callback once all steps are completed, or in the `onImperativeEnd` callback when all imperative targets initiated by that target are finished, allowing it to re-execute. It can also be reactivated externally, either directly or through an event.

## Target methods

All methods and properties are optional, but they play integral roles in making targets useful for animation, API loading, event handling, and more:

1. **value**
If defined, value is the primary target method that will be executed. The target value will be calculated based on the result of value().

2. **onEnabled**
Determines whether the target is eligible for execution. If enabledOn() returns false, the target remains active until it is enabled and gets executed.

3. **loop**
Controls the repetition of target execution. If loop() returns true, the target will continue to execute indefinitely. It can also be defined as a boolean instead of a method.

4. **cycles**
It works similarly to `loop`, but it specifies an explicit number of repetitions. It can also be combined with `loop`, in which case, once the specified cycles complete, they will rerun as long as `loop` returns true.

6. **interval**
It specifies the pause between each target execution or each actual value update when steps are defined.

7. **steps**
By default, the actual value is updated immediately after the target value. The steps option allows the actual value to be updated in iterations specified by the number of steps.

8. **easing**
An easing function that operates when steps are defined. It controls how the actual value is updated in relation to the steps.

9. **onValueChange**
This callbak is triggered whenever there is a change returned by the target method, which is called value().

10. **onStepsEnd**
This method is invoked only after the final step of updating the actual value is completed, assuming the target has a defined steps value.

11. **onImperativeStep**
   - `onImperativeStep()`: This callback tracks the progress of imperative targets defined within a declarative target. If there are multiple imperative targets, this method is called at each step, identifiable by their target name. You can also use `on${targetName}Step` to track individual targets with their own callbacks. For example, `onWidthStep()` is called on each update of the `width` target.

11. **onImperativeEnd**
   - Similar to `onImperativeStep`, but it is triggered when an imperative target completes. If multiple targets are expected to complete, you can use `on${targetName}End` instead. For example, `onWidthEnd` is called when the `width` target gets completed.

12. **active**
This is only property. It indicates that the target is in an inactive state and is not ready to be executed. You can also prefix the target name with '_' to achieve the same effect as setting active to false.

13. **initialValue**
This is only property. It defines the initial value of the actual value.


### Simpler example

In the example below, we incrementally increase the values of width, height, and opacity in 30 steps, with a 50-millisecond pause between each step. You can view a live example here: https://targetj.io/examples/overview.html.

![first example](https://targetj.io/img/firstExample.gif)


```bash
import { App, TModel } from 'targetj';

App(new TModel({
    background: '#fff',
    width: {
        value: 250,        
        steps: 30,
        stepInterval: 50
    },
    height: {
        value: 250,        
        steps: 30,
        stepInterval: 50
    },
    opacity: {
        value: 0.15,        
        steps: 30,
        stepInterval: 50
    }
 }));
```

It can also be written in a more compact form using arrays (view a live example at https://targetj.io/examples/overview2.html):

```bash
import { App, TModel } from 'targetj';

App(new TModel({
    background: '#fff',
    width: [ 250, 30, 50],
    height: [ 250, 30, 50],
    opacity: [ 0.15, 30, 50]
 }));
```

## Declarative and imperative targets

Targets in TargetJ can be defined in two ways: declaratively or imperatively.

The declarative approach offers a structured method for defining targets, as seen in the previous example. However, orchestrating multiple targets with varying speeds and timings can be challenging. For instance, tracking the completion of multiple targets to trigger a new set of targets is not easily done using only declarative targets. To address this, TargetJ provides the setTarget function, allowing you to define multiple imperative targets from within a single declarative target. Additionally, the onImperativeStep and onImperativeEnd callbacks, defined in the declarative target, enable you to track each step of the imperative targets or just their completion.

By combining both declarative and imperative targets, you gain a powerful toolset for designing complex interactions.

## Declarative an imperative example

The following example demonstrates both declarative and imperative approaches. In the `animate` target, two imperative targets are set to move a square across the screen. Once both `x` and `y` targets are completed, the `animate` target will re-execute because `loop` is defined as `true`, causing it to continue indefinitely. Additionally, we can add `onImperativeEnd()` to trigger when either the `x` or `y` target completes. We can also use `onXEnd` or `onYEnd` to listen specifically for the completion of the `x` or `y` target, respectively.

![declarative example](https://targetj.io/img/declarative.gif)

```bash
import { App, TModel, getScreenWidth, getScreenHeight } from "targetj";

App(
  new TModel("declarative", {
    children: {
      loop() { return this.getChildren().length < 10; },
      interval: 500,
      value: () =>
        new TModel("square", {
          width: 50,
          height: 50,
          background: "brown",
          animate: {
            loop: true,
            value() {
              const width = this.getWidth();
              const parentWidth = this.getParentValue("width");
              this.setTarget("x", { list: [-width, parentWidth + width] }, Math.floor(30 + parentWidth * Math.random()));
              this.setTarget("y", Math.floor(Math.random() * (this.getParentValue("height") - this.getHeight())), 30);
            }
          },
        }),
    },
    width: getScreenWidth,
    height: getScreenHeight
  })
);
```

## Loading data example

Calling backend APIs is simplified through the use of targets in TargetJ. Additionally, TargetJ provides a Loader class, accessible via getLoader(), which streamlines API integration.

In the example below, we define a target named load. Inside the value function, we make the API call using fetch(). The second argument specifies the API URL, and the third argument contains the query parameters passed to the API. A fourth optional parameter, omitted in this example, can specify a cache ID if we want to cache the result. This cache ID can also be used to retrieve the cached data. If it’s not specified, the result will always come from the API. Once the API response is received, it triggers either onSuccess or onError, depending on the outcome.

In this example, we set the cycles to 9, triggering the API call 10 times at intervals of 1 second (interval set to 1000). Each API response is appended as a separate object in the output. Because we didn’t specify the fourth argument, the response is always fetched directly from the API rather than from the cache.

![api loading example](https://targetj.io/img/apiLoading4.gif)

```bash
import { App, TModel, getLoader, getScreenHeight, getScreenWidth, Moves } from "targetj";

App(new TModel("apiCall", {
  width: 160,
  height: getScreenHeight,
  load: {
    interval: 1000,
    cycles: 8,
    value: function (cycle) {
      return getLoader().fetch(this, "https://targetj.io/api/randomUser", {
        id: `user${cycle}`,
      });
    },
    onSuccess(res) {
      this.addChild(
        new TModel("user", {
          lineHeight: 50,
          textAlign: "center",
          html: res.result.name,
          width: 50,
          height: 50,
          rightMargin: 5,
          bottomMargin: 5,
          color: "#fff",
          background: "#B388FF",
        })
      );
    }
  }
}));
```

## Animation API example

TargetJ provides efficient, easy-to-control UI animation and manipulation through special targets that reflect HTML style names, such as `width`, `height`, `scale`, `rotate`, and `opacity`. 

Below is a comparison between implementing animations in TargetJ versus using the Animation API. While the Animation API may still offer a slight performance edge, TargetJ comes very close.

![animation api example](https://targetj.io/img/animationComparison2.gif)

```bash
import { App, TModel, getScreenHeight, getScreenWidth } from "targetj";

App(new TModel('TargetJ vs Animation Api', { 
    addAnimateChild() {
        this.addChild(new TModel('animation', {
            width: 150,
            height: 150,
            animate: {
                value() {
                    var keyframes = [{
                        transform: 'translate(0, 0) rotate(0deg) scale(1)',
                        width: '80px',
                        height: '80px',
                        background: 'orange'
                    }, {
                        transform: 'translate(50px, 100px) rotate(180deg) scale(1.5)',
                        width: '120px',
                        height: '120px',
                        background: 'brown'
                    }, {
                        transform: 'translate(150px, 0) rotate(360deg) scale(1)',
                        width: '100px',
                        height: '100px',
                        background: 'crimson'
                    }, {
                        transform: 'translate(0, 0) rotate(360deg) scale(1)',
                        width: '150px',
                        height: '150px',
                        background: 'purple'
                    }];

                    return this.$dom.animate(keyframes, {
                        duration: 4500, 
                        iterations: 1
                    });
                }, enabledOn: function() {
                    return this.hasDom();
                }
            }
        }));
    },
    addDomChild() {
        this.addChild(new TModel('dom', {
            color: 'white',
            html: 'TargetJ',
            animate: {
                cycles: 3,
                value(cycle) {
                    return [
                        { x: 200, y: 0, rotate: 0, scale: 1, width: 80, height: 80, background: 'orange' },
                        { x: 250, y: 100, rotate: 180, scale: 1.5, width: 120, height: 120, background: 'brown' },
                        { x: 350, y: 0, rotate: 360, scale: 1, width: 100, height: 100, background: 'crimson' },
                        { x: 200, y: 0, rotate: 360, scale: 1, width: 150, height: 150, background: 'purple' }
                    ][cycle];
                },
                onValueChange(newValue) {
                    const steps = this.getTargetCycle(this.key) === 0 ? 0 : 180;
                    this.setTarget("move", newValue, steps);
                }
            }
        }));
    },
    restartOnBothComplete: {
        loop: true,
        interval: 50,
        value() {
            const animation = this.getChild(0).val('animate');            
            if (animation.currentTime === animation.effect.getComputedTiming().duration 
                    && this.getChild(1).isTargetComplete('animate')) {
                this.getChild(0).activateTarget('animate');
                this.getChild(1).activateTarget('animate');
            }
        },
        enabledOn: function() {
            return this.getChildren().length === 2 && this.getChild(0).val('animate');
        }
    },
    width() { return getScreenWidth(); },
    height() { return getScreenHeight(); }    
}));
```

## Infinite scrolling

This example demonstrates how to handle scroll events and develop a simple infinite scrolling application.

![Single page app](https://targetj.io/img/infiniteScrolling4.gif)

```bash
import { App, TModel, getEvents, getScreenHeight, getScreenWidth, } from "targetj";

App(new TModel("scroller", {
    domHolder: true,
    overflow: 'hidden',
    containerOverflowMode: 'always',
    children() { 
        const childrenCount = this.getChildren().length;
        return Array.from({ length: 10 }, (_, i) => 
            new TModel('scrollItem', {                     
                width: 300,
                background: '#B388FF',                
                height: 32,
                color: '#C2FC61',
                textAlign: 'center',
                lineHeight: 32,               
                bottomMargin: 2,
                x() { return this.getCenterX(); },                
                html: childrenCount + i
            })
        ); 
    },          
    width() { return getScreenWidth(); },
    height() { return getScreenHeight(); },  
    onResize: [ 'width', 'height' ],
    onScrollEvent() {
        this.setTarget('scrollTop', Math.max(0, this.getScrollTop() + getEvents().deltaY()));
    },
    onVisibleChildrenChange() { 
        if (getEvents().dir() !== 'up' && this.visibleChildren.length * 34 < this.getHeight()) {
            this.activateTarget('children');
        }
    }
}));
```

## Simple Single Page App Example

Below is a simple single-page application that demonstrates how to build a fully-featured app using TargetJ. Each page is represented by a textarea. You’ll notice that when you type something, switch to another page, and then return to the same page, your input remains preserved. This also applies to the page's scroll position—when you return, the page will open at the same scroll position where you left it, rather than defaulting to the top.

You can now assemble your app by incorporating code segments from the examples on animation, event handling, API integration, and infinite scrolling provided above.

![Single page app](https://targetj.io/img/singlePage2.gif)

```bash
import { App, TModel, getScreenHeight, getScreenWidth, getEvents, getPager } from "targetj";

App(new TModel("simpleApp", {
    width() { return getScreenWidth(); },
    height() { return getScreenHeight(); },
    menubar() {
        return new TModel("menubar", {
            children() {
                return ["home", "page1", "page2"].map(menu => {
                    return new TModel("toolItem", {
                        canHandleEvents: "touch",
                        background: "#fce961",
                        width: 100,
                        height: 50,
                        lineHeight: 50,
                        itemOverflowMode: 'never',
                        opacity: 0.5,
                        cursor: "pointer",
                        html: menu,
                        onEnterEvent() {
                          this.setTarget("opacity", 1, 20);
                        },
                        onLeaveEvent() {
                          this.setTarget("opacity", 0.5, 20);
                        },
                        onClickEvent() {
                          this.setTarget("opacity", 0.5);
                          getPager().openLink(menu);
                        }
                    });
                });
            },
            height: 50,
            width() { return getScreenWidth(); },
            onResize: ["width"]
        }); 
    },
    page() {
        return new TModel({
            width() { return getScreenWidth(); },
            height() { return getScreenHeight() - 50; },
            baseElement: 'textarea',
            keepEventDefault: [ 'touchstart', 'touchend', 'mousedown', 'mouseup' ],
            boxSizing: 'border-box',
            html: "main page",
            onKeyEvent() { this.setTarget('html', this.$dom.value()); },
            onResize: [ "width", "height" ]
        });        
    },
    mainPage() {
        return new TModel({
            ...this.val('page').targets,
            background: "#e6f6fb",
            html: 'main page'
        });
    },
    page1() {
        return new TModel({
            ...this.val('page').targets,
            background: "#C2FC61",
            html: 'page1'
        });        
    },
    page2() {
        return new TModel({
            ...this.val('page').targets,
            background: "#B388FF",
            html: 'page2'
        });         
    },    
    children() {
        const pageName = window.location.pathname.split("/").pop();
        switch (pageName) {
          case "page1":
            return [ this.val('menubar'), this.val('page1')];
          case "page2":
            return [ this.val('menubar'), this.val('page2')];
          default:
            return [ this.val('menubar'), this.val('mainPage') ];
        }
    },
    onResize: ["width", "height"]
}));
```

## Using TargetJ as a library into your page

Here is an example that creates 1000 rows. The first argument, 'rows,' is used to find an element with the ID 'rows.' If no such element exists, it will be created at the top of the page. The OnDomEvent target activates the targets defined in its value when the DOM is found or created, eliminating the need for conditions to verify the DOM's availability before executing the target. Additionally, the parallel property creates subtasks, which improve browser performance."

![animation api example](https://targetj.io/img/targetjAsLibrary.gif)

```bash
import { App, TModel, $Dom } from "targetj";

App(new TModel("rows", {
    isVisible: true,
    containerOverflowMode: "always",
    rectTop() { return this.$dom.getBoundingClientRect().top; },
    absY() { return this.val("rectTop") - $Dom.getWindowScrollTop(); },
    defaultStyling: false,
    domHolder: true,
    onDomEvent: ["rectTop", "absY"],
    onWindowScrollEvent: "absY",
    createRows: {
        parallel: true,
        cycles: 9,
        value() {
            const childrenLength = this.getChildren().length;
            Array.from({length: 100}, (_, i) => {
                this.addChild(new TModel("row", {
                    keepEventDefault: true,
                    height: 36,
                    width: [{list: [100, 500, 200]}, 30],
                    background: "#b388ff",
                    canDeleteDom: false,
                    html: `row ${i + childrenLength}`,
                }));
            });
        }
    }
}));
```

## Special target names

All HTML style names and attributes are treated as special target names. The most commonly used style names and attributes have already been added to the framework, with the possibility of adding more in the future.

Examples:
- `width`, `height`: Set the dimensions of the object.
- `opacity`, `scale`, `rotate`: Adjust the opacity, scale, and rotation of the object.
- `zIndex`: Sets the z-order of the object.

In addition to styles and attribute names, we have the following special names:

1. **html**: Sets the content of the object, interpreted as text by default.
2. **style**: An object to set the HTML style of the object, especially for style names that aren’t built-in.
3. **css**: A string that sets the CSS of the object.
4. **baseElement**: Sets the HTML tag of the object, defaulting to `div`.
5. **x** and **y*: Sets the location of the object.
6. **scrollLeft** and **scrollTop**: Control the scrolling position of the object.
7. **leftMargin**, **rightMargin**, **topMargin**, **bottomMargin**: Set margins between objects.
8. **children**: Sets the `TModel` children of the object.
9. **domHolder**: Assigned by the container to hold children or descendants without a `domParent`.
10. **domParent**: Set by the container or children to control which DOM container they are embedded in.
11. **isVisible**: An optional boolean to explicitly control the visibility of the object, bypassing TargetJ’s automatic calculation.
12. **canHaveDom**: A boolean flag that determines if the object can have a DOM element on the page.
13. **canHandleEvents**: Specifies which events the object can handle.
14. **widthFromDom** and **heightFromDom**: Boolean flags to control if the width and height should be derived from the DOM element.
15. **textOnly**: A boolean flag to set content type as text or HTML.
16. **isInFlow**: A boolean flag that determines if the object will contribute to the content height and width of its parent.

Lastly, we have the event targets which their values can be an array of targets to activate on specific events or may implement the event handler directly.

**Example with Target Array:**
```javascript
onResize: [ 'width', 'height' ]  // Activates 'width' and 'height' targets on screen resize.
```

**Example with Event handler:**
```javascript
onResize() { 
    this.setTarget('width', getScreenWidth());
    this.setTarget('height', getScreenHeight());
}
```

Here are all the event targets:
1. **onResize**: Triggered on screen resize events.
2. **onParentResize**: Activated when the parent’s width or height is updated.
3. **onFocusEvent**: Triggered on focus events.
4. **onBlurEvent**: Triggered on blur events.
5. **onClickEvent**: Activated on click events.
6. **onTouchEvent**: Generic handler for all touch events.
7. **onTouchEnd**: Called when `touchend` or `mouseup` events occur.
8. **onSwipeEvent**: Activated on swipe events.
9. **onEnterEvent**: Triggered when the mouse cursor enters the object’s DOM.
10. **onLeaveEvent**: Triggered when the mouse cursor leaves the object’s DOM.
11. **onScrollEvent**: Called on scroll events.
12. **onKeyEvent**: Triggered by key events.
13. **onInvisibleEvent**: Activated when the object becomes invisible.
14. **onChildrenChange**: Triggered when the children count changes.
15. **onVisibleChildrenChange**: Triggered when the count of visible children changes.

## Features

As a result of using targets, we can develop web sites or apps with the following features:

- **No HTML required**: HTML tags are seldom necessary except for images.
- **No HTML nesting**: HTML nesting is seldom required in TargetJ. If it is required, nesting is done at runtime. Elements can be dynamically detached and incorporated into other elements, facilitating the easy reuse of components regardless of their location or attachment. It also opens the door for a new user experiences.
- **Next-level animation**: Users can program objects to move at varying speeds, pause at certain intervals, and repeat sequences based on various conditions. It allows the creation of complicated animations.
- **Control the flow of execution with time**: TargetJ simplifies the execution of various program segments at specific times, making it easy to sequence or parallelize numerous actions.
- **Handle events effortlessly**: In TargetJ, events are triggered synchronously and are designed so that any component can detect when an event occurs. Event handling can be simply implemented as conditions in the enabling functions of \'targets.\' This ensures that managing events is both simple and effective.
- **Easy to learn**: TargetJ simplifies development by employing the single concept of \'targets\' making it easy to learn.
- **Handle 100,000s of items**: TargetJ efficiently manages large collections of objects on a single page. This is done by its data structure and optimization algorithm. It divides a long list into a tree structure, monitoring only the branches that are visible to the user at any given time.
- **AI friendly**: With a unified concept of targets for all development, the ability to add and remove targets at runtime, and the capability to inspect various statuses of running objects, TargetJ is a strong candidate for AI-powered UI development.


## How to debug in TargetJ
1. TargetJ.tApp.stop(): Stops the application.
2. TargetJ.tApp.start(): Restarts the application
3. TargetJ.tApp.throttle: Slows down the application. This represents the pause in milliseconds before starting another TargetJ task cycle. It is zero by default.
4. TargetJ.tApp.debugLevel: Logs information about the TargetJ task cycle and its efficiency. It is zero by default. Set it to 1 to log any cycle that takes more than 10ms and 2 to log the name of the caller of each cycle.
5. Use `t()` to find an object from the browser console using its `oid`.
6. Inspect all the vital properities using `t(oid).bug()`.
   
## Documentation
Explore the full potential of TargetJ and dive into our interactive documentation at www.targetj.io.

## License
Distributed under the MIT License. See LICENSE for more information.

## Contact
Ahmad Wasfi - wasfi2@gmail.com



