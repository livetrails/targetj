var browser = {
    style: undefined,
    delayProcess: {},
    setup: function () {
        if (typeof String.prototype.hashCode !== 'function') {
            String.prototype.hashCode = function () {
                var hash = 0, i, chr, len;
                if (this.length === 0) {
                    return hash;
                }
                for (i = 0, len = this.length; i < len; i++) {
                    chr = this.charCodeAt(i);
                    hash = ((hash << 5) - hash) + chr;
                    hash |= 0; // Convert to 32bit integer
                }
                return Math.abs(hash);
            };
        }

        if (!Array.prototype.oids) {
            Array.prototype.oids = function(separator)   {
                return this.map(function(o) { return o.oid; }).join(separator || " ");
            };
        }

        if (!document.getElementsByClassName) {
            var getElementsByClassName = function (className, context) {
                var elems;
                if (document.querySelectorAll) {
                   elems = context.querySelectorAll("." + className);
                } else {
                    var all = context.getElementsByTagName("*");
                    elems = [];
                    for (var i = 0; i < all.length; i++) {
                        if (all[i].className && (" " + all[i].className + " ").indexOf(" " + className + " ") > -1 && elems.indexOf(all[i]) === -1) {
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
    log: function(condition) {
        if (condition === true) {
            return console.log;
        } else {
            return function() {};
        }
    },   
    prefixStyle: function (style) {
        var elementStyle = document.createElement('div').style;
        
        var vendor = '', vendors = ['webkitT', 'MozT', 'msT', 'OT', 't'];

        for (var i = 0; i < vendors.length; i++) {
            var transform = vendors[i] + 'ransform';
            if (transform in elementStyle) {
                vendor = vendors[i].substr(0, vendors[i].length - 1);
            }
        }

        style = vendor === '' ? style : vendor + style.charAt(0).toUpperCase() + style.substr(1);
        
        return style;
    },
    now: Date.now || function () {
        return new Date().getTime();
    },
    nowInSeconds: function () {
        return Math.floor(this.now() / 1000);
    },
    delay: function (fn, oid, delay) {
        var timeStamp = browser.now() + delay;
        
        var nextRun;
        
        if (this.delayProcess.id) {
            if (timeStamp >= this.delayProcess.timeStamp)    {
                nextRun = { timeStamp: timeStamp, oid: oid, delay: delay };
            } else if (timeStamp < this.delayProcess.timeStamp) {
                nextRun = { timeStamp: this.delayProcess.timeStamp, oid: this.delayProcess.oid, delay: this.delayProcess.delay };
                
                clearTimeout(this.delayProcess.id);
                                
                this.delayProcess.oid = oid;
                this.delayProcess.timeStamp = timeStamp;
                this.delayProcess.delay = delay;
                
                this.delayProcess.id = setTimeout(function() {
                   fn();
                   browser.delayProcess = {};
                }, delay);                
            }
        } else {
            this.delayProcess.oid = oid;
            this.delayProcess.timeStamp = timeStamp;
            this.delayProcess.delay = delay;
            
            this.delayProcess.id = setTimeout(function() {
               fn();
               browser.delayProcess = {};
            }, delay);             
        }
        
        return nextRun;
    }
};

export { browser };
