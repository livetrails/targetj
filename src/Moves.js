import { getScreenWidth } from "./App.js";

/**
 * It offers utility functions for common movement patterns. They generate 
 * a list of numbers that serve as target values, which can be iterated through
 * using the steps, interval, and loop features of targets
 */
class Moves {
    static shakeMap = {};
    
    static bounce(from, to, { 
            yStart = undefined,
            xStart = getScreenWidth() / 2, 
            widthStart = 50, 
            heightStart = 50, 
            bFactor = 0.6, 
            cFactor = 0.2, 
            rotationStart = 0, 
            rIncrement = 360 
        } = {}) 
    {
        let bounce = (to - from) * bFactor;
        const ys = yStart ? [yStart, from] : [from];
        const xs = [xStart];
        const widths = [widthStart];
        const heights = [heightStart];
        const rotations = [rotationStart];

        while (Math.abs(bounce | 0) > 1) {
            ys.push(to);
            ys.push(to - bounce);
            
            const compressedWidth = widthStart * (1 + cFactor);
            const compressedHeight = heightStart * (1 - cFactor);

            widths.push(compressedWidth);
            widths.push(widthStart);

            heights.push(compressedHeight);
            heights.push(heightStart);

            xs.push(xStart - (compressedWidth - widthStart) / 2);
            xs.push(xStart);

            rotations.push((rotations[rotations.length - 1] + rIncrement));

            bounce *= bFactor;
            rIncrement *= 0.8;
            cFactor *= bFactor;
        }
        
        xs.push(xStart);
        ys.push(to);
        widths.push(widthStart);
        heights.push(heightStart);
        rotations.push(360);

        return { 
            x: { list: xs }, 
            y: { list: ys },
            width: { list: widths }, 
            height: { list: heights }, 
            rotate: { list: rotations }
        };
    }
    
    static bounceSimple(tmodel, {
            shift = 40,
            bFactor = 0.7,
            cFactor = 0.2
        } = {}) 
    {
        const from = tmodel.getY() - shift;
        const to = tmodel.getY();
        const yStart = tmodel.getY();
        const xStart = (tmodel.getParentValue('width') - tmodel.getWidth()) / 2;
        const widthStart = tmodel.getWidth();
        const heightStart = tmodel.getHeight();       
        
        const bounce = Moves.bounce(from, to, {
            yStart, xStart, widthStart, heightStart, bFactor, cFactor
        });
        
        delete bounce.rotate;
        
        return bounce;
    }
    
    static shake(tmodel, {
            bFactor = 0.6, 
            cFactor = 0.3,
            strength = 20
        } = {}) 
    {
        if (!Moves.shakeMap[tmodel.oid]) {
            const xStart = (tmodel.getParentValue('width') - tmodel.getWidth()) / 2;
            const yStart = tmodel.getY();            
            const widthStart = tmodel.getWidth();
            const heightStart = tmodel.getHeight();
            Moves.shakeMap[tmodel.oid] = { xStart, yStart, widthStart, heightStart };
        }
        
        const { xStart, yStart, widthStart, heightStart } = Moves.shakeMap[tmodel.oid];
        
        const bounce = Moves.bounce(yStart - strength, yStart, {
            xStart, widthStart, heightStart, bFactor, cFactor 
        });
        
        const ys = bounce.height.list.map(height => {
            return yStart - (height - heightStart) / 2;
        });

        return {
            y: { list: ys },
            x: bounce.x, 
            width: bounce.width, 
            height: bounce.height
        };
    }
    
    static spiral({
            startAngle = 0,
            endAngle = 360,
            angleStep = 18,
            x = 0,
            y = 0,
            width = 100,
            height = 100
        } = {}) 
    {
        const xCoords = [], yCoords = [], rotations = [];

        for (let angle = startAngle; angle <= endAngle; angle += angleStep) {
            const radians = angle * (Math.PI / 180);
            xCoords.push(Math.floor(x + width * Math.cos(radians)));
            yCoords.push(Math.floor(y + height * Math.sin(radians)));
            rotations.push(90 + angle);
        }

        return {
            x: { list: xCoords },
            y: { list: yCoords },
            rotate: { list: rotations }
        };
    }
}

export { Moves };
