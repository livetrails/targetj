# TargetJ: JavaScript UI framework

Welcome to TargetJ, a powerful JavaScript UI framework designed to simplify development and animation. (https://targetj.io)

TargetJ distinguishes itself by introducing a novel concept known as 'targets', which forms its core. Targets are used as the main building blocks of components instead of direct variables and methods. Each component in TargetJ is a set of targets. Targets are employed across all aspects of the program. They are used in animation, controlling program flow, loading data from external APIs, handling user events, and more.

Targets enhance both variables and methods by giving them lifecycles and the autonomy to run independently, rather than always being controlled externally. They can execute under specific conditions, manage the number and timing of executions, and provide callbacks to oversee their life cycles.

## What are targets?

Targets provide a unified, autonomous approach for managing passive variables and methods, mimicking the behavior of live cells in living beings. They largely manage themselves autonomously, with various callbacks available to adjust for changes.

For variables, targets enhance functionality by giving them the ability to iterate in steps until they reach the specified value, rather rather than being immediately assigned their values. They can introduce pauses between iterations and offer callbacks to monitor progress, track the progress of other variables, and manage their life cycles accordingly.

Similarly, targets enhance methods by allowing them to manage their own life cycles. They execute under specific conditions, control the number of executions, and offer the same capabilities as those provided to variables.

## What does a target consist of?

Each target consists of the following:
1. Target Value and Actual Value. The target value represents a variable or the outcome of a method. The actual value reflects the transitional value between the previous target value and the current target value. When the target value differs from the actual value, TargetJ iteratively updates the actual value until it matches the target value. This process is managed by two additional variables: Step, which dictates the number of iterations, and Interval, which specifies the duration (in milliseconds) the system waits before executing the next iteration.

2. State: Targets have three states that control their lifecycle: Active, Updating, and Complete. Active: Indicates that the target value needs to be initialized from the variable or that the method needs to be executed to calculate its output. Updating: Indicates that the actual value is being adjusted to reach the target value. Complete: Indicates that the target execution is finished, and the actual value has matched the target value.

3. Target Methods: All methods are optional. They are used to control the lifecycle of targets or serve as callbacks to reflect changes. The controlling methods are: enabledOn, loop, steps, cycles. The callbacks are: onValueChange, onStepsEnd, onImperativeStep, onImperativeEnd. More details in the method section.

## Brief overview of how it operates

All targets are in the active state by default. They can include an enabledOn function that delays their execution until the specified conditions are met. Targets can also be set to inactive and activated externally when needed. The target task monitors all active targets, and if a target is enabled, it will be executed. The target value is generated either from the result of a method or from a static value defined in the target. For simple targets without steps, cycles, or loops, the actual value is set immediately based on the target value. Once executed, the target’s state becomes complete, and it will not be executed again.

If the target has loop or cycle methods defined, its value method will be re-executed after a pause specified by the interval. The number of executions will be determined by the cycles or will continue as long as the loop condition returns true. If the target has steps defined, its state changes to updating, and the actual value is updated iteratively until it reaches the target value, according to the number of steps and pauses specified by steps and intervals.

A target can reactivate itself under various conditions, such as when all steps are completed, all imperative targets initiated by that target are completed, or the targets of the component’s children are completed. It can also be reactivated externally, either directly or through an event.

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

## Declarative and imperative targets

Targets in TargetJ can be defined in two ways: declaratively or imperatively.

The declarative approach offers a structured way to define targets. However, orchestrating multiple targets simultaneously can be challenging, especially when each target has different speed and timing requirements that depend on each other.

To address this, TargetJ provides a way to call imperative targets using the setTarget function. This allows you to set multiple targets from one declarative target. Additionally, it offers onImperativeStep and onImperativeEnd callbacks, which enable declarative targets to track every step of each imperative target or just their completion.

By combining both declarative and imperative targets, you gain a powerful toolset for designing complex interactions.

## Special target names used by TargetJ

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
  
## Getting Started

### Installation

To install TargetJ, run the following command in your terminal:

```bash
npm install targetj
```

## Examples

### Hello World example

```bash
import { App, TModel } from 'targetj';

App(new TModel({ html: 'Hello World'}));
```

### Simple animation example
```bash
import { App, TModel } from 'targetj';

App(new TModel({
    style: { backgroundColor: '#f00' },
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
    style: { backgroundColor: '#f00' },
    width: [ 250, 30, 50],
    height: [ 250, 30, 50],
    opacity: [ 0.15, 30, 50]
 }));
```

### More complicated example

You can find a running example, which also demonstrates how the code operates, at https://targetj.io/docs/declarative.html

```bash
import { App, TModel, getScreenWidth, getScreenHeight } from "targetj";

App(
  new TModel({
    add() {
      for (var i = 0; i < 10; i++) {
        this.addChild(
          new TModel("square", {
            width: 50,
            height: 50,
            style: { backgroundColor: "#f00" },
            rotate: {
              cycles: 1000,
              steps: 15,
              stepInterval: 50,
              value(key, cycle) {
                return [360, 0][cycle % 2];
              },
            },
          })
        );
      }
    },
    animate: {
      loop: true,
      stepInterval: 1600,
      value() {
        this.getChildren().forEach((child) => {
          child.setTargetValue("x", -child.getWidth());
          child.setTargetValue("x", getScreenWidth() + child.getWidth(), 30, 50);
          child.setTargetValue("y", Math.random() * getScreenHeight(), 30, 50);
        });
      },
      enabledOn() {
        return this.isTargetComplete("add");
      },
    },
    width() {
      return getScreenWidth();
    },
    height() {
      return getScreenHeight();
    },
  })
);
```

## How to debug in TargetJ
1. TargetJ.tapp.stop(): Stops the application.
2. TargetJ.tapp.start(): Restarts the application
3. TargetJ.tapp.throttle: Slows down the application. This represents the pause in milliseconds before starting another TargetJ task cycle. It is zero by default.
4. TargetJ.tapp.debugLevel: Logs information about the TargetJ task cycle and its efficiency. It is zero by default. Set it to 1 to log basic information and 2 to log more detailed information.
5. Use `t()` to find an object from the browser console using its `oid`: Inspect its targetValues to display the status of its targets.

## Documentation
Explore the full potential of TargetJ and dive into our interactive documentation at www.targetj.io.

## License
Distributed under the MIT License. See LICENSE for more information.

## Contact
Ahmad Wasfi - wasfi2@gmail.com



