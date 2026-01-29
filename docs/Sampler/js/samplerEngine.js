export class SamplerEngine {
    constructor(ctx) {
        this.ctx = ctx;
        this.buffers = [];
        this.output = this.ctx.createGain();
        this.output.gain.value = 1.0;
        this._routed = false;
    }

    setBuffers(buffers) {
        this.buffers = [...buffers];
    }

    routeOnce(destination) {
        if (!this._routed) {
            this.output.connect(destination || this.ctx.destination);
            this._routed = true;
        }
    }

    play(index, start = 0, duration, destination) {
        const buf = this.buffers[index];
        if (!buf) return;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.output);
        this.routeOnce(destination);
        if (duration && duration > 0) {
            src.start(0, Math.max(0, start), Math.max(0.001, duration));
        } else {
            src.start(0, Math.max(0, start));
        }
    }
}
