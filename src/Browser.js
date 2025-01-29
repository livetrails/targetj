import { $Dom } from "./$Dom.js";

/**
 *  It provides utility functions for handling browser-specific features such as DOM manipulation and CSS transformation
 */
class Browser {
    constructor() {
        this.style = undefined;     
    }

    setup() {
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
}

export { Browser };
