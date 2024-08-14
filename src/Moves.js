import { Easing } from "./Easing.js";

function Moves() {}

Moves.bounce = function (from, to, bounceFactor) {
    bounceFactor = bounceFactor || 0.6;
    
    var bounce = to * bounceFactor;
    var moves = [from];
    while ((bounce | 0) > 1) {
        moves.push(to);
        moves.push(to - bounce);
        bounce *= 0.5;
    }
    
    return moves;
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
