import { TUtil } from "./TUtil.js";
import { tApp, getRunScheduler } from "./App.js";

/**
 * It enables opening new pages and managing history. It alo provide page caching.
 * It is used to provide a single page app experience.
 */
class PageManager {
    constructor() {
        this.lastLink = document.URL;
        this.pageCache = {};
    }

    openPage(link) {
        tApp.stop();
        tApp.reset();

        if (!this.pageCache[link]) {
            tApp.tRoot.getChildren().forEach(child => child.$dom.innerHTML(""));
            tApp.tRoot = tApp.tRootFactory();
            this.lastLink = link;
            setTimeout(tApp.start);
        } else {
            tApp.tRoot = this.pageCache[link].tRoot;
            tApp.tRoot.getChildren().forEach((child, index) => {
                child.$dom.innerHTML(this.pageCache[link].htmls[index]);
            });

            TUtil.initDoms(this.pageCache[link].visibleList);
            tApp.manager.lists.visible = [...this.pageCache[link].visibleList];
            this.lastLink = link;
            setTimeout(tApp.start);
        }
    }

    openLinkFromHistory(state) {
        if (state.link) {
            this.openPage(state.link);
        } else if (state.browserUrl) {
            history.replaceState({ link: state.browserUrl }, "", state.browserUrl);
            this.openPage(state.browserUrl);
        }

        getRunScheduler().schedule(0, "pagemanager-openLinkFromHistory");
    }

    openLink(link) {
        link = TUtil.getFullLink(link);

        if (this.lastLink) {
            this.pageCache[this.lastLink] = {
                link: this.lastLink,
                htmls: tApp.tRoot.getChildren().map(child => child.$dom.innerHTML()),
                visibleList: [...tApp.manager.lists.visible],
                tRoot: tApp.tRoot
            };
        }

        history.pushState({ link }, "", link);

        this.openPage(link);

        getRunScheduler().schedule(0, "pagemanager-processOpenLink");
    }

    updateBrowserUrl(link) {
        const currentState = window.history.state;

        if (!currentState.browserUrl) {
            this.pageCache[document.URL] = {
                link: document.URL,
                htmls: tApp.tRoot.getChildren().map(child => child.$dom.innerHTML()),
                visibleList: [...tApp.manager.lists.visible],
                tRoot: tApp.tRoot
            };
            history.pushState({ browserUrl: link }, "", link);
        } else {
            history.replaceState({ browserUrl: link }, "", link);
        }

        getRunScheduler().schedule(0, "pagemanager-processUpdateBrowserUrl");
    }

    back() {
        return history.back();
    }
}

export { PageManager };
