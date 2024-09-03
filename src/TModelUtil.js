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
}

export { TModelUtil };

