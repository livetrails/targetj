import { $Dom } from "./$Dom.js";
import { getScreenWidth, getScreenHeight } from "./App.js";
import { SearchUtil } from "./SearchUtil.js";

function TUtil() {}

TUtil.getBoundingRect = function(tmodel) {
    var left, top, right, bottom;
    
    if (tmodel.actualValues.domHolder && tmodel.actualValues.domHolder.exists()) {
        var rect = tmodel.actualValues.domHolder.getBoundingClientRect();
        left = rect.left;
        top = rect.top;
        right = rect.right;
        bottom = rect.bottom;
    } else {
        var parent = tmodel.getDomParent() ? tmodel.getDomParent() : SearchUtil.findParentByTarget(tmodel, 'domHolder');

        if (parent) {
            left = parent.absX;
            top = parent.absY;
            right = left + parent.getWidth();
            bottom = top + parent.getHeight();
        } else {
            left = 0;
            top = 0;
            right = getScreenWidth();
            bottom = getScreenHeight();
        }
    }
    
    return { left: left, top: top, right: right, bottom: bottom };
};


TUtil.initDoms = function(visibleList) {
    
    var elements = $Dom.findByClass('tgt'); 
        
    visibleList.forEach(function(tmodel) {
        tmodel.$dom = null;
    });
    
    var visibleMap = TUtil.list2map(visibleList.filter(function(item) { return item.type !== 'BI'; }));
    
    for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        
        var id = element.getAttribute("id");

        var tmodel = visibleMap[id];
                        
        if (tmodel && !tmodel.hasDom()) {
            tmodel.$dom = new $Dom("#" + id);
        } else {
            $Dom.detach(element);
        }
    }   
};

TUtil.list2map = function(list, defaultValue) {
    var map = list.reduce(function(a, c){
        a[c.oid] = TUtil.isDefined(defaultValue) ? defaultValue : c;
        return a;
    }, {});
    
    return map;
};

TUtil.getDeepList = function(parent)   {
    var deepList = []; 
    
    function traverse(tmodel) {
        if (tmodel.hasChildren())  {
            var list = tmodel.getChildren();
            deepList = deepList.concat(list);
            list.forEach(function(t) {
                traverse(t);
            });            
        }
    }
    
    traverse(parent);
    return deepList;
};

TUtil.areEqual = function(a, b, deepEquality) {

    if (deepEquality) {        
        return JSON.stringify(a) === JSON.stringify(b);     
    } else {
        return a === b;
    } 
};

TUtil.momentum = function (past, current, time) {
    time = time || 1;

    var distance = current - past;
    var speed = Math.abs(distance) / time;
    var duration = Math.floor(speed * 5000);
    var momentumDistance = 5 * duration;
    var adjustedDistance = distance > 0 ? distance + momentumDistance : distance - momentumDistance;
    
    return {
        distance: Math.round(adjustedDistance) / 50,
        duration: duration,
        momentumDistance: time,
        time: time * 5
    };
};

TUtil.isDefined = function (obj) {
    return typeof (obj) !== "undefined" && obj !== null;
};

TUtil.isNumber = function(num) {
    return typeof num === 'number' && !isNaN(num);
};

TUtil.limit = function (num, low, high) {
    num = !TUtil.isDefined(num) ? low : num;
    num = num > high ? high : num;
    num = num < low ? low : num;

    return num;
};

TUtil.getOptionValue = function(option, defaultValue, tmodel)    {
    return !TUtil.isDefined(option) ? defaultValue : typeof option === 'function' ? option.call(tmodel) : option;
};

TUtil.executeFunctionByName = function (functionName, context) {
    if (!functionName)
        return null;

    var args = Array.prototype.slice.call(arguments, 2);
    var namespaces = functionName.split(".");
    var func = namespaces.pop();
    for (var i = 0; i < namespaces.length; i++) {
        context = context[namespaces[i]];
    }

    if (context && context[func]) {
        return context[func].apply(context, args);
    }
};

TUtil.formatPeriod = function (seconds) {
    seconds = seconds < 0 ? 0 : seconds;
    if (seconds < 120) {
        return seconds + " sec";
    } else if (seconds < 7200) {
        return Math.floor(seconds / 60) + " min";
    } else if (seconds < 172800) {
        return Math.floor(seconds / 3600) + " hours";
    } else {
        return Math.floor(seconds / 86400)  + " days";
    }
};

TUtil.formatNum = function (num, precision) {
    if (!num) return 0;
    var s = num.toString();
    var n = parseFloat(s);
    return n.toFixed(precision);
};

TUtil.distance = function(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
};

TUtil.getFullLink = function(link) {
    if (!TUtil.isDefined(link)) return;
    
    if (link.indexOf('http') === 0) {
        return link;
    } else {
        var protocol = window.location.protocol;
        protocol += protocol.endsWith(":") ? "//" : "://";
        var base = protocol + window.location.hostname;
        return link.startsWith("/") ? base + link : base + "/" + link;
    }
};

export { TUtil };