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

function AppFn(firstChild) { 
        
    function my() {} 
    
    my.throttle = 0;
    my.debugLevel = 0;

    my.runningFlag = false;
    
    my.init = function() {
        browser.setup();
        
        my.$window = new $Dom(window);
        my.$window.addEvent("popstate", function(event) {
            if (event.state) {
                tapp.pager.openLinkFromHistory(event.state);
            }
        });
                
        my.loader = new LoadingManager();
        
        my.pager = new PageManager();
                 
        my.dim = Dim().measureScreen();
                        
        my.events = new EventListener();
        
        my.locationManager = new LocationManager();
        my.targetManager = new TargetManager();
        my.manager = new TModelManager();
        
        my.trootFactory = function() {
            
            var troot = new TModel('targetj');
                        
            troot.addChild = function(child, index) {
                if (!TUtil.isDefined(child.targets['domHolder'])) {
                    child.addTarget('domHolder', {
                        value: function() {
                            var $dom;
                            if (!$Dom.query('#tj-root')) {
                                $dom = new $Dom();            
                                $dom.create('div');
                                $dom.setSelector('#tj-root');
                                $dom.setId('#tj-root');
                                $dom.attr("tabindex", "0");
                                new $Dom('body').insertFirst$Dom($dom);            
                            } else {
                                $dom = new $Dom('#tj-root');
                            }
                            return $dom;
                        }
                    });
                }
                
                if (!TUtil.isDefined(child.targets['addEventHandler'])) {                
                    child.addTarget('addEventHandler', {
                        value: function() {
                            my.events.removeHandlers(this.$dom);
                            my.events.addHandlers(this.$dom);
                            if (this.hasDom) {
                                this.$dom.focus();                                
                            }
                        },
                        enabledOn: function() {
                            return this.hasDom();
                        }
                    });
                }
                
                TModel.prototype.addChild.call(troot, child, index);  
            };
                        
            if (my.troot) {
                my.troot.getChildren().forEach(function(t, num) {
                    var child = new TModel(t.type, t.targets);
                    child.oidNum = num;
                    child.oid = num > 0 ? t.type + num : t.type;
                    troot.addChild(child);
                });
            }
            
            return troot;
        };
        

        my.troot = my.trootFactory();
        
        if (firstChild) {
            my.troot.addChild(firstChild);
        }
        
        window.history.pushState({ link: document.URL }, "", document.URL);                

        return my;
    };

    my.start = function () {
        my.runningFlag = false; 
        
        my.events.clearAll();
        my.troot.getChildren().forEach(function(child) {
            child.deleteTargetValue('addEventHandler');
        }); 

        my.events.removeWindowHandlers();
        my.events.addWindowHandlers();
                        
        my.dim.measureScreen();    
        my.resetRuns();

        my.runningFlag = true;
                        
        my.manager.scheduleRun(0, "appStart");

        return my;
    };
    
    my.stop = function()    { 
        my.runningFlag = false;

        my.events.removeWindowHandlers();
        my.troot.getChildren().forEach(function(child) {
            if (child.hasDom()) {
                my.events.removeHandlers(child.$dom);
            }
        });

        my.events.clearAll();
        
        my.resetRuns();
                
        return my;
    };
   
    my.resetRuns = function() {
        my.manager.nextRuns = [];
        my.manager.runningStep = 0;
        my.manager.runningFlag = false;
        my.manager.rerunFlag = false; 
    };
    
    my.reset = function() {
        my.manager.lists.visible.forEach(function(tmodel) { tmodel.domValues = {}; });
        my.manager.lists.visible.length = 0;
        my.manager.lists.invisibleDom.length = 0;
        my.manager.lists.deletedTModel.length = 0; 
        my.manager.lists.visibleNoDom.length = 0;
        my.manager.visibleTypeMap = {};
        my.manager.visibleOidMap = {};
        my.manager.targetMethodMap = {};
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

function App(tmodel) {
    tapp = AppFn(tmodel);    
    tapp.init().start();

    return tapp;
}

function isRunning() {
    return tapp ? tapp.runningFlag : false;
}

function troot() {
    return tapp ? tapp.troot : null;
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

function getManager() {
    return tapp ? tapp.manager : null;
}

function getScreenWidth() {
    return tapp ? tapp.dim.screen.width : 0;
}

function getScreenHeight() {
    return tapp ? tapp.dim.screen.height : 0;
}

window.t = window.t || SearchUtil.find;

App.oids = {};
App.getOid = function(type) { 
    if (!TUtil.isDefined(App.oids[type]))  {
        App.oids[type] = 0;
    }

    var num = App.oids[type]++;
    return { oid: num > 0 ? type + num : type, num: num };
};

export { tapp, App, troot, isRunning, getEvents, getPager, getLoader, getManager, $Dom, getScreenWidth, getScreenHeight };