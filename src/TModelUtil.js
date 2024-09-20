import { TUtil } from "./TUtil.js";

/**
 * It provides helper functions for TModel.
 */
class TModelUtil {
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
    
    static initializeActualValues() {
        return {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            leftMargin: 0,
            rightMargin: 0,
            topMargin: 0,
            bottomMargin: 0,
            innerWidth: undefined,
            innerHeight: undefined,
            opacity: 1,
            perspective: undefined,  
            rotate: undefined,            
            scale: 1,  
            zIndex: 1,            
            scrollLeft: 0,
            scrollTop: 0,
            textOnly: true,
            html: undefined,
            css: '',
            style: null,
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
    
    static getTransformString(tmodel) {
        const processed = {};
        
        const transformStrings = [];
        
        var keys = Object.keys(tmodel.transformMap);

        for (const key of keys) {
            if (processed[key]) {
                continue;
            } 
                                                
            switch(key) {
                case 'x':
                case 'y':
                case 'z':
                    if (TUtil.isDefined(tmodel.getZ())) {
                        transformStrings.push(`translate3d(${tmodel.transformMap.x}px, ${tmodel.transformMap.y}px, ${tmodel.transformMap.z}px)`);

                    } else if (TUtil.isDefined(tmodel.getX()) || TUtil.isDefined(tmodel.getY())) {
                        transformStrings.push(`translate(${tmodel.transformMap.x}px, ${tmodel.transformMap.y}px)`);
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

                        transformStrings.push(`rotate3d(${tmodel.transformMap.rotate3DX}, ${tmodel.transformMap.rotate3DY}, ${tmodel.transformMap.rotate3DZ}, ${tmodel.transformMap.rotate3DAngle}deg)`);

                        processed['rotate3DX'] = true;
                        processed['rotate3DY'] = true;
                        processed['rotate3DZ'] = true;
                        processed['rotate3DAngle'] = true;                        
                    } else if (TUtil.isDefined(tmodel.val(key))) {
                        transformStrings.push(`${key}(${tmodel.transformMap[key]}deg)`);
                                                
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

                        transformStrings.push(`scale3d(${tmodel.transformMap.scale3DX}, ${tmodel.transformMap.scale3DY}, ${tmodel.transformMap.scale3DZ})`);
 
                        processed['scale3DX'] = true;
                        processed['scale3DY'] = true;
                        processed['scale3DZ'] = true;
                    } else if (TUtil.isDefined(tmodel.val(key))) {
                        transformStrings.push(`${key}(${tmodel.transformMap[key]})`);
                        
                        processed[key] = true;  
                    }                 
                    break;   
                
                case 'skewX':
                case 'skewY':
                    if (TUtil.isDefined(tmodel.val('skewX')) && TUtil.isDefined(tmodel.val('skewY'))) {

                        transformStrings.push(`skew(${tmodel.transformMap.skewX}deg, ${tmodel.transformMap.skewY}deg)`);
                        
                        processed['skewX'] = true;
                        processed['skewY'] = true;
                        
                    } else if (TUtil.isDefined(tmodel.val(key))) {
                        
                        transformStrings.push(`${key}(${tmodel.transformMap[key]}deg)`);
                          
                        processed[key] = true;                        
                    }
                   
                    break;  
                
                case 'perspective':
                    if (TUtil.isDefined(tmodel.val('perspective'))) {
                        
                        transformStrings.push(`perspective(${tmodel.transformMap.perspective}px)`);
                        
                        processed['perspective'] = true;
                    }
                    break;                
            }
        }

        return transformStrings.join(' ');
    };
}

export { TModelUtil };

