function Dim()  {
    function my() {}
            
    my.screen ={
        x: 0,
        y: 0,
        width: 0,
        height: 0    
    };
  
    my.measureScreen = function() {
        my.screen.width = document.documentElement.clientWidth || document.body.clientWidth;
        my.screen.height = document.documentElement.clientHeight || document.body.clientHeight; 

        return my;
    };
    
    return my;
}

export { Dim };
