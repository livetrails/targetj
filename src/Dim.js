class Dim {
    constructor() {
        this.screen = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
    }

    measureScreen() {
        this.screen.width = document.documentElement.clientWidth || document.body.clientWidth;
        this.screen.height = document.documentElement.clientHeight || document.body.clientHeight;

        return this;
    }
}

export { Dim };
