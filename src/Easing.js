function Easing() {}

Easing.linear =function (t) {
    return t;
};

Easing.easeInQuad = function (t) {
    return t * t;
};

Easing.easeOutQuad = function(t) {
    return t * (2 - t);
};

Easing.easeOutExpo = function (t) {
    return 1 - (1 - t) * (1 - t);
};
  
Easing.circular = function (t) {
    return Math.sqrt(1 - (--t * t));
};

Easing.easeInOutQuad = function (t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

Easing.easeOutElastic = function(t) {
    var c4 = (2 * Math.PI) / 3;

    return t === 0
        ? 0
        : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export { Easing };