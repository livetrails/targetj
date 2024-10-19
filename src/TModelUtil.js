import { TUtil } from "./TUtil.js";
import { $Dom } from "./$Dom.js";

/**
 * It provides helper functions for TModel.
 */
class TModelUtil {
    
    static transformOrder = {
        perspective: 0,
        translateX: 1,
        translateY: 1,
        translateZ: 1,
        translate: 1,
        translate3d: 1,        
        rotate: 2,
        rotateX: 2,
        rotateY: 2,
        rotateZ: 2,
        rotate3d: 2,
        skew: 3,
        skewX: 3,
        skewY: 3,        
        scale: 4,
        scaleX: 4,
        scaleY: 4,
        scaleZ: 4,
        scale3DX: 4,
        scale3DY: 4,
        scale3DZ: 4
    };    
    
    static addItem(list, child, index) {
        let merged = false;
       
        for (let i = 0; i < list.length; i++) {
            let entry = list[i];
            let startIndex = entry.index;
            let endIndex = entry.index + entry.segment.length - 1;

            if (index === endIndex + 1) {
                entry.segment.push(child);
                merged = true;
            } else if (index >= startIndex && index <= endIndex) {
                entry.segment.splice(index - startIndex, 0, child);
                merged = true;
            } else if (index === startIndex - 1) {
                entry.segment.unshift(child);
                entry.index = index;
                merged = true;
            }
            
            if (merged) {
                let endIndex = entry.index + entry.segment.length - 1;
                
                if (i + 1 < list.length && endIndex === list[i + 1].index) {
                    let nextEntry = list[i + 1];
                    entry.segment = entry.segment.concat(nextEntry.segment);
                    list.splice(i + 1, 1);
                }
                break;                
            }
        }

        if (!merged) {
            list.push({ index, segment: [child] });
            list.sort((a, b) => a.index - b.index);
        }
    }
    
    static defaultActualValues() {
        return {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            leftMargin: 0,
            rightMargin: 0,
            topMargin: 0,
            bottomMargin: 0,
            opacity: 1,
            scale: 1,  
            scrollLeft: 0,
            scrollTop: 0,
            textOnly: true,
            borderRadius: 0,
            children: [],
            isInFlow: true,
            baseElement: 'div',
            canHaveDom: true,
            canHandleEvents: false,
            widthFromDom: false,
            heightFromDom: false,
            keepEventDefault: false,
            isIncluded: true,
            bracketThreshold: 5,
            isDomDeletable: true,
            calculateChildren: undefined,
            isVisible: undefined
        };
    }
    
    static defaultTargets() {
        return { 
            position: 'absolute', 
            left: 0, 
            top: 0,
            zIndex: 1,
            css: ''
        };
    }
    
    static createDom(tmodel) {
        tmodel.$dom = new $Dom();
        tmodel.$dom.create(tmodel.getBaseElement());
        tmodel.$dom.setSelector(`#${tmodel.oid}`);
        tmodel.$dom.setId(tmodel.oid);
        tmodel.transformMap = {};
        tmodel.styleMap = {};
        tmodel.allStyleTargetList.forEach(function(key) {
            if (TUtil.isDefined(tmodel.val(key))) {
                tmodel.addToStyleTargetList(key);
            }
        });                 
    }
    
