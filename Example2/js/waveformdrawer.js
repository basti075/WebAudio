// Waveform canvas renderer
export default class WaveformDrawer {
    decodedAudioBuffer;
    peaks;
    canvas;
    displayWidth;
    displayHeight;
    sampleStep;

    init(decodedAudioBuffer, canvas, color, sampleStep) {
        this.decodedAudioBuffer = decodedAudioBuffer;
        this.canvas = canvas;
        this.displayWidth = canvas.width;
        this.displayHeight = canvas.height;
        this.color = color;
        // optional sampleStep; defaults inside getPeaks()
        this.sampleStep = sampleStep;
        // build peaks from buffer/canvas size
        this.getPeaks();
    }

    // clear canvas
    clearCanvas() {
        if (!this.canvas) return;
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    max(values) {
        let max = -Infinity;
        for (let i = 0, len = values.length; i < len; i++) {
            let val = values[i];
            if (val > max) { max = val; }
        }
        return max;
    }
    // draw at startY with given height
    drawWave(startY, height) {
        let ctx = this.canvas.getContext('2d');
        ctx.save();
        // start at startY
        ctx.translate(0, startY);

        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;

        let width = this.displayWidth;
        // scale factor for peaks
        const maxPeak = this.max(this.peaks);
        const safeMax = (maxPeak && isFinite(maxPeak) && maxPeak > 0) ? maxPeak : 1; // guard
        let coef = height / (2 * safeMax);

        let halfH = height / 2;

        // midline
        ctx.beginPath();
        ctx.moveTo(0, halfH);
        ctx.lineTo(width, halfH);
        console.log("drawing from 0, " + halfH + " to " + width + ", " + halfH);
        ctx.stroke();

        // filled waveform
        ctx.beginPath();
        ctx.moveTo(0, halfH);

        // upper part
        for (let i = 0; i < width; i++) {
            const h = Math.round(this.peaks[i] * coef);
            ctx.lineTo(i, halfH + h);
        }
        ctx.lineTo(width, halfH);

        // lower part
        ctx.moveTo(0, halfH);

        for (let i = 0; i < width; i++) {
            const h = Math.round(this.peaks[i] * coef);
            ctx.lineTo(i, halfH - h);
        }

        ctx.lineTo(width, halfH);

        ctx.fill();

        ctx.restore();
    }

    // build peaks array
    getPeaks() {
        let buffer = this.decodedAudioBuffer;
        // block size per pixel column
        let sampleSize = Math.ceil(buffer.length / this.displayWidth);

        console.log("sample size = " + buffer.length);

        // default step: ~10 columns per block
        this.sampleStep = this.sampleStep || ~~(sampleSize / 10);
        if (this.sampleStep < 1) this.sampleStep = 1; // guard

        // average across channels
        let channels = buffer.numberOfChannels;

        // one peak per pixel column
        this.peaks = new Float32Array(this.displayWidth);

        // compute peaks per column
        for (let i = 0; i < this.displayWidth; i++) {
            let start = ~~(i * sampleSize);
            let end = start + sampleSize;
            // clamp per channel length
            let sumPeaks = 0;
            for (let c = 0; c < channels; c++) {
                const chan = buffer.getChannelData(c);
                const clen = chan.length;
                const e = end > clen ? clen : end;
                let peak = 0;
                for (let j = start; j < e; j += this.sampleStep) {
                    const v = chan[j] || 0;
                    const abs = v < 0 ? -v : v;
                    if (abs > peak) peak = abs;
                }
                sumPeaks += peak;
            }
            this.peaks[i] = sumPeaks / channels;
        }
    }
}


