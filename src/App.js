var tapp;

function App(uiFn, rootId) {
    
    function my() {} 
    
    my.throttle = 0;
    my.debugLevel = 0;

    my.runningFlag = false;

    my.oids = {};    
    
    my.rootId = rootId ? rootId || uiFn.rootId : "#tpage";

    my.init = function(uiFn) {
        browser.setup();
        
        my.window = new $Dom(window);
        my.window.addEvent("popstate", function(event) {
            if (event.state) {
                tapp.pagers.openLinkFromHistory(event.state);
            }
        });
        
        my.uiFn = uiFn;
        this.ui = uiFn();
        this.ui.xVisible = true;
        this.ui.yVisible = true;
        
        my.loader = new LoadingManager();
        
        my.pagers = new PageManager();
                 
        my.dim = Dim().measureScreen();
        
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
   
    my.getOid = function(type) { 
        if (!TUtil.isDefined(my.oids[type]))  {
            my.oids[type] = 0;
        }
        
        var num = my.oids[type]++;
        return { oid: num > 0 ? type + num : type, num: num };
    };
    
    my.brackets = function(oid) {
        return tapp.locationManager.bracketMap[oid] ? tapp.locationManager.bracketMap[oid].list : null;
    };
    
    tapp = my;
    my.init(uiFn).start();

    return my;
}

$Dom.ready(function() {
    window._ = window._ || SearchUtil.find;

    if (typeof window.MainT === 'function') {
        App(MainT);
    }
});
