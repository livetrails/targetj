function Easing() {}

Easing.linear =function (t) {
    return t;
};

Easing.easeInQuad = function (t) {
    return t * t;
};

Easing.easeOutExpo = function (t) {
    return 1 - (1 - t) * (1 - t);
};
  
Easing.circular = function (t) {
    return Math.sqrt(1 - (--t * t));
};

export { Easing };