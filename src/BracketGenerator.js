import { tApp } from "./App.js";
import { Bracket } from "./Bracket.js";

class BracketGenerator {
    static bracketMap = {};
    static bracketAllMap = {};
    
    static generate(page, listOfTModel) {
        let brackets = BracketGenerator.bracketMap[page.oid];
        const maxLastUpdate = Math.max(page.getActualValueLastUpdate('allChildren'), page.getActualValueLastUpdate('width'), page.getActualValueLastUpdate('height'));

        if (brackets && brackets.lastUpdate >= maxLastUpdate) {
            brackets = BracketGenerator.bracketMap[page.oid];
        } else {
            brackets = {
                lastUpdate: maxLastUpdate,
                list: []
            };

            listOfTModel = page.type !== 'BI' && !listOfTModel ? page.getChildren() : listOfTModel;
            const length = listOfTModel.length;

            const bracketSize = Math.max(2, tApp.locationManager.bracketThreshold - 1);
            let needsMoreBracketing = false;
            let consecutiveBrackets = 0;
            let from = 0;

            for (let i = 0; i < length; i++) {
                const index = i - from;

                if ((listOfTModel[i].canBeBracketed() && (index === bracketSize || i === length - 1))
                    || (!listOfTModel[i].canBeBracketed() && index > 0)) {
                    const to = !listOfTModel[i].canBeBracketed() ? i : i + 1;
                    brackets.list.push(BracketGenerator.createBracket(page, listOfTModel, from, to));
                    from = i + 1;
                    consecutiveBrackets++;
                }

                if (consecutiveBrackets > bracketSize) {
                    needsMoreBracketing = true;
                }

                if (!listOfTModel[i].canBeBracketed()) {
                    consecutiveBrackets = 0;
                    brackets.list.push(listOfTModel[i]);
                    from = i + 1;
                }
            }

            if (needsMoreBracketing) {
                brackets = BracketGenerator.generate(page, brackets.list);
            } else {
                BracketGenerator.bracketMap[page.oid] = brackets;
            }
        }

        return brackets;
    }
    
    static createBracket(page, listOfTModel, from, to) {
        const bracketId = `${page.oid}_${page.getWidth()}_${page.getHeight()}_${listOfTModel.slice(from, to).oids('_')}`;
        let bracket;

        if (BracketGenerator.bracketAllMap[bracketId]) {
            bracket = BracketGenerator.bracketAllMap[bracketId];
        } else {
            bracket = new Bracket(page);

            BracketGenerator.bracketAllMap[bracketId] = bracket;

            bracket.actualValues.children = listOfTModel.slice(from, to);

            if (bracket.actualValues.children[0].type === 'BI') {
                bracket.actualValues.children.forEach(b => {
                    b.bracketParent = bracket;
                });
            }

            bracket.bracketParent = page;
        }

        return bracket;
    }

}

export { BracketGenerator };
