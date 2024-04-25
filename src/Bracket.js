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

    tm.getTargetWidth = function()  {
        return this.getContentWidth();
    };
    
    tm.getTargetHeight = function()   {
        return this.getContentHeight();
    };
    
    tm.getWidth = function()    {
        return this.getContentWidth() || 1;
    };
    
    tm.getHeight = function()   {
        return this.getContentHeight() || 1;
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
    
    tm.shouldCalculateChildrenLocations = function()    {
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
                oids.push(item.oid + ":" + (item.location ? item.y + "px" : "0px"));
            }
            
        }
        
        return oids;
    };

    return tm;
}

Bracket.bracketMap = {};
Bracket.bracketAllMap = {};

Bracket.generate = function(page, listOfTModel)  {
    var i;
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
        var cannotBeBracketedIndex = 0;
        
        for (i = 0; i < length; i++) {
            if (!listOfTModel[i].canBeBracketed()) {
                cannotBeBracketedIndex++;
                brackets.list.push(listOfTModel[i]);
            } else {
                break;
            }
        }

        var bracketSize = Math.max(2, tapp.locationManager.bracketThreshold - 1);
        var bracketCount = Math.ceil((length - cannotBeBracketedIndex) / bracketSize);
        
        var index = cannotBeBracketedIndex;
        for (i = 0; i < bracketCount; i++) {

            var size = Math.min(length - index, bracketSize);

            var bracketId = page.oid + "_" + page.getWidth() + "_" + page.getHeight() + "_" + listOfTModel.slice(index, index + size).oids('_');
            var bracket;

            if (Bracket.bracketAllMap[bracketId]) {
                bracket = Bracket.bracketAllMap[bracketId];
            } else {
                bracket = new Bracket(page);

                Bracket.bracketAllMap[bracketId] = bracket;

                bracket.actualValues.tchildren = listOfTModel.slice(index, index + size);

                if (bracket.actualValues.tchildren[0].type === 'BI')   { 

                    bracket.actualValues.children.forEach(function(b) {
                        b.bracketParent = bracket; 
                    });
                }

                bracket.bracketParent = page;
            }

            brackets.list.push(bracket);
            index += size;
        }

        if (brackets.list.length - cannotBeBracketedIndex > tapp.locationManager.bracketThreshold)   {
            brackets = Bracket.generate(page, brackets.list);
        } else {
            Bracket.bracketMap[page.oid] = brackets;
        }
    }
          
    return brackets;  
};