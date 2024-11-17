import { $Dom } from "./$Dom.js";
import { getLocationManager, tRoot } from "./App.js";

/**
 * 
 * It provide a variety of helping functions that are used by the framework.
 */
class TUtil {
    static calcVisibility(child) {
        const x = child.absX;
        const y = child.absY;

        const parent = child.getDomParent();

        const scale = (parent.getMeasuringScale() || 1) * child.getMeasuringScale();
        const maxWidth = TUtil.isDefined(child.getWidth()) ? scale * child.getWidth() : 0;
        const maxHeight = TUtil.isDefined(child.getHeight()) ? scale * child.getHeight() : 0;

        const status = child.visibilityStatus;
   
        status.right = Math.floor(x) <= parent.absX + parent.getWidth();
        status.left = Math.ceil(x + maxWidth) >= parent.absX;
        status.bottom = Math.floor(y) <= parent.absY + parent.getHeight();
        status.top = Math.ceil(y + maxHeight) >= parent.absY;
        
        child.actualValues.isVisible = status.left && status.right && status.top && status.bottom;

        return child.actualValues.isVisible;
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

            if (tmodel) {                
                tmodel.$dom = new $Dom(`#${id}`);
            } else {
                $Dom.detach(element);
            }
        }
    }
    
    static contains(container, tmodel) {
        if (!container || !tmodel) {
            return false;
        }
        
        if (container === tmodel 
                || tmodel.getDomParent() === container
                || tmodel.getDomParent()?.getDomParent() === container) {
            return true;
        }

        return false;
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
    
    static capitalizeFirstLetter(val) {
        return val.charAt(0).toUpperCase() + val.slice(1);
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
                console.log(`${gtab}${g.oid} v:${g.isVisible()} x:${Math.floor(g.getX())} y:${Math.floor(g.getY())}, y:${Math.floor(g.absY)} w:${Math.floor(g.getWidth())} h:${Math.floor(g.getHeight())} hc:${Math.floor(g.getContentHeight())}`);
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
