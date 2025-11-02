import { distance } from './utils.js';

export default class TrimbarsDrawer {
    leftTrimBar = {
        x: 0,
        color: "white",
        selected: false,
        dragged: false
    }
    rightTrimBar = {
        x: 0,
        color: "white",
        selected: false,
        dragged: false
    }

    constructor(canvas, leftTrimBarX, rightTrimBarX) {
        this.canvas = canvas;
        this.leftTrimBar.x = leftTrimBarX;
        this.rightTrimBar.x = rightTrimBarX;
        this.ctx = canvas.getContext('2d');
    }

    // clear
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw() {
        let ctx = this.ctx;

        // save ctx
        ctx.save();

        // lines
        ctx.lineWidth = 2;

        ctx.strokeStyle = this.leftTrimBar.color;
        ctx.beginPath();
        // start
        ctx.moveTo(this.leftTrimBar.x, 0);
        ctx.lineTo(this.leftTrimBar.x, this.canvas.height);
        ctx.stroke();

        // end
        ctx.beginPath();
        ctx.strokeStyle = this.rightTrimBar.color;
        ctx.moveTo(this.rightTrimBar.x, 0);
        ctx.lineTo(this.rightTrimBar.x, this.canvas.height);
        ctx.stroke();

        // triangle start
        ctx.fillStyle = this.leftTrimBar.color;
        ctx.beginPath();
        ctx.moveTo(this.leftTrimBar.x, -0);
        ctx.lineTo(this.leftTrimBar.x + 10, 8);
        ctx.lineTo(this.leftTrimBar.x, 16);
        ctx.fill();

        // triangle end
        ctx.beginPath();
        ctx.fillStyle = this.rightTrimBar.color;
        ctx.moveTo(this.rightTrimBar.x, -0);
        ctx.lineTo(this.rightTrimBar.x - 10, 8);
        ctx.lineTo(this.rightTrimBar.x, 16);
        ctx.fill();

        // grey masks before/after
        ctx.fillStyle = "rgba(128, 128, 128, 0.7)"
        ctx.fillRect(0, 0, this.leftTrimBar.x, this.canvas.height);
        ctx.fillRect(this.rightTrimBar.x, 0, this.canvas.width, this.canvas.height);

        // restore ctx
        ctx.restore();
    }

    highLightTrimBarsWhenClose(mousePos) {
        // distance to left
        let d = distance(mousePos.x, mousePos.y, this.leftTrimBar.x + 5, 4);

        // highlight if close (only one at a time)
        if ((d < 10) && (!this.rightTrimBar.selected)) {
            this.leftTrimBar.color = "red";
            this.leftTrimBar.selected = true;
        } else {
            this.leftTrimBar.color = "white";
            this.leftTrimBar.selected = false;
        }

        // right bar
        d = distance(mousePos.x, mousePos.y, this.rightTrimBar.x - 5, 4);
        if ((d < 10) && (!this.leftTrimBar.selected)) {
            this.rightTrimBar.color = "red";
            this.rightTrimBar.selected = true;
        } else {
            this.rightTrimBar.color = "white";
            this.rightTrimBar.selected = false;
        }
    }

    startDrag() {
        // begin drag
        if (this.leftTrimBar.selected)
            this.leftTrimBar.dragged = true;

        if (this.rightTrimBar.selected)
            this.rightTrimBar.dragged = true;
    }

    stopDrag() {
        // end drag
        if (this.leftTrimBar.dragged) {
            this.leftTrimBar.dragged = false;
            this.leftTrimBar.selected = false;

            // keep left <= right
            if (this.leftTrimBar.x > this.rightTrimBar.x)
                this.leftTrimBar.x = this.rightTrimBar.x;
        }

        if (this.rightTrimBar.dragged) {
            this.rightTrimBar.dragged = false;
            this.rightTrimBar.selected = false;

            // keep right >= left
            if (this.rightTrimBar.x < this.leftTrimBar.x)
                this.rightTrimBar.x = this.leftTrimBar.x;
        }
    }


    moveTrimBars(mousePos) {
        // highlight/move
        this.highLightTrimBarsWhenClose(mousePos);

        // keep inside canvas
        if (mousePos.x <= 0) {
            this.leftTrimBar.x = 0;
        }
        if (mousePos.x >= this.canvas.width) {
            this.rightTrimBar.x = this.canvas.width;
        }

        if (this.leftTrimBar.dragged) {
            // ensure left <= right
            if (this.leftTrimBar.x < this.rightTrimBar.x)
                this.leftTrimBar.x = mousePos.x;
            else {
                if (mousePos.x < this.rightTrimBar.x)
                    this.leftTrimBar.x = mousePos.x;
            }
        }

        if (this.rightTrimBar.dragged) {
            // ensure right >= left
            if (this.rightTrimBar.x > this.leftTrimBar.x)
                this.rightTrimBar.x = mousePos.x;
            else {
                if (mousePos.x > this.rightTrimBar.x)
                    this.rightTrimBar.x = mousePos.x;
            }
        }
    }
}