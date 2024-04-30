import { $Dom } from "./$Dom.js";
import { TModel } from "./TModel.js";
import { browser } from "./Browser.js";
import { Dim } from "./Dim.js";
import { EventListener } from "./EventListener.js";
import { LoadingManager } from "./LoadingManager.js";
import { LocationManager } from "./LocationManager.js";
import { PageManager } from "./PageManager.js";
import { SearchUtil } from "./SearchUtil.js";
import { TModelManager } from "./TModelManager.js";
import { TUtil } from "./TUtil.js";
import { TargetManager } from "./TargetManager.js";

var tapp;

function AppFn(uiFactory, rootId) {
    
    function my() {} 
    
    my.throttle = 0;
    my.debugLevel = 0;

    my.runningFlag = false;
    
    my.rootId = rootId ? rootId : "#tpage";

    my.init = function() {
        browser.setup();
        
        my.window = new $Dom(window);
        my.window.addEvent("popstate", function(event) {
            if (event.state) {
                tapp.pager.openLinkFromHistory(event.state);
            }
        });
        
        my.loader = new LoadingManager();
        
        my.pager = new PageManager();
                 
        my.dim = Dim().measureScreen();
        
        my.uiFactory = uiFactory;
        my.ui = uiFactory();
        my.ui.xVisible = true;
        my.ui.yVisible = true;
        
        my.events = new EventListener();
        
        my.locationManager = new LocationManager();
        my.targetManager = new TargetManager();
        my.manager = new TModelManager();
        
        window.history.pushState({ link: document.URL }, "", document.URL);                

        return my;
    };

    my.start = function () {
        my.runningFlag = false; 
        
        if (!$Dom.query(my.rootId)) {
            my.$dom = new $Dom();            
            my.$dom.create('div');
            my.$dom.setSelector(my.rootId);
            my.$dom.setId(my.rootId);
            my.$dom.attr("tabindex", "0");
            new $Dom('body').append$Dom(my.$dom);            
        } else {
            my.$dom = new $Dom(my.rootId);
        }
        
        my.events.removeHandlers();
        my.events.clear();
                        
        my.events.addHandlers(); 
        my.dim.measureScreen();    
        my.resetRuns();

        my.runningFlag = true;
                
        my.$dom.focus();
        
        my.manager.scheduleRun(0, "appStart");

        return my;
    };
    
    my.stop = function()    { 
        my.runningFlag = false;

        my.events.removeHandlers();
        my.events.clear();
        
        my.resetRuns();
                
        return my;
    };
    
    my.resetRuns = function() {
        my.manager.nextRuns = [];
        my.manager.runningStep = 0;
        my.manager.runningFlag = false;
    };
    
    my.reset = function() {
        my.manager.lists.visible.forEach(function(tmodel) { tmodel.domValues = {}; });
        my.manager.lists.visible.length = 0;
        my.manager.lists.invisibleDom.length = 0;
        my.manager.lists.deletedTModel.length = 0; 
        my.manager.lists.visibleNoDom.length = 0;
        my.manager.visibleTypeMap = {};
        my.manager.visibleOidMap = {}; 
        my.locationManager.hasLocationList.length = 0;
        SearchUtil.foundParentWithTarget = {};
        SearchUtil.foundTypeMap = {};
        SearchUtil.foundTargetMap = {}; 
    };
    
    my.isRunning = function() {
        return my.runningFlag;
    };

    my.find = function(oid) {
        return SearchUtil.find(oid);
    };

    return my;
}

function App(uiFactory, rootId) {
    tapp = AppFn(uiFactory, rootId);    
    tapp.init().start();

    return tapp;
}

function getEvents() {
    return tapp ? tapp.events : null;
}

function getPager() {
    return tapp ? tapp.pager : null;
}

function getLoader() {
    return tapp ? tapp.loader : null;
}

function getScreenWidth() {
    return tapp ? tapp.dim.screen.width : 0;
};

function getScreenHeight() {
    return tapp ? tapp.dim.screen.height : 0;
};

window.t = window.t || SearchUtil.find;

App.oids = {};
App.getOid = function(type) { 
    if (!TUtil.isDefined(App.oids[type]))  {
        App.oids[type] = 0;
    }

    var num = App.oids[type]++;
    return { oid: num > 0 ? type + num : type, num: num };
};

export { tapp, App, getEvents, getPager, getLoader, $Dom, getScreenWidth, getScreenHeight };