import {  getScreenWidth } from "./App.js";

function Moves() {}

Moves.bounce = function (from, to, initialX, initialWidth, initialHeight, bounceFactor, compressionFactor) {

    initialX = initialX || getScreenWidth() / 2;
    initialWidth = initialWidth || 50;
    initialHeight = initialHeight || 50;
    bounceFactor = bounceFactor || 0.6;
    
    compressionFactor = compressionFactor || 0.2;    
    
    var bounce = to * bounceFactor;
    var ys = [from];
    var xs = [initialX];    
    var widths = [initialWidth];
    var heights = [initialHeight];
   
    while ((bounce | 0) > 1) {
        ys.push(to);
        ys.push(to - bounce);
        
        var compressedWidth = initialWidth * (1 + compressionFactor);
        var compressedHeight = initialHeight * (1 - compressionFactor);
        
        widths.push(compressedWidth);
        widths.push(initialWidth);
        
        heights.push(compressedHeight);
        heights.push(initialHeight);
        
        xs.push(initialX - (compressedWidth - initialWidth) / 2);
        xs.push(initialX);
        
        bounce *= bounceFactor;
        compressionFactor *= bounceFactor;
    }
    
    return { x: xs, y: ys, width: widths, height: heights };
};

Moves.spiral = function (startAngle, endAngle, angleStep, x, y, width, height) {
        
    var xCoords = [], yCoords = [], rotations = [];
            
    for (var angle = startAngle; angle <= endAngle; angle += angleStep) {
        var radians = angle * (Math.PI / 180);
        xCoords.push(Math.floor(x + width * Math.cos(radians)));
        yCoords.push(Math.floor(y + height * Math.sin(radians)));
        rotations.push(90 + angle);
    }
    
    return { x: xCoords, y: yCoords, rotate: rotations };
};



export { Moves };