    static getTransformString(tmodel) {
        const processed = {};
       
        const transformMap = {};
        
        if (tmodel.transformMap['translateX'] || tmodel.transformMap['translateY'] || tmodel.transformMap['translateZ']) {
            delete tmodel.transformMap['x'];
            delete tmodel.transformMap['y'];            
        }
        
        let keys = Object.keys(tmodel.transformMap);
  
        for (const key of keys) {
            if (processed[key]) {
                continue;
            } 
                                                
            switch(key) {
                case 'translateX':
                case 'translateY':
                case 'translateZ':  
                    transformMap[key] = `${key}(${tmodel.transformMap[key]}px)`;                   
                    processed[key] = true;                       
                break;
                
                case 'x':
                case 'y':
                case 'z':
                    if (TUtil.isDefined(tmodel.getZ())) {
                       transformMap['translate3d'] = `translate3d(${tmodel.transformMap.x}px, ${tmodel.transformMap.y}px, ${tmodel.transformMap.z}px)`;
                    } else if (TUtil.isDefined(tmodel.getX()) || TUtil.isDefined(tmodel.getY())) {
                       transformMap['translate'] = `translate(${tmodel.transformMap.x}px, ${tmodel.transformMap.y}px)`;
                    }
                                        
                    processed['x'] = true;
                    processed['y'] = true;
                    processed['z'] = true;                    
                    break
                    
                case 'rotate':
                case 'rotateX':
                case 'rotateY':
                case 'rotateZ':
                case 'rotate3DX':
                case 'rotate3DY':
                case 'rotate3DZ':
                case 'rotate3DAngle':               
                    if (TUtil.isDefined(tmodel.val('rotate3DX')) && TUtil.isDefined(tmodel.val('rotate3DY'))
                            && TUtil.isDefined(tmodel.val('rotate3DZ')) && TUtil.isDefined(tmodel.val('rotate3DAngle'))) {

                        transformMap['rotate3d'] = `rotate3d(${tmodel.transformMap.rotate3DX}, ${tmodel.transformMap.rotate3DY}, ${tmodel.transformMap.rotate3DZ}, ${tmodel.transformMap.rotate3DAngle}deg)`;

                        processed['rotate3DX'] = true;
                        processed['rotate3DY'] = true;
                        processed['rotate3DZ'] = true;
                        processed['rotate3DAngle'] = true;                        
                    } else if (TUtil.isDefined(tmodel.val(key))) {
                        transformMap[key] = `${key}(${tmodel.transformMap[key]}deg)`;                   
                        processed[key] = true;                       
                    }
                   
                    break;
                   
                case 'scale':
                case 'scaleX':
                case 'scaleY':
                case 'scaleZ':
                case 'scale3DX':
                case 'scale3DY':
                case 'scale3DZ':
                    if (TUtil.isDefined(tmodel.val('scale3DX')) && TUtil.isDefined(tmodel.val('scale3DY')) && TUtil.isDefined(tmodel.val('scale3DZ'))) {  

                        transformMap['scale3d'] = `scale3d(${tmodel.transformMap.scale3DX}, ${tmodel.transformMap.scale3DY}, ${tmodel.transformMap.scale3DZ})`;
 
                        processed['scale3DX'] = true;
                        processed['scale3DY'] = true;
                        processed['scale3DZ'] = true;
                    } else if (TUtil.isDefined(tmodel.val(key))) {
                        transformMap[key] = `${key}(${tmodel.transformMap[key]})`;
                        
                        processed[key] = true;  
                    }                 
                    break;   
                
                case 'skewX':
                case 'skewY':
                    if (TUtil.isDefined(tmodel.val('skewX')) && TUtil.isDefined(tmodel.val('skewY'))) {

                        transformMap[key] = `skew(${tmodel.transformMap.skewX}deg, ${tmodel.transformMap.skewY}deg)`;
                        
                        processed['skewX'] = true;
                        processed['skewY'] = true;
                        
                    } else if (TUtil.isDefined(tmodel.val(key))) {
                        
                        transformMap[key] = `${key}(${tmodel.transformMap[key]}deg)`;
                          
                        processed[key] = true;                        
                    }
                   
                    break;  
                
                case 'perspective':
                    if (TUtil.isDefined(tmodel.val('perspective'))) {
                        
                        transformMap[key] = `perspective(${tmodel.transformMap.perspective}px)`;
                        
                        processed['perspective'] = true;
                    }
                    break;                
            }
        }
        
        let transformOrder = {};
        
        if (tmodel.val('transformOrder')) {
            tmodel.val('transformOrder').forEach((name, index) => {
                transformOrder[name] = index;
            });
        } else {
            transformOrder = TModelUtil.transformOrder;
        }
 
        const sortedKeys = Object.keys(transformMap).sort((a, b) => {
            return transformOrder[a] - transformOrder[b];
        });

        const sortedTransforms = sortedKeys.map(key => transformMap[key]);

        return sortedTransforms.join(' ');        
    };
}

export { TModelUtil };

