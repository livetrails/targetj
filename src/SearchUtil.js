import { TUtil } from "./TUtil.js";
import { tApp } from "./App.js";

class SearchUtil {
    static foundParentWithType = {};
    static foundParentWithTarget = {};
    static foundTypeMap = {};
    static foundTargetMap = {};
    static foundOids = {};

    static findFirstPinchHandler(tmodel) {
        return SearchUtil.findEventHandler(tmodel, 'pinch');
    }

    static findFirstScrollTopHandler(tmodel) {
        return SearchUtil.findEventHandler(tmodel, 'scrollTop');
    }

    static findFirstScrollLeftHandler(tmodel) {
        return SearchUtil.findEventHandler(tmodel, 'scrollLeft');
    }

    static findFirstTouchHandler(tmodel) {
        return SearchUtil.findEventHandler(tmodel, 'touch');
    }

    static findEventHandler(tmodel, eventName) {
        while (tmodel) {
            if (tmodel.canHandleEvents(eventName)) {
                return tmodel;
            }
            tmodel = tmodel.getParent();
        }
    }

    static findParentByType(child, type) {
        const indexKey = `${child.oid}__${type}`;

        if (!TUtil.isDefined(SearchUtil.foundParentWithType[indexKey])) {
            let parent = child.getParent();
            while (parent) {
                if (parent.type === type) {
                    SearchUtil.foundParentWithType[indexKey] = parent;
                    break;
                }
                parent = parent.getParent();
            }
        }

        return SearchUtil.foundParentWithType[indexKey];
    }

    static findParentByTarget(child, targetName) {
        const indexKey = `${child.oid}__${targetName}`;

        if (!TUtil.isDefined(SearchUtil.foundParentWithTarget[indexKey])) {
            let parent = child.getParent();
            while (parent) {
                if (TUtil.isDefined(parent.targets[targetName]) || TUtil.isDefined(parent.targetValues[targetName])) {
                    SearchUtil.foundParentWithTarget[indexKey] = parent;
                    break;
                }
                parent = parent.getParent();
            }
        }

        return SearchUtil.foundParentWithTarget[indexKey];
    }

    static findByType(type) {
        if (!TUtil.isDefined(SearchUtil.foundTypeMap[type])) {
            const search = (container) => {
                if (container.type === type) {
                    return container;
                }

                for (const child of container.getChildren()) {
                    if (child && child.hasChildren()) {
                        const found = search(child);
                        if (found) {
                            return found;
                        }
                    } else if (child && child.type === type) {
                        return child;
                    }
                }
            };

            const tmodel = search(tApp.tRoot);
            if (tmodel) {
                SearchUtil.foundTypeMap[type] = tmodel;
            }
        }

        return SearchUtil.foundTypeMap[type];
    }

    static findByTarget(target) {
        if (!TUtil.isDefined(SearchUtil.foundTargetMap[target])) {
            const search = (container) => {
                if (container.targets[target]) {
                    return container;
                }

                for (const child of container.getChildren()) {
                    if (child && child.hasChildren()) {
                        const found = search(child);
                        if (found) {
                            return found;
                        }
                    } else if (child && child.targets[target]) {
                        return child;
                    }
                }
            };

            const tmodel = search(tApp.tRoot);
            if (tmodel) {
                SearchUtil.foundTargetMap[target] = tmodel;
            }
        }

        return SearchUtil.foundTargetMap[target];
    }

    static find(oid) {
        if (!TUtil.isDefined(SearchUtil.foundOids[oid])) {
            const search = (container) => {
                if (container.oid === oid) {
                    return container;
                }

                for (const child of container.getChildren()) {
                    if (child && child.hasChildren()) {
                        const found = search(child);
                        if (found) {
                            return found;
                        }
                    } else if (child && child.oid === oid) {
                        return child;
                    }
                }
            };

            const tmodel = search(tApp.tRoot);
            if (tmodel) {
                SearchUtil.foundOids[oid] = tmodel;
            }
        }

        return SearchUtil.foundOids[oid];
    }
}

export { SearchUtil };
