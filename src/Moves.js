import { getScreenWidth } from "./App.js";

class Moves {
    static bounce(from, to, initialX = getScreenWidth() / 2, initialWidth = 50, initialHeight = 50, bounceFactor = 0.6, compressionFactor = 0.2) {
        let bounce = to * bounceFactor;
        const ys = [from];
        const xs = [initialX];
        const widths = [initialWidth];
        const heights = [initialHeight];

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

            bounce *= bounceFactor;
            compressionFactor *= bounceFactor;
        }

        return { x: xs, y: ys, width: widths, height: heights };
    }

    static spiral(startAngle, endAngle, angleStep, x, y, width, height) {
        const xCoords = [], yCoords = [], rotations = [];

        for (let angle = startAngle; angle <= endAngle; angle += angleStep) {
            const radians = angle * (Math.PI / 180);
            xCoords.push(Math.floor(x + width * Math.cos(radians)));
            yCoords.push(Math.floor(y + height * Math.sin(radians)));
            rotations.push(90 + angle);
        }

        return { x: xCoords, y: yCoords, rotate: rotations };
    }
}

export { Moves };
