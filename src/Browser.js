var browser = {
    style: undefined,
    delayProcess: {},
    setup: function () {

        if (typeof String.prototype.trim !== 'function') {
            String.prototype.trim = function () {
                return this.replace(/^\s+|\s+$/g, '');
            };
        }     
        if (typeof String.prototype.startsWith !== 'function') {
            String.prototype.startsWith = function (str) {
                return this.indexOf(str) === 0;
            };
        }

        if (typeof String.prototype.endsWith !== 'function') {
            String.prototype.endsWith = function (suffix) {
                return this.indexOf(suffix, this.length - suffix.length) !== -1;
            };
        }

        if (typeof String.prototype.hashCode !== 'function') {
            String.prototype.hashCode = function () {
                var hash = 0, i, chr, len;
                if (this.length === 0)
                    return hash;
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

        if (!Array.prototype.find) {
          Object.defineProperty(Array.prototype, 'find', {
            value: function(predicate) {
              if (this === null) {
                throw new TypeError('"this" is null or not defined');
              }

              var o = Object(this);

              var len = o.length >>> 0;

              if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
              }

              var thisArg = arguments[1];

              var k = 0;

              while (k < len) {
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) {
                  return kValue;
                }
                k++;
              }

              return undefined;
            },
            configurable: true,
            writable: true
          });
        }

        if (!document.getElementsByClassName) {
            var getElementsByClassName = function (className, context) {
                var elems = document.querySelectorAll ? context.querySelectorAll("." + className) : (function () {
                    var all = context.getElementsByTagName("*"), elements = [];
                    for (var i = 0; i < all.length; i++) {
                        if (all[i].className && (" " + all[i].className + " ").indexOf(" " + className + " ") > -1 && indexOf.call(elements, all[i]) === -1)
                            elements.push(all[i]);
                    }
                    return elements;
                })();
                return elems;
            };
            document.getElementsByClassName = function (className) {
                return getElementsByClassName(className, document);
            };
            Element.prototype.getElementsByClassName = function (className) {
                return getElementsByClassName(className, this);
            };
        }

        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] ||
                    window[vendors[x] + 'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function (callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                },
                        timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
        }

        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function (id) {
                clearTimeout(id);
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
        
        var vendor = '';
        
        var vendors = ['webkitT', 'MozT', 'msT', 'OT', 't'];

        for (var i = 0; i < vendors.length; i++) {
            var transform = vendors[i] + 'ransform';
            if (transform in elementStyle) {
                vendor = vendors[i].substr(0, vendors[i].length - 1);
            }
        }

        style = vendor === '' ? style : vendor + style.charAt(0).toUpperCase() + style.substr(1);
        
        return style;
    },
    getParameterByName: function (name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(location.search);
        return results === null ? 0 : decodeURIComponent(results[1].replace(/\+/g, " "));
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
