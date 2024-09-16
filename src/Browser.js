import { $Dom } from "./$Dom.js";

/**
 *  It provides utility functions for handling browser-specific features such as DOM manipulation and CSS transformation
 */
class Browser {
    constructor() {
        this.style = undefined;
        this.screen = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };        
    }

    setup() {
        if (!document.getElementsByClassName) {
            const getElementsByClassName = (className, context) => {
                let elems;
                if (document.querySelectorAll) {
                   elems = context.querySelectorAll(`.${className}`);
                } else {
                    const all = context.getElementsByTagName("*");
                    elems = [];
                    for (let i = 0; i < all.length; i++) {
                        if (all[i].className && (` ${all[i].className} `).indexOf(` ${className} `) > -1 && elems.indexOf(all[i]) === -1) {
                            elems.push(all[i]);
                        }
                    }
                }
                return elems;
            };

            document.getElementsByClassName = function (className) {
                return getElementsByClassName(className, document);
            };

            Element.prototype.getElementsByClassName = function (className) {
                return getElementsByClassName(className, this);
            };
        }

        this.style = {
            transform: this.prefixStyle('transform'),
            transitionTimingFunction: this.prefixStyle('transitionTimingFunction'),
            transitionDuration: this.prefixStyle('transitionDuration')
        };
    }

    prefixStyle(style) {
        const $dom = new $Dom();
        $dom.create('div');
        const elementStyle = $dom.style();
        let vendor = '';
        const vendors = ['webkitT', 'MozT', 'msT', 'OT', 't'];

        for (let i = 0; i < vendors.length; i++) {
            const transform = vendors[i] + 'ransform';
            if (transform in elementStyle) {
                vendor = vendors[i].substr(0, vendors[i].length - 1);
            }
        }

        style = vendor === '' ? style : vendor + style.charAt(0).toUpperCase() + style.substr(1);
        return style;
    }
    
    measureScreen() {
        this.screen.width = document.documentElement.clientWidth || document.body.clientWidth;
        this.screen.height = document.documentElement.clientHeight || document.body.clientHeight;

        return this.screen;
    }
}

export { Browser };
