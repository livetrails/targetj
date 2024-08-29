const browser = {
    style: undefined,
    delayProcess: {},
    setup() {
        if (!Array.prototype.oids) {
            Array.prototype.oids = function(separator) {
                return this.map(o => o.oid).join(separator || " ");
            };
        }

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
    },
    log(condition) {
        return condition === true ? console.log : () => {};
    },
    prefixStyle(style) {
        const elementStyle = document.createElement('div').style;
        
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
    },
    now: Date.now || function() {
        return new Date().getTime();
    },
    nowInSeconds() {
        return Math.floor(this.now() / 1000);
    },
    delay(fn, oid, delay) {
        const timeStamp = browser.now() + delay;
        
        let nextRun;
        
        if (this.delayProcess.id) {
            if (timeStamp >= this.delayProcess.timeStamp) {
                nextRun = { timeStamp, oid, delay };
            } else if (timeStamp < this.delayProcess.timeStamp) {
                nextRun = { timeStamp: this.delayProcess.timeStamp, oid: this.delayProcess.oid, delay: this.delayProcess.delay };
                
                clearTimeout(this.delayProcess.id);
                                
                this.delayProcess.oid = oid;
                this.delayProcess.timeStamp = timeStamp;
                this.delayProcess.delay = delay;
                
                this.delayProcess.id = setTimeout(() => {
                    fn();
                    browser.delayProcess = {};
                }, delay);                
            }
        } else {
            this.delayProcess.oid = oid;
            this.delayProcess.timeStamp = timeStamp;
            this.delayProcess.delay = delay;
            
            this.delayProcess.id = setTimeout(() => {
                fn();
                browser.delayProcess = {};
            }, delay);             
        }
        
        return nextRun;
    }
};

export { browser };
