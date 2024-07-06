import { $Dom } from "./$Dom.js";
import { TUtil } from "./TUtil.js";
import { tapp } from "./App.js";

function PageManager() {
    this.lastLink = document.URL;
    this.pageCache = {};
}
  
PageManager.prototype.openPage = function(link) {
    
    tapp.stop();
    tapp.reset();
       
    var self = this;

    if (!this.pageCache[link]) {
        tapp.tjRoot.getChildren().forEach(function(child) { child.$dom.innerHTML(""); });
        tapp.tjRoot = tapp.tjRootFactory();
        self.lastLink = link;        
        setTimeout(tapp.start);  
    } else {
        tapp.tjRoot = this.pageCache[link].tjRoot;
        tapp.tjRoot.getChildren().forEach(function(child, index) {
            child.$dom.innerHTML(self.pageCache[link].htmls[index]); 
        });        
        
        TUtil.initDoms(this.pageCache[link].visibleList);
        tapp.manager.lists.visible = this.pageCache[link].visibleList.slice(0);
        self.lastLink = link;
        setTimeout(tapp.start);  
    }
};

PageManager.prototype.openLinkFromHistory = function(state) {    
    if (state.link) {
        this.openPage(state.link);
    } else if (state.browserUrl) {  
        history.replaceState({ link: state.browserUrl }, "", state.browserUrl);                
        this.openPage(state.browserUrl);
    }

    tapp.manager.scheduleRun(0, "pagemanager-openLinkFromHistory");
};

PageManager.prototype.openLink = function(link) {    
    
    link = TUtil.getFullLink(link);
        
    if (this.lastLink) {
        this.pageCache[this.lastLink] = { 
            link: this.lastLink, 
            htmls: tapp.tjRoot.getChildren().map(function(child) { return child.$dom.innerHTML(); }), 
            visibleList: tapp.manager.lists.visible.slice(0),
            tjRoot: tapp.tjRoot 
        };
    }
    
    history.pushState({ link: link }, "", link); 
    
    this.openPage(link); 
    
    tapp.manager.scheduleRun(0, "pagemanager-processOpenLink");
};

PageManager.prototype.updateBrowserUrl = function(link) {    
    var currentState = window.history.state;
    
    if (!currentState.browserUrl) {
        this.pageCache[document.URL] = { 
            link: document.URL, 
            htmls: tapp.tjRoot.getChildren().map(function(child) { return child.$dom.innerHTML(); }), 
            visibleList: tapp.manager.lists.visible.slice(0),
            tjRoot: tapp.tjRoot 
        };
        history.pushState({ browserUrl: link }, "", link);
    } else {
        history.replaceState({ browserUrl: link }, "", link);                
    }
    
    tapp.manager.scheduleRun(0, "pagemanager-processUpdateBrowserUrl");
};

PageManager.prototype.back = function()    {
    return history.back();
};

export { PageManager };
