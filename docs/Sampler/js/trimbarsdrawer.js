import { clamp } from './utils.js';

export default class TrimbarsDrawer {
    constructor(canvas, minSelectionMs = 100, maxSelectionMs = 300000) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // selection [0..1]
        this.left = 0.0;
        this.right = 1.0;
        // drag/hover state
        this.drag = null;
        this.minPx = 5;
        this.minSelFrac = 0.01;
        this.hover = null; // 'left' | 'right' | 'move' | null
        this._bind();
    }
    _bind() {
        this.canvas.addEventListener('mousedown', (e) => this._onDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onHover(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hover = null;
            this.canvas.style.cursor = 'default';
        });
        window.addEventListener('mousemove', (e) => this._onMove(e));
        window.addEventListener('mouseup', () => this.drag = null);
    }
    _pos(e) {
        const r = this.canvas.getBoundingClientRect();
        return clamp((e.clientX - r.left) / (r.width || this.canvas.width), 0, 1);
    }
    _onDown(e) {
        const x = this._pos(e);
        const tol = 8 / this.canvas.width;
        if (Math.abs(x - this.left) < tol) {
            this.drag = 'left';
        } else if (Math.abs(x - this.right) < tol) {
            this.drag = 'right';
        } else {
            const w = this.right - this.left;
            const d = x - this.left;
            this.drag = { type: 'move', dx: d };
        }
    }
    _onMove(e) {
        if (!this.drag) return;
        const x = this._pos(e);
        if (this.drag === 'left') {
            this.left = clamp(Math.min(x, this.right - this.minSelFrac), 0, 1 - this.minSelFrac);
        } else if (this.drag === 'right') {
            this.right = clamp(Math.max(x, this.left + this.minSelFrac), this.minSelFrac, 1);
        } else if (this.drag && this.drag.type === 'move') {
            const w = this.right - this.left;
            const nl = clamp(x - this.drag.dx, 0, 1 - w);
            this.left = nl;
            this.right = nl + w;
        }
    }
    _onHover(e) {
        const x = this._pos(e);
        const tol = 8 / this.canvas.width;
        const overLeft = Math.abs(x - this.left) < tol;
        const overRight = Math.abs(x - this.right) < tol;
        const inside = x > this.left && x < this.right;
        if (overLeft && !overRight) {
            this.hover = 'left';
            this.canvas.style.cursor = 'ew-resize';
        } else if (overRight && !overLeft) {
            this.hover = 'right';
            this.canvas.style.cursor = 'ew-resize';
        } else if (inside) {
            this.hover = 'move';
            this.canvas.style.cursor = 'grab';
        } else {
            this.hover = null;
            this.canvas.style.cursor = 'default';
        }
    }
    clear() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
    }
    draw() {
        const { width, height } = this.canvas;
        const l = this.left * width;
        const r = this.right * width;
        const ctx = this.ctx;
        ctx.save();
        // shade outside
        ctx.fillStyle = 'rgba(128,128,128,0.7)';
        if (l > 0) ctx.fillRect(0, 0, l, height);
        if (r < width) ctx.fillRect(r, 0, width - r, height);

        // handles
        ctx.lineWidth = 2;
        const leftColor = (this.hover === 'left' || this.drag === 'left') ? 'red' : 'white';
        const rightColor = (this.hover === 'right' || this.drag === 'right') ? 'red' : 'white';
        ctx.strokeStyle = leftColor;
        ctx.beginPath(); ctx.moveTo(l, 0); ctx.lineTo(l, height); ctx.stroke();
        ctx.strokeStyle = rightColor;
        ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(r, height); ctx.stroke();

        // triangles
        ctx.fillStyle = leftColor;
        ctx.beginPath(); ctx.moveTo(l, 0); ctx.lineTo(l + 10, 8); ctx.lineTo(l, 16); ctx.fill();
        ctx.fillStyle = rightColor;
        ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(r - 10, 8); ctx.lineTo(r, 16); ctx.fill();

        ctx.restore();
    }
    selectionSeconds(buffer) {
        const start = this.left * buffer.duration;
        const end = this.right * buffer.duration;
        return { start, duration: Math.max(0.001, end - start) };
    }
}
