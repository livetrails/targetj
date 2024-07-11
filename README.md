# TargetJ

Welcome to TargetJ, a powerful JavaScript framework designed to make building dynamic and responsive web applications easier and more efficient.

TargetJ distinguishes itself by introducing a novel concept known as 'targets', which forms its core. Targets are used as the main building blocks of components instead of direct variables and methods. Each component in TargetJ is a set of targets. They are used to define UI properties, update HTML, add children, handle user events, load data from external APIs, and more. For more details and examples, please visit www.targetj.io.

## Features

- **No HTML required**: One of the principles of TargetJ is to employ a flat page design where HTML nesting is kept to a minimum. Consequently, HTML tags are seldom necessary except for images, text input, and text areas. In cases where nesting is necessary, it's handled dynamically and can be altered at runtime, unlike the static nesting in HTML.
- **No HTML nesting**: HTML nesting is seldom required in TargetJ. If it is required, nesting is done at runtime. Elements can be dynamically detached and incorporated into other elements, facilitating the easy reuse of components regardless of their location or attachment. For instance, the same login button can be attached to the toolbar or placed in the middle of the page.
- **Next-level animation**: TargetJ was built from scratch to be able to orchestrate intricate animations involving numerous objects with complex sequences. Users can program objects to move at varying speeds, pause at certain intervals, and repeat sequences based on various conditions. It allows the creation of captivating animations resulting in rich and engaging user experiences.
- **Handle 100,000s of items**: TargetJ efficiently manages large collections of objects on a single page. This is done by its data structure and optimization algorithm. It divides a long list into a tree structure, monitoring only the keeps track of the branches that are visible to the user at any given time. In our examples page, infinite scrolling and infinite zooming demonstrate how it handles dynamically expanding lists of objects.
- **Control the flow of execution with time**: TargetJ simplifies the execution of various program segments at specific times, making it easy to sequence or parallelize numerous actions. This functionality supports the development of applications that are efficient and responsive, capable of managing complex operations. It enhances user experiences and optimizes resource utilization.
- **Handle events effortlessly**: In TargetJ, events are triggered synchronously and are designed so that any component can detect when an event occurs. Event handling can be simply implemented as conditions in the enabling functions of \'targets.\' This ensures that managing events is both simple and effective.
- **Easy to learn**: TargetJ simplifies development by employing the concept of \'targets\' across all aspects of the program. These targets are used in animations,ncontrolling program flow, integrating APIs, and more. This unified approach means that one core concept is applied throughout the program, making TargetJ easy to learn.


## Getting Started


### Installation

To install TargetJ, run the following command in your terminal:

```bash
npm install targetj
```

### Quick Example

```bash
import { App, TModel } from 'targetj';

App(new TModel({ html: 'Hello World'}));
```

## Documentation
For more detailed information on using TargetJ, please refer to www.targetj.io

## License
Distributed under the MIT License. See LICENSE for more information.

## Contact
Ahmad Wasfi - wasfi2@gmail.com



