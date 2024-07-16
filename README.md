# TargetJ: JavaScript UI framework

Welcome to TargetJ, a powerful JavaScript UI framework designed to simplify development and animation. (https://targetj.io)

TargetJ distinguishes itself by introducing a novel concept known as 'targets', which forms its core. Targets are used as the main building blocks of components instead of direct variables and methods. Each component in TargetJ is a set of targets. Targets are employed across all aspects of the program. They are used in animation, controlling program flow, loading data from external APIs, handling user events, and more.

## Brief overview of how it operates

Each target in TargetJ essentially has two variables: target and actual. When the target value does not equal the actual value, TargetJ will update the actual value iteratively until it matches the target value. This iteration is determined by two additional variables: steps and step interval. Steps dictate the number of iterations, and the step interval specifies the duration in milliseconds that the system waits before executing the next iteration.

To animate a variable, create a target after its name. The variable can be of any type: boolean, number, string, object, or array.

## Target life cycle and methods

By default, a target in TargetJ has a simple life cycle: it executes only once. However, targets come with a number of methods that control execution and extend their behavior.

1. **onEnabled**
Determines whether the target is eligible for execution. Targets remain inactive until enabled. This method ensures that targets are executed only under suitable conditions and are commonly used to establish dependencies between targets, ensuring they execute at precisely the right moment.

2. **loop**
Controls the repetition of target execution. If loop() returns true, the target will stay active and continue to execute indefinitely. It will become inactive and stop executing when it returns false.

3. **onValueChange**
Monitors changes in the value returned by the main value() for the target. It is triggered whenever there is a change in the value returned by value(). This could be used, for example, to wait for asynchronous responses.

4. **onStepsEnd**
Executes actions after all increments are completed. This method is invoked only after the final step is executed, assuming the target has a defined steps value. It's useful for cleanup or finalization tasks after a sequence of steps.


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



