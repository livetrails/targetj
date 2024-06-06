import { TModel } from "./TModel.js";
import { TUtil } from "./TUtil.js";
import { tapp } from "./App.js";
import { browser } from "./Browser.js";

function Bracket(parent) {

    var tm = new TModel("BI");
    tm.parent = parent;
    tm.newFlag = true;
    
    tm.targets = {
        canHaveDom: false,
        innerXEast: {
            loop: true,
            value: function() {
                return TUtil.isDefined(tm.getRealParent().getValue('innerXEast')) ? tm.getRealParent().getValue('innerXEast') : tm.getRealParent().absX + tm.getRealParent().getWidth();
            }
        },
        xOverflow: {
            loop: true,
            value: function() { 
                return this.getRealParent().getX();
            }
        },
        outerXEast: 0
    };

    tm.getWidth = function()    {
        return this.getContentWidth();
    };
    
    tm.getHeight = function()   {
        return this.getContentHeight();
    };
    
    tm.getInnerWidth = function() {
        return this.innerContentWidth;
    };
    
    tm.getInnerContentHeight = function() {
        return this.innerContentHeight;
    };
    
    tm.getScrollTop = function() {
        this.initParents();
        return this.getRealParent().getScrollTop();
    };
    
    tm.getScrollLeft = function() {
        this.initParents();
        return this.getRealParent().getScrollLeft();
    };
    
    tm.isVisible = function () {
        return this.yVisible;
    };
    
    tm.addUpdatingChild = function(child) {
        this.getRealParent().addUpdatingChild(child);
    };
    
    tm.createViewport = function() { 
        return this.getRealParent().createViewport.call(this);
    };
   
    tm.getRealParent = function()   {
        this.initParents();
        return this.realParent;
    };

    tm.shouldCalculateChildren = function()    {
        var result = this.isVisible() || this.newFlag;
        this.newFlag = false;
                
        return result;
    };
    
    tm.getChildren = function() {
        return this.actualValues.tchildren;
    };
    
    tm.addToParentVisibleList = function() {};
    
    tm.initParents = function() {
        if (this.realParent || this.topBracket)    {
            return;
        }
        
        var topBracket = this;
        var parent = this.bracketParent;
                        
        while (parent) {
            
            if (parent.type !== 'BI')  {
                break;
            } else {
                topBracket = parent;
                parent = parent.bracketParent;
            }
        }   
        
        this.realParent = parent;
        this.topBracket = topBracket;
    };
    
    tm.getChildrenOids = function()    {
        
        var oids = [], list = this.getChildren();
        
        for (var i = 0; i < list.length; i++)  {
            var item = list[i];
            if (item.type === 'BI')   {
                var goids = item.getChildrenOids();

                oids = [].concat(oids, [item.oid], goids);
            } else {
                oids.push(item.oid + ":" + item.getHeight());
            }
            
        }
        
        return oids;
    };

    return tm;
}

Bracket.bracketMap = {};
Bracket.bracketAllMap = {};

Bracket.generate = function(page, listOfTModel)  {
    var brackets = Bracket.bracketMap[page.oid];
    
    var maxLastUpdate = Math.max(page.getActualValueLastUpdate('allChildren'), page.getActualValueLastUpdate('width'), page.getActualValueLastUpdate('height'));
    
    if (brackets && brackets.lastUpdate >= maxLastUpdate) {
        brackets = Bracket.bracketMap[page.oid];
    } else {       
        brackets = {
            lastUpdate: maxLastUpdate,
            list: []
        };  
        
        listOfTModel = page.type !== 'BI' && !listOfTModel ? page.getChildren() : listOfTModel;
        var length = listOfTModel.length;

        var bracketSize = Math.max(2, tapp.locationManager.bracketThreshold - 1);
        var needsMoreBracketing = false;
        var consecutiveBrackets = 0;
        var from = 0;
        for (var i = 0; i < length; i++) {

            var index = i - from;

            if ((listOfTModel[i].canBeBracketed() && (index === bracketSize || i === length - 1))
                    || (!listOfTModel[i].canBeBracketed() && index > 0)) {
                var to = !listOfTModel[i].canBeBracketed() ? i : i + 1;
                brackets.list.push(Bracket.createBracket(page, listOfTModel, from, to));
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

        if (needsMoreBracketing)   {
            brackets = Bracket.generate(page, brackets.list);
        } else {
            Bracket.bracketMap[page.oid] = brackets;
        }
    }
          
    return brackets;  
};

Bracket.createBracket = function(page, listOfTModel, from, to) {
    var bracketId = page.oid + "_" + page.getWidth() + "_" + page.getHeight() + "_" + listOfTModel.slice(from, to).oids('_');
    var bracket;
    
    if (Bracket.bracketAllMap[bracketId]) {
        bracket = Bracket.bracketAllMap[bracketId];
    } else {
        bracket = new Bracket(page);

        Bracket.bracketAllMap[bracketId] = bracket;

        bracket.actualValues.tchildren = listOfTModel.slice(from, to);

        if (bracket.actualValues.tchildren[0].type === 'BI')   { 

            bracket.actualValues.children.forEach(function(b) {
                b.bracketParent = bracket; 
            });
        }

        bracket.bracketParent = page;
        
    }
    return bracket;
};

export { Bracket };
