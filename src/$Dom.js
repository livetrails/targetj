import { browser } from "./Browser.js";
import { TUtil } from "./TUtil.js";

function $Dom(elemSelector) {
    if (typeof elemSelector === 'string') {
        this.selector = elemSelector;
        this.element = $Dom.query(elemSelector);
    } else if (elemSelector) {
        this.element = elemSelector;
    }
    
    this.childrenCount = 0;
    this.$domParent = undefined;
    this.originalContent = undefined;
    this.textOnly = true;
}

$Dom.prototype.exists = function() {
    if (this.selector) {
        this.element = $Dom.query(this.selector);
    }
    
    return !!this.element;
};

$Dom.prototype.create = function(tag) {
    this.element = document.createElement(tag);
};

$Dom.prototype.setSelector = function(selector) {
    this.selector = selector;
};

$Dom.prototype.setId = function(id) {
    this.attr("id", id[0] === '#' ? id.slice(1) : id);        
};

$Dom.prototype.focus = function() {
    this.element.focus();
};

$Dom.prototype.attr = function(name, value) {
    if (!this.element) return;
    
    if (TUtil.isDefined(value)) {
        this.element.setAttribute(name, value);
    } else {
        return this.element.getAttribute(name);
    }
};

$Dom.prototype.opacity = function(opacity) {
    if (TUtil.isDefined(opacity)) {
        this.element.style.opacity = opacity;        
    } else {
        return this.element.style.opacity;        
    }       
};

$Dom.prototype.width = function(width) {
    if (TUtil.isDefined(width)) {
        this.element.style.width = TUtil.isNumber(width) ? width + 'px' : width;  
    } else {
        return this.element.offsetWidth;        
    }      
};

$Dom.prototype.height = function(height) {
    if (TUtil.isDefined(height)) {
        this.element.style.height = TUtil.isNumber(height) ? height + 'px' : height;  
    } else {
        return this.element.offsetHeight;        
    }
};

$Dom.prototype.zIndex = function(zIndex) {
    if (TUtil.isDefined(zIndex)) {
        this.element.style.zIndex = zIndex;
    }
    
    return this.element.style.zIndex;
};

$Dom.prototype.css = function(css) {
    if (TUtil.isDefined(css)) {
         this.attr('class', css);
    } else {
        return this.attr('classs');        
    }  
};

$Dom.prototype.setStyleByMap = function(attrMap) {
    var self = this;
    Object.keys(attrMap).forEach(function(key) {
        var value = attrMap[key];
        switch(key) {
            case 'transform':
                self.transform.apply(self, value);
                break;
                
            case 'width': 
                self.width(value);
                break;

            case 'height': 
                self.height(value);
                break;
                        
            case 'zIndex': 
                self.zIndex(value);
                break;
                
            case 'opacity':
                self.opacity(value);
                break;

            default: 
                self.setStyle(key, value);
        }
    });
};

$Dom.prototype.setStyle = function(name, value) {
    this.element.style[name] = value;
};

$Dom.prototype.getStyle = function(name) {
    return this.element.style[name];
};

$Dom.prototype.getStyleValue = function(name) {
    var styleValue = this.getStyle(name);
    var numericValue = TUtil.isDefined(styleValue) ? styleValue.replace(/[^-\d.]/g, '') : 0;
    return parseFloat(numericValue);    
};

$Dom.prototype.parent = function() {
    return this.element ? this.element.parentElement : null;
};

$Dom.prototype.detach = function() {
    $Dom.detach(this.element);
    if (this.$domParent && this.$domParent.childrenCount > 0) this.$domParent.childrenCount--;
};

$Dom.prototype.append$Dom = function($dom) {
    this.element.appendChild($dom.element);
};

$Dom.prototype.appendTModel$Dom = function(tmodel) {
    if (this.childrenCount === 0 && this.element.children.length > 1 && tmodel.getDomParent() && tmodel.getDomParent().getHtml()
            && tmodel.getDomParent().getHtml() === this.originalContent) {
        this.element.innerHTML = "<div>" + this.html() + "</div>";
    }
    
    this.element.appendChild(tmodel.$dom.element);
    tmodel.$dom.$domParent = this;
    this.childrenCount++;
};

$Dom.prototype.html = function(html) {
    if (TUtil.isDefined(html)) { 
        if (this.childrenCount > 0) {

            var element = document.createElement('div');
            element.innerHTML = html;
                    
            if (TUtil.isDefined(this.originalContent)) {
                this.element.replaceChild(element, this.element.firstChild);
            } else {
                this.element.insertBefore(element, this.element.firstChild);
            }

            this.originalContent = html;
            this.textOnly = false;
            
        } else {
            this.element.innerHTML = html; 
            this.originalContent = html;
            this.textOnly = false;
        }          
    } else {
        return this.originalContent;
    }
};

$Dom.prototype.text = function(text) {
    if (TUtil.isDefined(text)) { 
        if (this.childrenCount > 0) {
            var element = document.createTextNode(text);
            if (TUtil.isDefined(this.originalContent)) {
                this.element.replaceChild(element, this.element.firstChild);
            } else {
                this.element.insertBefore(element, this.element.firstChild);
            }

            this.originalContent = text;
            this.textOnly = true;
            
        } else {
            this.element.textContent = text; 
            this.originalContent = text;
            this.textOnly = true;
        }          
    } else {
        return this.originalContent;
    }
};

