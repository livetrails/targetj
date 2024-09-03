import { tApp } from "./App.js";
import { Bracket } from "./Bracket.js";

class BracketGenerator {
    
    static bracketMap = {};
    
    static generate(page) {
        let brackets = BracketGenerator.bracketMap[page.oid];

        if (!brackets || brackets.updateCount > 5) {
            BracketGenerator.bracketMap[page.oid] = { brackets: BracketGenerator.buildTreeBottomUp(page, page.getChildren()), updateCount: 0 };
        } else if (page.lastChildrenUpdate.additions.length > 0 || page.lastChildrenUpdate.deletions.length > 0) {
            BracketGenerator.updateTree(page, page.lastChildrenUpdate.additions, page.lastChildrenUpdate.deletions);
        }
        
        page.lastChildrenUpdate.additions.length = 0;
        page.lastChildrenUpdate.deletions.length = 0;
   
        return BracketGenerator.bracketMap[page.oid].brackets;
    }
    
    static updateTree(page, additions = [], deletions = []) {        
        const list = page.getChildren();
        
        const affectedIndices = new Set();
        const bracketSize = BracketGenerator.getBracketSize();

        deletions.forEach(item => { // eslint-disable-line no-unused-vars
            const index = list.indexOf(item);
            affectedIndices.add(index);
        });
        
        if (affectedIndices.length) {
            console.log('deleting: ' + affectedIndices);
        }
        
        additions.forEach(({ index, segment }) => {
            segment.forEach((_, i) => affectedIndices.add(index + i)); // eslint-disable-line no-unused-vars
        });

        const sortedIndices = Array.from(affectedIndices).sort((a, b) => a - b);

        let start = null;
        let end = null;

        sortedIndices.forEach(index => {
            const bracketStart = Math.floor(index / bracketSize) * bracketSize;
            const bracketEnd = Math.min(list.length - 1, bracketStart + bracketSize - 1);

            if (start === null) {
                start = bracketStart;
                end = bracketEnd;
            } else if (bracketStart <= end + 1) {
                end = Math.max(end, bracketEnd);
            } else {
                BracketGenerator.updateSegmentInTree(page, list, start, end);
                start = bracketStart;
                end = bracketEnd;
            }
        });

        if (start !== null && end !== null) {            
            BracketGenerator.updateSegmentInTree(page, list, start, end);
        }
    }
    
    static updateSegmentInTree(page, list, start, end) {
        const topBrackets = BracketGenerator.bracketMap[page.oid].brackets;
        const updatedSegment = BracketGenerator.buildTreeBottomUp(page, list.slice(start, end + 1), start);
        const bracketSize = BracketGenerator.getBracketSize();

        let currentLevel = topBrackets;
        while (true) {
             let nextLevel = null;
             for (const bracket of currentLevel) {
                 if (bracket.startIndex <= start && bracket.endIndex >= end) {
                     nextLevel = bracket.getChildren() || [];
                     break;
                 }
             }
             if (!nextLevel) {
                 break;
             }
             currentLevel = nextLevel;
         }        

        let mergeIndex = 0;
        while (mergeIndex < currentLevel.length && currentLevel[mergeIndex].endIndex < start) {
            mergeIndex++;
        }

        let replaceCount = 0;
        while (mergeIndex + replaceCount < currentLevel.length && currentLevel[mergeIndex + replaceCount].startIndex <= end) {
            replaceCount++;
        }

        currentLevel.splice(mergeIndex, replaceCount, ...updatedSegment);
        
        
        BracketGenerator.bracketMap[page.oid].updateCount++;

        if (currentLevel.length > bracketSize) {
            BracketGenerator.bracketMap[page.oid].brackets = BracketGenerator.buildTreeBottomUp(page, currentLevel); 
        }
        
        
    }    
    
    static buildTreeBottomUp(page, list) {
        
        const brackets = [];
        const length = list.length;
        const bracketSize = BracketGenerator.getBracketSize();
        
        let insertAnotherLevel = false;
        let consecutiveBrackets = 0;
        let from = 0;

        for (let i = 0; i < length; i++) {
            const canBeBracketed = list[i].canBeBracketed();            
            const size = i - from;

            if ((canBeBracketed && (size === bracketSize || i === length - 1)) || (!canBeBracketed && size > 0)) {
                const to = canBeBracketed ? i + 1 : i;
                brackets.push(BracketGenerator.createBracket(page, list, from, to));
                from = i + 1;
                consecutiveBrackets++;
            }

            if (consecutiveBrackets > bracketSize) {
                insertAnotherLevel = true;
            }

            if (!canBeBracketed) {
                consecutiveBrackets = 0;
                brackets.list.push(list[i]);
                from = i + 1;
            }
        }

        if (insertAnotherLevel) {
            return BracketGenerator.buildTreeBottomUp(page, brackets);
        } else {
            return brackets;
        }
    }
    
    static createBracket(page, list, startIndex, endIndex) {

        const bracket = new Bracket(page);

        bracket.allChildren = list.slice(startIndex, endIndex);
        bracket.startIndex = bracket.allChildren[0] instanceof Bracket ? bracket.allChildren[0].startIndex : startIndex;
        bracket.endIndex = bracket.allChildren[bracket.allChildren.length - 1] instanceof Bracket ? bracket.allChildren[0].endIndex : endIndex;
        
        bracket.allChildren.forEach(t => {
            if (t instanceof Bracket) {
                t.realParent = page;
                t.parent = bracket;
            }
        });
        
        bracket.realParent = page;

        return bracket;
    }
    
    
    static getBracketSize() {
        return Math.max(2, tApp.locationManager.bracketThreshold - 1);
    }
}

export { BracketGenerator };
