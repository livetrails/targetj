import { getScreenWidth } from "./App.js";

/**
 * It offers utility functions for common movement patterns.
 */
class Moves {
    static bounce(from, to, initialX = getScreenWidth() / 2, initialWidth = 50, initialHeight = 50, 
            bounceFactor = 0.6, compressionFactor = 0.2, initialRotation = 0, rotationIncrement = 360) {
        let bounce = to * bounceFactor;
        const ys = [from];
        const xs = [initialX];
        const widths = [initialWidth];
        const heights = [initialHeight];
        const rotations = [initialRotation];

        while ((bounce | 0) > 1) {
            ys.push(to);
            ys.push(to - bounce);

            const compressedWidth = initialWidth * (1 + compressionFactor);
            const compressedHeight = initialHeight * (1 - compressionFactor);

            widths.push(compressedWidth);
            widths.push(initialWidth);

            heights.push(compressedHeight);
            heights.push(initialHeight);

            xs.push(initialX - (compressedWidth - initialWidth) / 2);
            xs.push(initialX);

            rotations.push((rotations[rotations.length - 1] + rotationIncrement));

            bounce *= bounceFactor;
            rotationIncrement *= 0.8;
            compressionFactor *= bounceFactor;
        }

        rotations[rotations.length - 1] += 360 - (rotations[rotations.length - 1] % 360) ;

        return { 
            x: { list: xs }, 
            y: { list: ys },
            width: { list: widths }, 
            height: { list: heights }, 
            rotate: { list: rotations } 
        };
    }

    static spiral(startAngle, endAngle, angleStep, x, y, width, height) {
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