$Dom.prototype.outerHTML = function(html) {
    this.element.outerHTML = html; 
};

$Dom.prototype.innerHTML = function(html) {
    if (TUtil.isDefined(html)) {
        this.element.innerHTML = html; 
    } else {
        return this.element.innerHTML;
    }
};

$Dom.prototype.addClass = function(className) {
    var oldValue = this.attr('class');
    var newValue = !oldValue ? className : oldValue.indexOf(className) >= 0 ? oldValue : oldValue + ' ' + className;
   
    if (newValue !== oldValue) {
        this.attr('class', newValue);       
    }
};

$Dom.prototype.addEvent = function (type, fn) {
    if (!this.element.addEventListener) {
        this.element.attachEvent("on" + type, fn);
    } else {
        this.element.addEventListener(type, fn, { capture: false, passive: false });
    }
};

$Dom.prototype.detachEvent = function (type, fn) {
    if (this.element.removeEventListener) {
        this.element.removeEventListener(type, fn, false);
    } else if (this.element.detachEvent) {
        this.element.detachEvent("on" + type, fn);
    } else {
        this.element["on" + type] = null;
    }
};

$Dom.prototype.transform = function(x, y, rotate, scale) {
    var tranformValue = this.createTrasformValue(x, y, rotate, scale);
    if (tranformValue !== this.element.style[browser.style.transform]) {
       this.element.style[browser.style.transform] = tranformValue;        
    }
};

$Dom.prototype.createTrasformValue = function(x, y, rotate, scale) {
    rotate = TUtil.isDefined(rotate) && rotate !== 0 ? 'rotate(' + rotate + 'deg)' : '';
    scale = TUtil.isDefined(scale) && scale !== 1 ? 'scale(' + scale + ')' : '';
        
    return 'translate(' + x + 'px,' + y + 'px)' + rotate + scale;
};

$Dom.prototype.getContext = function(type, selector) {
    var element = TUtil.isDefined(selector) ? $Dom.query(selector) : this.query('canvas');
    return element ? element.getContext(type) : undefined;
};

$Dom.prototype.findFirstByClass = function(className) {
    return $Dom.findFirstByClass(className, this.element);
};

$Dom.prototype.findFirstByTag = function(tagName) {
    return $Dom.findFirstByTag(tagName, this.element);
};

$Dom.prototype.query = function(selector) {
    return selector[0] === '#' ? $Dom.findById(selector) : selector[0] === '.' ? this.findFirstByClass(selector) : this.findFirstByTag(selector);
};

$Dom.query = function(selector) {
    return selector[0] === '#' ? $Dom.findById(selector) : selector[0] === '.' ? $Dom.findFirstByClass(selector) : $Dom.findFirstByTag(selector);
};

$Dom.findById = function(id) {
    return document.getElementById(id[0] === '#' ? id.slice(1) : id);
};

$Dom.findFirstByClass = function(className, element) {
    var elements = $Dom.findByClass(className, element);
    return elements.length > 0 ? elements[0] : null;
};

$Dom.findFirstByTag = function(tagName, element) {
    var elements = $Dom.findByTag(tagName, element);
    return elements.length > 0 ? elements[0] : null;
};

$Dom.findByTag = function(tagName, element) {
    element = TUtil.isDefined(element) ? element : document;
    return element.getElementsByTagName(tagName);
};

$Dom.findByClass = function(className, element) {
    element = TUtil.isDefined(element) ? element : document;
    return element.getElementsByClassName(className[0] === '.' ? className.slice(1) : className);
};

$Dom.findNearestParentWithId = function(element) {
    while (element) {
        if (typeof element.getAttribute === 'function' && element.getAttribute("id")) {
            return element.getAttribute("id");
        }
        
        element = element.parentElement;
    }
};

$Dom.detach = function(element) {
    var parent = TUtil.isDefined(element) ? element.parentElement : null;
    if (parent) {
        parent.removeChild(element);        
    }
};

$Dom.ready = function(callback) {   
    var $doc = new $Dom(document);
    $doc.addEvent('DOMContentLoaded', callback);
};

$Dom.ajax = function(query) {
    var xhr = new XMLHttpRequest();

    var params = "";
    if (query.data) {
        params = Object.keys(query.data).map(function(key) {
            return key + "=" + encodeURIComponent(query.data[key]);
        }).join('&');
    }
      
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var response = query.dataType === 'json' ? JSON.parse(this.responseText) : this.responseText;
                query.success(response);
            } else {
                query.error(xhr.status);
            }
        }
    };
    
    if (query.type === 'POST') {
        xhr.open(query.type, query.url, true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhr.send(params);
    } else {
        query.url += !params ? "" : query.url > "" && query.url.indexOf("?") >= 0 ? "&" + params : "?" + params;
        xhr.open(query.type, query.url, true); 
        xhr.send();        
    }
};

export { $Dom };
