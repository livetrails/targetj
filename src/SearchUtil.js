import { TUtil } from "./TUtil.js";
import { tapp } from "./App.js";

function SearchUtil() {}

SearchUtil.foundParentWithType = {};
SearchUtil.foundParentWithTarget = {};
SearchUtil.foundTypeMap = {};
SearchUtil.foundTargetMap = {};
SearchUtil.foundOids = {};

SearchUtil.findFirstPinchHandler = function(tmodel) {
    return SearchUtil.findEventHandler(tmodel, 'pinch');
};

SearchUtil.findFirstScrollTopHandler = function(tmodel) {
    return SearchUtil.findEventHandler(tmodel, 'scrollTop');
};

SearchUtil.findFirstScrollLeftHandler = function(tmodel) {
    return SearchUtil.findEventHandler(tmodel, 'scrollLeft');
};

SearchUtil.findFirstTouchHandler = function(tmodel) {
    return SearchUtil.findEventHandler(tmodel, 'touch');
};

SearchUtil.findEventHandler = function(tmodel, eventName) {
    while (tmodel) {
        if (tmodel.canHandleEvents() === true || tmodel.canHandleEvents() === eventName || (Array.isArray(tmodel.canHandleEvents()) && tmodel.canHandleEvents().includes(eventName))) {
            return tmodel;
        }

        tmodel = tmodel.getParent();
    }
};

SearchUtil.findParentWithType = function(child, type) {
    var parent;
      
    function search() {
        parent = child.getParent();
        while (parent) {
            if (parent.type === type) {
                break;
            }
            parent = parent.getParent();
        }
    }
    
    var indexKey = child.oid + "__" + type;
        
    if (!TUtil.isDefined(SearchUtil.foundParentWithType[indexKey])) {
        search();
        
        if (parent) {
            SearchUtil.foundParentWithType[indexKey] = parent;
        }
    }
    
    return SearchUtil.foundParentWithType[indexKey];
};

SearchUtil.findParentWithTarget = function(child, targetName) {
    var parent;
      
    function search() {
        parent = child.getParent();
        while (parent) {
            if (TUtil.isDefined(parent.targets[targetName]) || TUtil.isDefined(parent.targetValues[targetName])) {
                break;
            }
            parent = parent.getParent();
        }
    }
    
    var indexKey = child.oid + "__" + targetName;
        
    if (!TUtil.isDefined(SearchUtil.foundParentWithTarget[indexKey])) {
        search();
        
        if (parent) {
            SearchUtil.foundParentWithTarget[indexKey] = parent;
        }
    }
    
    return SearchUtil.foundParentWithTarget[indexKey];
};

SearchUtil.findByType = function (type) {
    var tmodel;
    
    function search(container) {
        
        if (container.type === type) return container;
        
        var children = container.getChildren();
        var found;
        
        for (var i = 0; children && i < children.length && !found; i++) {

            tmodel = children[i];

            if (tmodel.hasChildren()) {
                found = search(tmodel);
            } else if (tmodel.type === type) {
                found = tmodel;
            }
        }

        return found;
    }
    
    if (!TUtil.isDefined(SearchUtil.foundTypeMap[type])) {
        tmodel = search(tapp.ui);  
        if (tmodel) {
            SearchUtil.foundTypeMap[type] = tmodel;
        }
    }
    
    return SearchUtil.foundTypeMap[type];
};

SearchUtil.findByTarget = function (target) {
    var tmodel;
    
    function search(container) {

        if (container.targets[target]) return container;
        
        var children = container.getChildren();
        var found;
        
        for (var i = 0; children && i < children.length && !found; i++) {

            tmodel = children[i];

            if (tmodel.hasChildren()) {
                found = search(tmodel);
            } else if (tmodel.targets[target]) {
                found = tmodel;
            }
        }
        
        return found;
    }
    
    if (!TUtil.isDefined(SearchUtil.foundTargetMap[target])) {
        tmodel = search(tapp.ui);  
        if (tmodel) {
            SearchUtil.foundTargetMap[target] = tmodel;
        }
    }
    
    return SearchUtil.foundTargetMap[target];
};

SearchUtil.find = function (oid) {
    var tmodel;
    
    function search(container) {
        
        if (container.oid === oid) return container;
        
        var children = container.getChildren();
        var found;

        for (var i = 0; children && i < children.length && !found; i++) {
            tmodel = children[i];

            if (tmodel.hasChildren()) {
                found = search(tmodel);
            } else if (tmodel.oid === oid) {
                found = tmodel;
            }
        }
        
        return found;
    }
       
    if (!TUtil.isDefined(SearchUtil.foundOids[oid])) {
        tmodel = search(tapp.ui);  
        if (tmodel) {
            SearchUtil.foundOids[oid] = tmodel;
        }
    }
    
    return SearchUtil.foundOids[oid];
};

export { SearchUtil };
