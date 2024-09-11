import { Bracket } from "./Bracket.js";
import { TUtil } from "./TUtil.js";

/**
 * Generates a bottom-up tree from the children of a TModel. When the number of children
 * exceeds a defined threshold (bracketThreshold), a tree is generated to limit the process loop to only
 * the visible branches. A TModel can opt out of tree generation completely by defining a target
 * `shouldBeBracketed` and setting it to false.
 */
class BracketGenerator {

    static bracketMap = {};

    static generate(page) {
        let brackets = BracketGenerator.bracketMap[page.oid];

        if (!brackets || page.lastChildrenUpdate.deletions.length > 0) {
            BracketGenerator.bracketMap[page.oid] = {brackets: BracketGenerator.buildTreeBottomUp(page, page.getChildren()), updateCount: 0};
        } else if (page.lastChildrenUpdate.additions.length > 0) {
            BracketGenerator.updateTree(page, page.lastChildrenUpdate.additions);
        }

        page.lastChildrenUpdate.additions.length = 0;
        page.lastChildrenUpdate.deletions.length = 0;

        return BracketGenerator.bracketMap[page.oid].brackets;
    }

    static updateTree(page, additions = []) {
        const list = page.getChildren();

        const affectedIndices = new Set();
        const bracketSize = page.getBracketThreshold();


        additions.forEach(({ index, segment }) => {
            segment.forEach((_, i) => affectedIndices.add(index + i)); // eslint-disable-line no-unused-vars
        }); 

        const sortedIndices = Array.from(affectedIndices).sort((a, b) => a - b);

        let start = null;
        let end = null;
        
        sortedIndices.forEach(index => {
            const bracketStart = Math.floor(index / bracketSize) * bracketSize;
            const bracketEnd = Math.min(list.length, bracketStart + bracketSize);

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
        const updatedSegment = BracketGenerator.buildTreeBottomUp(page, list.slice(start, end));
        const bracketSize = page.getBracketThreshold();

        let currentLevel = topBrackets;
        let segmentParent = undefined;
        while (true) {
            let nextLevel = null;
            for (const bracket of currentLevel) {
                if (!(bracket.getFirstChild() instanceof Bracket)) {
                    break;
                }
                const startIndex = bracket.startIndex;
                const endIndex = Math.ceil(bracket.endIndex / bracketSize) * bracketSize;
                                
                if (startIndex <= start && endIndex >= end) {
                    nextLevel = bracket.getChildren();
                    segmentParent = bracket;
                    break;
                }
            }
            if (!nextLevel) {
                break;
            }
            currentLevel = nextLevel;
        }

        let mergeIndex = 0;
        while (mergeIndex < currentLevel.length && currentLevel[mergeIndex].endIndex <= start) {
            mergeIndex++;
        }

        let replaceCount = 0;
        while (mergeIndex + replaceCount < currentLevel.length && currentLevel[mergeIndex + replaceCount].startIndex <= end) {
            replaceCount++;
        }
                
        var indexOffset = currentLevel.length > mergeIndex ? currentLevel[mergeIndex].startIndex : currentLevel[currentLevel.length - 1].endIndex;

        currentLevel.splice(mergeIndex, replaceCount, ...updatedSegment);
        
        if (segmentParent) {
            for (const bracket of updatedSegment) {
                bracket.parent = segmentParent;
            }            
        }
         
        BracketGenerator.reindexSegment(updatedSegment, indexOffset);
        
        BracketGenerator.bracketMap[page.oid].updateCount++;

        if (currentLevel.length > bracketSize) {
            BracketGenerator.bracketMap[page.oid].brackets = BracketGenerator.buildTreeBottomUp(page, currentLevel);
        }
    }    

    static buildTreeBottomUp(page, list) {

        const length = list.length;
        const bracketSize = page.getBracketThreshold() - 1;

        const brackets = [];

        let from = 0;

        for (let i = 0; i < length; i++) {
            const size = i - from;

            if (size === bracketSize || i === length - 1) {
                brackets.push(BracketGenerator.createBracket(page, list, from, i + 1));
                from = i + 1;
            }
        }

        return brackets > bracketSize ? BracketGenerator.buildTreeBottomUp(page, brackets) : brackets;
    }

    static createBracket(page, list, startIndex, endIndex) {

        const bracket = new Bracket(page);

        bracket.allChildren = list.slice(startIndex, endIndex);
        bracket.startIndex = bracket.allChildren[0] instanceof Bracket ? bracket.allChildren[0].startIndex : startIndex;
        bracket.endIndex = bracket.allChildren[bracket.allChildren.length - 1] instanceof Bracket ? bracket.allChildren[bracket.allChildren.length - 1].endIndex : endIndex;

        bracket.allChildren.forEach(t => {
            if (t instanceof Bracket) {
                t.realParent = page;
                t.parent = bracket;
            }
        });

        bracket.realParent = page;

        return bracket;
    }

    static reindexSegment(segment, indexOffset) {
        
        let queue = segment.slice(0); // Start with the root node in the queue
        const last = queue[queue.length - 1];

        while (queue.length > 0) {
            let bracket = queue.shift(); // Dequeue the first node

            bracket.startIndex += indexOffset;
            bracket.endIndex += indexOffset;

            if (bracket instanceof Bracket) {
                bracket.getChildren().forEach(child => {
                    if (TUtil.isDefined(child.startIndex) && TUtil.isDefined(child.endIndex)) {
                        queue.push(child);
                    }
                });
            }
        }
                
        var parent = last.getParent();
        while (parent) {
            parent.endIndex = Math.max(parent.endIndex, last.endIndex);
            parent = parent.getParent();
        }
    }

}

export { BracketGenerator };
