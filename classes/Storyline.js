class Storyline {
    constructor(str, x, y, interval) {
        this.str = str;
        this.x = x;
        this.y = y;
        this.interval = interval;
        this.index = 0;
        this.lastTime = millis();
    }

    update() {
        if (millis() - this.lastTime > this.interval && this.index < this.str.length) {
            this.index++;
            this.lastTime = millis();
        }
    }

    display() {
        text(this.str.substring(0, this.index), this.x, this.y);
    }

    isFinished() {
        return this.index >= this.str.length;
    }
}