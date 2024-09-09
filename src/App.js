import { $Dom } from "./$Dom.js";
import { TModel } from "./TModel.js";
import { Browser } from "./Browser.js";
import { EventListener } from "./EventListener.js";
import { LoadingManager } from "./LoadingManager.js";
import { LocationManager } from "./LocationManager.js";
import { PageManager } from "./PageManager.js";
import { SearchUtil } from "./SearchUtil.js";
import { TModelManager } from "./TModelManager.js";
import { RunScheduler } from "./RunScheduler.js";
import { TUtil } from "./TUtil.js";
import { TargetManager } from "./TargetManager.js";

let tApp;

const AppFn = (firstChild) => {
    const my = {};

    my.throttle = 0;
    my.debugLevel = 0;
    my.runningFlag = false;

    my.init = function() {
        my.browser = new Browser();
        my.browser.setup();
        my.browser.measureScreen();
        
        my.$window = new $Dom(window);
        my.$window.addEvent("popstate", function(event) {
            if (event.state) {
                tApp.pager.openLinkFromHistory(event.state);
            }
        });

        my.loader = new LoadingManager();
        my.pager = new PageManager();
        my.events = new EventListener();
        my.locationManager = new LocationManager();
        my.targetManager = new TargetManager();
        my.manager = new TModelManager();
        my.runScheduler = new RunScheduler();


        my.tRootFactory = () => {
            const tRoot = new TModel('tRoot');

            tRoot.addChild = (child, index) => {
                if (!TUtil.isDefined(child.targets['domHolder'])) {
                    child.addTarget('domHolder', {
                        value: function() {
                            let $dom;
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

                TModel.prototype.addChild.call(tRoot, child, index);
            };

            if (my.tRoot) {
                my.tRoot.getChildren().forEach((t, num) => {
                    const child = new TModel(t.type, t.targets);
                    child.oidNum = num;
                    child.oid = num > 0 ? `${t.type}${num}` : t.type;
                    tRoot.addChild(child);
                });
            }

            return tRoot;
        };

        my.tRoot = my.tRootFactory();

        if (firstChild) {
            my.tRoot.addChild(firstChild);
        }

        window.history.pushState({ link: document.URL }, "", document.URL);

        return my;
    };

    my.start = function() {
        my.runningFlag = false;

        my.events.clearAll();
        my.tRoot.getChildren().forEach(child => {
            child.deleteTargetValue('addEventHandler');
        });

        my.events.removeWindowHandlers();
        my.events.addWindowHandlers();

        my.browser.measureScreen();
        my.runScheduler.resetRuns();

        my.runningFlag = true;
        my.runScheduler.schedule(0, "appStart");

        return my;
    };

    my.stop = function() {
        my.runningFlag = false;

        my.events.removeWindowHandlers();
        my.tRoot.getChildren().forEach(child => {
            if (child.hasDom()) {
                my.events.removeHandlers(child.$dom);
            }
        });

        my.events.clearAll();
        my.runScheduler.resetRuns();

        return my;
    };

    my.reset = function() {
        my.manager.lists.visible.forEach(tmodel => tmodel.domValues = {});
        my.manager.clear();
        my.locationManager.hasLocationList.length = 0;
        my.locationManager.screenWidth = 0;
        my.locationManager.screenHeight = 0;
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
};

const App = (tmodel) => {
    tApp = AppFn(tmodel);
    tApp.init().start();
};

App.oids = {};
App.getOid = function(type) {
    if (!TUtil.isDefined(App.oids[type])) {
        App.oids[type] = 0;
    }

    const num = App.oids[type]++;
    return { oid: num > 0 ? `${type}${num}` : type, num };
};

const isRunning = () => tApp ? tApp.runningFlag : false;
const tRoot = () => tApp ? tApp.tRoot : null;
const getEvents = () => tApp ? tApp.events : null;
const getPager = () => tApp ? tApp.pager : null;
const getLoader = () => tApp ? tApp.loader : null;
const getManager = () => tApp ? tApp.manager : null;
const getRunScheduler = () => tApp ? tApp.runScheduler : null;
const getLocationManager = () => tApp ? tApp.locationManager : null;
const getBrowser = () => tApp ? tApp.browser : null;
const getScreenWidth = () => tApp ? tApp.browser.screen.width : 0;
const getScreenHeight = () => tApp ? tApp.browser.screen.height : 0;

window.t = window.t || SearchUtil.find;

export {
    tApp,
    App,
    tRoot,
    isRunning,
    getEvents,
    getPager,
    getLoader,
    getManager,
    getRunScheduler,
    getLocationManager,
    getBrowser,
    getScreenWidth,
    getScreenHeight
};
