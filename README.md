# TargetJ: JavaScript UI framework

Welcome to TargetJ, a powerful JavaScript UI framework designed to simplify development and animation. (https://targetj.io)

TargetJ distinguishes itself by introducing a novel concept known as 'targets', which forms its core. Targets are used as the main building blocks of components instead of direct variables and methods. Each component in TargetJ is a set of targets. Targets are employed across all aspects of the program. They are used in animation, controlling program flow, loading data from external APIs, handling user events, and more.

### Installation

To install TargetJ, run the following command in your terminal:

```bash
npm install targetj
```

## What are targets?

Targets provide a unified interface for variables and methods, giving them life cycles and the autonomy to operate independently, with various callbacks to adapt to changes, mimicking the behavior of living cells.

For variables, targets enhance functionality by giving them the ability to iterate in steps until they reach the specified value, rather than being immediately assigned their values. They can introduce pauses between iterations and offer callbacks to monitor progress, track the progress of other variables, and manage their life cycles accordingly. Similarly, targets enhance methods by allowing them to manage their own life cycles. They can execute themselves under specific conditions, control the number of executions, and offer the same capabilities as those provided to variables.

## What does a target consist of?

Each target consists of the following:
1. Target Value and Actual Value. The target value represents a variable or the outcome of a method. The actual value is the value used by the application. When the target value differs from the actual value, TargetJ iteratively updates the actual value until it matches the target value. This process is managed by two additional variables: Step, which dictates the number of iterations, and Interval, which specifies the duration (in milliseconds) the system waits before executing the next iteration.

2. State: Targets have four states that control their lifecycle: Active, Inactive, Updating, and Complete. Active: This is the default state for all targets. It indicates that the target is ready to be executed, and the target value needs to be initialized from the variable it represents or its value() method needs to be executed to calculate its output. Inactive: Indicates that the target is not ready to be executed. Updating: Indicates that the actual value is being adjusted to reach the target value. Complete: Indicates that the target execution is finished, and the actual value has matched the target value.

3. Target Methods: All methods are optional. They are used to control the lifecycle of targets or serve as callbacks to reflect changes. The controlling methods are: enabledOn, loop, steps, cycles. The callbacks are: onValueChange, onStepsEnd, onImperativeStep, onImperativeEnd. More details in the method section.

## Brief overview of how it operates

All targets are in the active state by default and ready to be executed. They can include an enabledOn function that delays their execution until the specified conditions are met. Targets can also be set to inactive and activated externally when needed. 

The target task monitors all active targets, and if a target is enabled, it will be executed. The target value is generated either from the result of a method or from a static value defined in the target. For simple targets without steps, cycles, or loops, the actual value is set immediately based on the target value. Once executed, the target’s state becomes complete, and it will not be executed again.

If the target has loop or cycle methods defined, its value method will be re-executed after a pause specified by the interval. The number of executions will be determined by the cycles or will continue as long as the loop condition returns true. If the target has steps defined, its state changes to updating, and the actual value is updated iteratively until it reaches the target value, according to the number of steps and pauses specified by steps and intervals.

A target can reactivate itself in the `onStepsEnd` callback once all steps are completed, or in the `onImperativeEnd` callback when all imperative targets initiated by that target are finished, allowing it to re-execute. It can also be reactivated externally, either directly or through an event.

## Target methods

1. **Value**
If defined, value is the primary target method that will be executed. The target value will be calculated based on the result of value().

2. **onEnabled**
Determines whether the target is eligible for execution. If enabledOn() returns false, the target remains active until it is enabled and gets executed.

3. **loop**
Controls the repetition of target execution. If loop() returns true, the target will continue to execute indefinitely. It can also be defined as a boolean instead of a method.

4. **cycles**
Its purpose is similar to loop, but the number of repetitions is specified explicitly as a number.

5. **interval**
It specifies the pause between each target execution or each actual value update when steps are defined.

6. **steps**
By default, the actual value is updated immediately after the target value. The steps option allows the actual value to be updated in iterations specified by the number of steps.

7. **easing**
An easing function that operates when steps are defined. It controls how the actual value is updated in relation to the steps.

8. **onValueChange**
This callbak is triggered whenever there is a change returned by the target method, which is called value().

9. **onStepsEnd**
This method is invoked only after the final step of updating the actual value is completed, assuming the target has a defined steps value.

10. **onImperativeStep**
onImperativeStep() This callback tracks the progress of imperative targets defined inside the declarative target. If there are multiple imperative targets, this method is called at every step, identifiable by their target name. It allows for easy orchestration between several targets.

11. **onImperativeEnd**
It is similar to onImperativeStep, but it is called when the imperative target is completed.

12. **active**
This is only property. It indicates that the target is in an inactive state and is ready to be executed.

13. **initialValue**
This is only property. It defines the initial value of the actual value.


### Simple example

In the example below, we incrementally increase the value of width, height, and opacity in 30 steps, with a 50-milliseconds pause between each step.

![first example](https://targetj.io/img/firstExample.png)


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

It can also be written in a more compact form using arrays:

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

The declarative approach offers a structured method for defining targets, as seen in the previous example. However, orchestrating multiple targets with varying speeds and timings can be challenging. For instance, tracking the completion of multiple targets to trigger a new set of targets is not easily done using only declarative targets. To address this, TargetJ provides the setTarget function, allowing you to define multiple targets from within a single declarative target. Additionally, the onImperativeStep and onImperativeEnd callbacks, defined in the declarative target, enable you to track each step of the imperative targets or just their completion.

By combining both declarative and imperative targets, you gain a powerful toolset for designing complex interactions.

## Declarative an imperative example

The following example demonstrates the use of both declarative and imperative approaches. In the animate target, we set two imperative targets to move a square across the screen. When x reaches the end of the screen, onImperativeEnd is triggered, reactivating the target and restarting the animation.

![declarative example](https://targetj.io/img/declarative.png)

```bash
import { App, TModel, getScreenWidth, getScreenHeight } from "targetj";

App(new TModel('declarative', {     
    add() { 
        for (var i = 0; i < 10; i++) {
            this.addChild(new TModel("square", {
                width: 50,
                height: 50,
                background: 'brown',
                animate: {
                    value() {
                        var width = this.getWidth();
                        var parentWidth = this.getParentValue('width');
                        this.setTarget('x', { list: [ -width, parentWidth + width ] }, Math.floor(30 + parentWidth * Math.random()));
                        this.setTarget('y',  Math.floor(Math.random() * (this.getParentValue('height') - this.getHeight())), 30);
                    },
                    onImperativeEnd(key) {
                        if (key === 'x') {
                            this.activateTarget(this.key);
                        }
                    }
                }
            }));
        }
    },
    width() { return getScreenWidth(); },
    height() { return getScreenHeight(); }         
}));
```

## Loading data example

Calling backend APIs is simplified through the use of targets in TargetJ. It includes a loader that streamlines API integration.

In the example below, we define a target named 'load' that attempts to fetch a random user. Within the value() function, we initialize the API call. The first parameter specifies an ID that identifies the API call, which can also be used to access cached data.

The target will remain active using the loop function, with value() continuing to return undefined while polling the system every 20ms (as specified in the interval property) until the loader retrieves the API result. When the API result arrives, it triggers onValueChange, which creates a user object based on the retrieved data. Additionally, we define two targets to handle scenarios for both fast and slow connections. The slow target is enabled if polling exceeds 100 times, while the fast target is enabled if the API result is retrieved in less than 600ms. If you restart the example, the result will be fetched from the cache instead of the API.

![api loading example](https://targetj.io/img/apiLoading.png)

```bash
import { App, TModel, getLoader, browser } from "targetj";

App(
  new TModel("apiCall", {
    load: {
      loop() { return !this.val(this.key); },
      interval: 20,
      value: function () {
        var fetchId = "user";
        getLoader().initSingleLoad(fetchId, { url: "https://targetj.io/api/randomUser", data: { id: fetchId } });
        return getLoader().fetchResult(fetchId);
      },
      onValueChange(newValue) {
        var user = newValue.result;
        this.addChild(new TModel("userApi", {
            width: 60,
            height: 30,
            html: user.name,
            background: "#f00",
        }));
      },
    },
    slowLoad: {
      value() {
        console.log("Connection issue: please try again later.");
      },
      enabledOn() {
        return this.getTargetExecutionCount("load") > 100;
      }
    },
    fastLoad: {
      value() {
        //Loading is fast: We can load additional details about the user.
        console.log(`Loading time was only ${this.val("load").loadingTime}ms`);
        console.log(`Load target execution time was ${browser.now() - this.getTargetCreationTime("load")}ms`);
        console.log(`Load target was executed ${this.getTargetExecutionCount("load")} times`);
      },
      enabledOn() {
        return this.val("load") && this.val("load").loadingTime < 600;
      }
    }
  })
);
```

## Event handling example

In the following example, the background color of the pane changes randomly whenever you click on it. The `canHandleEvents` target ensures that the object can handle touch events, such as clicks. However, we’ve set a limit of 10 executions for the background change. After reaching this limit, the component will no longer respond to click events. The `onClickEvent` is a system target that activates all associated targets when a click occurs. The `html` target tracks the number of executions and displays it within the pane.

![event handling example](https://targetj.io/img/eventHandling2.png)

```bash
import { App, TModel } from "targetj";

App(
  new TModel("events", {
    canHandleEvents() {
      return this.getTargetExecutionCount("background") < 10 ? "touch" : "";
    },
    width: 120,
    height: 120,
    background: {
      active: false,
      initialValue: "#f00",
      value() {
        return "#" + Math.random().toString(16).slice(-6);
      },
    },
    html() {
      return this.getTargetExecutionCount("background");
    },
    onClickEvent: ["background", "canHandleEvents", "html"],
  })
);
```

## Animation API example

TargetJ offers efficient and easy-to-control UI animation and manipulation through special targets such as x, y, width, height, scale, rotate, and opacity, which directly impact the UI. A complete list of these targets can be found in the "Special target names" section. For very intensive UI animations, you can leverage the Animation API. An example is provided below.

![animation api example](https://targetj.io/img/animationApi.png)

```bash
import { App, TModel } from "targetj";

App(
  new TModel("TargetJ vs Animation Api", {
    x: 0,
    y: 0,
    width: 150,
    height: 150,
    animate: {
      value() {
        const keyframes = [
          {
            transform: "translate(0, 0) rotate(0deg) scale(1)",
            width: "80px",
            height: "80px",
            background: "orange",
          },
          {
            transform: "translate(50px, 100px) rotate(180deg) scale(1.5)",
            width: "120px",
            height: "120px",
            background: "brown",
          },
          {
            transform: "translate(200px, 0) rotate(360deg) scale(1)",
            width: "100px",
            height: "100px",
            background: "crimson",
          },
          {
            transform: "translate(0, 0) rotate(360deg) scale(1)",
            width: "150px",
            height: "150px",
            background: "purple",
          },
        ];

        return this.$dom.animate(keyframes, {
          duration: 5000,
          iterations: 1,
          easing: "ease-in-out",
        });
      },
      enabledOn() {
        return this.hasDom();
      },
    },
    trackProgress: {
      loop: true,
      interval: 100,
      value() {
        const currentTime = this.val("animate").currentTime;
        this.setTarget("html", (currentTime / 5000).toFixed(1));
        return currentTime < 5000 ? false : true;
      },
      onValueChange(newValue) {
        if (newValue) {
          this.activateTarget("animate");
        }
      },
      enabledOn() {
        return this.isTargetComplete("animate");
      },
    },
  })
);
```

## Simple Single Page App Example

Below is a simple single-page app that demonstrates how to develop a full application using TargetJ.

![Single page app](https://targetj.io/img/singlePageApp2.png)

```bash
import { App, TModel, getScreenHeight, getScreenWidth, getEvents, getPager } from "targetj";

App(
  new TModel("app", {
    start() {
      const urlParts = window.location.href.split("/");
      this.pageName = urlParts[urlParts.length - 1];
    },
    canHandleEvents: "touch",
    width() { return getScreenWidth(); },
    innerXEast: 0,
    height() { return getScreenHeight(); },
    children() {
      switch (this.pageName) {
        case "page1":
          return [Toolbar(), Page1()];

        case "page2":
          return [Toolbar(), Page2()];

        default:
          return [Toolbar(), HomePage()];
      }
    },
    onResize: ["width", "height"]
  })
);

function Toolbar() {
  return new TModel("toolbar", {
    start() {
      ["home", "page1", "page2"].forEach(menu => {
        this.addChild(
          new TModel("toolItem", {
            canHandleEvents: "touch",
            background: "bisque",
            width: 100,
            height: 50,
            outerXEast: 0,
            opacity: {
              loop() { return this.getOpacity() === 1; },
              value() { return getEvents().isTouchHandler(this) ? [1, 20] : [0.5, 20]; },
            },
            activePage: {
                active: false,
                value() { getPager().openLink(menu); }
            },
            onTouchEvent: ["opacity"],
            onClickEvent: ["activePage"],
            html: menu,
          })
        );
      });
    },
    innerXEast: 0,
    height: 50,
    width() { return getScreenWidth(); },
    onResize: ["width"]
  });
}

function HomePage() {
  return new TModel("homePage", {
    background: "yellow",
    width() { return getScreenWidth(); },
    height() { return getScreenHeight(); },
    html: "home page",
    onResize: ["width", "height"],
  });
}

function Page1() {
  return new TModel("page1", {
    background: "blue",
    width() { return getScreenWidth(); },
    height() { return getScreenHeight(); },
    html: "page 1",
    onResize: ["width", "height"],
  });
}

function Page2() {
  return new TModel("page2", {
    background: "green",
    width() { return getScreenWidth(); },
    height() { return getScreenHeight(); },
    html: "page 2",
    onResize: ["width", "height"],
  });
}
```

## Special target names

The following are special target names to impact the UI or control properties of TargetJ objects (called TModel):

1. x, y, width, height: Set the location and dimensions of the object.
2. opacity, scale, rotate: Set the opacity, scale, and rotation of the object.
3. zIndex: Sets the z-order of the object.
4. html: Sets the content of the object. By default, it will be interpreted as text.
5. style: An object that sets the style of the object.
6. css: A string that sets the CSS of the object.
7. scrollLeft and scrollTop: Used for scrolling the object.
8. leftMargin, rightMargin, topMargin, bottomMargin: Set the margins between objects.
9. children: Sets the TModel children of the object.
10. domHolder and domParent: Set to control the HTML element containment and how HTML is nested.
11. isVisible: An optional boolean flag to explicitly control the visibility of the object instead of leaving it to TargetJ to calculate.
12. canHaveDom: A boolean flag that sets if the object can have a DOM element in the page.
13. canHandleEvents: Sets what events the object can handle
14. widthFromDom and heightFromDom: Boolean flags that control if the width and height should be calculated from the DOM element.
15. textOnly: A boolean flag that sets the type of content to be text or HTML.
16. canBeBracketed: A boolean flag that controls if the object will be optimized and included in the TargetJ task process only when visible.
17. isInFlow: A boolean flag that determines if the object will be used to calculate the content height and width of its parent.
18. onResize: An array of targets that will be reset and re-executed after a resize event.
19. onClickEvent: An array of targets that will be reset and re-executed after a click event.
20. onTouchEvent: An array of targets that will be reset and re-executed after a touch event.
21. onScrollEvent: An array of targets that will be reset and re-executed after a scroll event.
22. onKeyEvent: An array of targets that will be reset and re-executed after a key event.

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
1. TargetJ.tapp.stop(): Stops the application.
2. TargetJ.tapp.start(): Restarts the application
3. TargetJ.tapp.throttle: Slows down the application. This represents the pause in milliseconds before starting another TargetJ task cycle. It is zero by default.
4. TargetJ.tapp.debugLevel: Logs information about the TargetJ task cycle and its efficiency. It is zero by default. Set it to 1 to log basic information and 2 to log more detailed information.
5. Use `t()` to find an object from the browser console using its `oid`. Inspect all the vital properities using `t(oid).bug`.
   
## Documentation
Explore the full potential of TargetJ and dive into our interactive documentation at www.targetj.io.

## License
Distributed under the MIT License. See LICENSE for more information.

## Contact
Ahmad Wasfi - wasfi2@gmail.com



