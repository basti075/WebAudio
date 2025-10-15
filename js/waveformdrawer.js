// ABOUT HOW TO DRAW AND ANIMATE IN AN HTML CANVAS
// You can follow the MOOC "HTML Coding Essentials and Best Practices" 
// at W3cx.org, by Michel Buffa, Modules 3 and 4 (drawing and animation)
// https://www.edx.org/learn/html5/the-world-wide-web-consortium-w3c-html5-coding-essentials-and-best-practices

// A class for drawing a waveform in a canvas
// It needs the decoded audio buffer and a canvas
// It builds an array of peaks for drawing the waveform
// The sampleStep parameter is optional, it is used to speed up the computation of the peaks
// by skipping samples. If not provided, it will be set to a tenth of sampleSize in getPeaks()
// sampleSize is the number of samples used to compute a single peak
// see getPeaks() method for more detailsexport default class WaveformDrawer {
export default class WaveformDrawer {
    decodedAudioBuffer;
    peaks;
    canvas;
    displayWidth;
    displayHeight;
    sampleStep;
    color;

    init(decodedAudioBuffer, canvas, color, sampleStep) {
        this.decodedAudioBuffer = decodedAudioBuffer;
        this.canvas = canvas;
        this.displayWidth = canvas.width;
        this.displayHeight = canvas.height;
        this.color = color;
        this.sampleStep = sampleStep;

        // Initialize peaks from decoded buffer
        this.getPeaks();
    }

    clear() {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    max(values) {
        let max = -Infinity;
        for (let i = 0, len = values.length; i < len; i++) {
            let val = values[i];
            if (val > max) max = val;
        }
        return max;
    }

    drawWave(startY, height) {
        const ctx = this.canvas.getContext('2d');
        ctx.save();
        ctx.translate(0, startY);

        ctx.fillStyle = this.color;
        ctx.strokeStyle = this.color;

        const width = this.displayWidth;
        const maxPeak = this.max(this.peaks) || 1; // prevent division by zero
        const coef = height / (2 * maxPeak);
        const halfH = height / 2;

        // baseline
        ctx.beginPath();
        ctx.moveTo(0, halfH);
        ctx.lineTo(width, halfH);
        ctx.stroke();

        // waveform path
        ctx.beginPath();
        ctx.moveTo(0, halfH);

        for (let i = 0; i < width; i++) {
            const h = Math.round(this.peaks[i] * coef);
            ctx.lineTo(i, halfH + h);
        }

        for (let i = width - 1; i >= 0; i--) {
            const h = Math.round(this.peaks[i] * coef);
            ctx.lineTo(i, halfH - h);
        }

        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    getPeaks() {
        const buffer = this.decodedAudioBuffer;
        const sampleSize = Math.ceil(buffer.length / this.displayWidth);

        // Define sample step (defaults to 1/10th of block size)
        this.sampleStep = this.sampleStep || ~~(sampleSize / 10);
        if (this.sampleStep < 1) this.sampleStep = 1;

        const channels = buffer.numberOfChannels;
        this.peaks = new Float32Array(this.displayWidth);

        for (let c = 0; c < channels; c++) {
            const chan = buffer.getChannelData(c);

            for (let i = 0; i < this.displayWidth; i++) {
                const start = ~~(i * sampleSize);
                const end = Math.min(start + sampleSize, chan.length);

                let peak = 0;
                for (let j = start; j < end; j += this.sampleStep) {
                    const value = Math.abs(chan[j]);
                    if (value > peak) peak = value;
                }

                // Average across channels
                this.peaks[i] += peak / channels;
            }
        }
    }
}