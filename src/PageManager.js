import { $Dom } from "./$Dom.js";
import { TUtil } from "./TUtil.js";
import { tapp } from "./App.js";

function PageManager() {
    this.lastLink = document.URL;
    this.pageCache = {};
}
  
PageManager.prototype.openPage = function(link, isPageFetchNeeded) {

    isPageFetchNeeded = TUtil.isDefined(isPageFetchNeeded) ? isPageFetchNeeded : true;
    
    tapp.stop();
    tapp.reset();
       
    var self = this;

    if (typeof tapp.updateAnalytics === 'function') {
        tapp.updateAnalytics(link);
    }

    if (!this.pageCache[link] && isPageFetchNeeded) {

        $Dom.ajax({
            url:link,
            type: 'GET',
            data: { tpageOnly: true }, 
            success: function (data) {
                tapp.$dom.outerHTML(data);                                
                tapp.ui = tapp.uiFactory();               
                self.lastLink = link;
                tapp.start();
            },
            error: function () {
                self.lastLink = undefined;
                history.back();
            }
        });

    } else if (!this.pageCache[link]) {
        tapp.$dom.innerHTML("");                                
        tapp.ui = tapp.uiFactory();
        self.lastLink = link;        
        setTimeout(tapp.start);  
    } else {

        tapp.$dom.innerHTML(this.pageCache[link].html);
        tapp.ui = this.pageCache[link].ui;
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

PageManager.prototype.openLink = function(link, isPageFetchNeeded) {    
    
    link = TUtil.getFullLink(link);
        
    if (this.lastLink) {
        this.pageCache[this.lastLink] = { 
            link: this.lastLink, 
            html: tapp.$dom.innerHTML(), 
            visibleList: tapp.manager.lists.visible.slice(0),
            ui: tapp.ui 
        };
    }
    
    history.pushState({ link: link }, "", link); 
    
    this.openPage(link, isPageFetchNeeded); 
    
    tapp.manager.scheduleRun(0, "pagemanager-processOpenLink");
};

PageManager.prototype.updateBrowserUrl = function(link) {    
    var currentState = window.history.state;
    
    if (!currentState.browserUrl) {
        this.pageCache[document.URL] = { 
            link: document.URL, 
            html: tapp.$dom.innerHTML(), 
            visibleList: tapp.manager.lists.visible.slice(0),
            ui: tapp.ui 
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
