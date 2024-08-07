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

export { Easing };