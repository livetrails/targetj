function Easing() {}

Easing.linear =function (t) {
    return t;
};

Easing.inQuad = function (t) {
    return t * t;
};

Easing.outQuad = function(t) {
    return t * (2 - t);
};

Easing.outExpo = function (t) {
    return 1 - (1 - t) * (1 - t);
};
  
Easing.circular = function (t) {
    return Math.sqrt(1 - (--t * t));
};

Easing.inOutQuad = function (t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

Easing.inOut = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

Easing.outElastic = function(t) {
    var c4 = (2 * Math.PI) / 3;

    return t === 0
        ? 0
        : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export { Easing };