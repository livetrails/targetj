import { $Dom } from "./$Dom.js";
import { getScreenWidth, getScreenHeight } from "./App.js";
import { SearchUtil } from "./SearchUtil.js";
import { getLocationManager, tRoot } from "./App.js";

/**
 * 
 * It provide a variety of helping functions that are used by the framework.
 */
class TUtil {
    static getBoundingRect(tmodel) {
        let left, top, right, bottom, oid;
        
        if (tmodel.actualValues.domHolder && tmodel.actualValues.domHolder.exists()) {
            if (tmodel.getParent() === tRoot()) {
                left = tmodel.getX();
                top = tmodel.getY();
                right = left + tmodel.getWidth();
                bottom = top + tmodel.getHeight();
                oid = tmodel.oid;             
            } else {
                const rect = tmodel.actualValues.domHolder.getBoundingClientRect();
                left = rect.left;
                top = rect.top;
                right = rect.right;
                bottom = rect.bottom;
                oid = tmodel.actualValues.domHolder.attr('id');
            }
        } else {
            const parent = tmodel.getDomParent() ? tmodel.getDomParent() : SearchUtil.findParentByTarget(tmodel, 'domHolder');

            if (parent) {
                left = parent.absX;
                top = parent.absY;
                const width = parent.getWidth();
                const height = parent.getHeight();
                right = left + width;
                bottom = top + height;
                oid = parent.oid;
            } else {
                left = 0;
                top = 0;
                right = getScreenWidth();
                bottom = getScreenHeight();
                oid = 'screen';
            }
        }

        return { left, top, right, bottom, oid };
    }

    static initDoms(visibleList) {
        const elements = $Dom.findByClass('tgt');
        
        visibleList.forEach(tmodel => {
            tmodel.$dom = null;
        });

        const visibleMap = TUtil.list2map(visibleList.filter(item => item.type !== 'BI'));

        for (let element of elements) {
            const id = element.getAttribute("id");
            const tmodel = visibleMap[id];

            if (tmodel && !tmodel.hasDom()) {
                tmodel.$dom = new $Dom(`#${id}`);
            } else {
                $Dom.detach(element);
            }
        }
    }

    static list2map(list, defaultValue) {
        return list.reduce((map, item) => {
            map[item.oid] = TUtil.isDefined(defaultValue) ? defaultValue : item;
            return map;
        }, {});
    }

    static getDeepList(parent) {
        const deepList = [];

        function traverse(tmodel) {
            if (tmodel && tmodel.hasChildren()) {
                const list = tmodel.getChildren();
                deepList.push(...list);
                list.forEach(traverse);
            }
        }

        traverse(parent);
        return deepList;
    }

    static areEqual(a, b, deepEquality) {
        if (deepEquality) {
            return JSON.stringify(a) === JSON.stringify(b);
        } else {
            return a === b;
        }
    }

    static momentum(past, current, time = 1) {
        const distance = current - past;
        const speed = Math.abs(distance) / time;
        const duration = Math.floor(speed * 5000);
        const momentumDistance = 5 * duration;
        const adjustedDistance = distance > 0 ? distance + momentumDistance : distance - momentumDistance;

        return {
            distance: Math.round(adjustedDistance) / 50,
            duration,
            momentumDistance: time,
            time: time * 5
        };
    }

    static isDefined(obj) {
        return typeof obj !== "undefined" && obj !== null;
    }

    static isNumber(num) {
        return typeof num === 'number' && !isNaN(num);
    }

    static limit(num, low, high) {
        num = TUtil.isDefined(num) ? num : low;
        num = num > high ? high : num;
        num = num < low ? low : num;

        return num;
    }

    static formatNum(num, precision) {
        if (!num) {
            return 0;
        }
        const n = parseFloat(num.toString());
        return n.toFixed(precision);
    }
    
    static now() {
        return Date.now();
    }
    
    static log(condition) {
        return condition === true ? console.log : () => {};
    }

    static distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    static getFullLink(link) {
        if (!TUtil.isDefined(link)) {
            return;
        }

        if (link.startsWith('http')) {
            return link;
        } else {
            let protocol = window.location.protocol;
            protocol += protocol.endsWith(":") ? "//" : "://";
            const base = `${protocol}${window.location.hostname}`;
            return link.startsWith("/") ? base + link : `${base}/${link}`;
        }
    }
    
    static logTree(tmodel = tRoot(), tab = '') {
        const list = getLocationManager().getChildren(tmodel);
        for (const g of list) {
            const gtab = g.isVisible() ? tab + '|  ': tab + 'x  ';

            if (g.type === 'BI') {
                console.log(`${gtab}${g.oid} v:${g.isVisible()} x:${Math.floor(g.getX())} y:${Math.floor(g.getY())} w:${Math.floor(g.getWidth())} h:${Math.floor(g.getHeight())} ind:${g.startIndex}-${g.endIndex}`);
            } else {
                console.log(`${gtab}${g.oid} v:${g.isVisible()} x:${Math.floor(g.getX())} y:${Math.floor(g.getY())} w:${Math.floor(g.getWidth())} h:${Math.floor(g.getHeight())} hc:${Math.floor(g.getContentHeight())}`);
            }

            if (g.hasChildren()) {
                TUtil.logTree(g, gtab);
            }
        }
    }

}

export { TUtil };
