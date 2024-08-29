class Easing {
    static linear(t) {
        return t;
    }

    static inQuad(t) {
        return t * t;
    }

    static outQuad(t) {
        return t * (2 - t);
    }

    static outExpo(t) {
        return 1 - (1 - t) * (1 - t);
    }

    static circular(t) {
        return Math.sqrt(1 - (--t * t));
    }

    static inOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    static inOut(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    static outElastic(t) {
        const c4 = (2 * Math.PI) / 3;

        return t === 0
            ? 0
            : t === 1
            ? 1
            : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
}

export { Easing };
