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
// see getPeaks() method for more details
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
        // sampleStep can be undefined if not provided as parameter, in that case, the getPeaks()
        // method will define it as a tenth of sampleSize
        this.sampleStep = sampleStep;

        // Initialize the peaks array from the decoded audio buffer and canvas size
        this.getPeaks();
    }

    // Clear the entire canvas area
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
    // First parameter: where to start vertically in the canvas (useful when we draw several
    // waveforms in a single canvas)
    // Second parameter = height of the sample
    drawWave(startY, height) {
        const ctx = this.canvas.getContext('2d');
        ctx.save();
        ctx.translate(0, startY);

        const width = this.displayWidth;
        const maxPeak = this.max(this.peaks);
        const safeMax = (maxPeak && isFinite(maxPeak) && maxPeak > 0) ? maxPeak : 1;
        const coef = height / (2 * safeMax);
        const halfH = height / 2;

        // Midline
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, halfH);
        ctx.lineTo(width, halfH);
        ctx.stroke();

        // Vertical peak lines per column (more readable under overlay than filled area)
        ctx.beginPath();
        for (let i = 0; i < width; i++) {
            const h = Math.round(this.peaks[i] * coef);
            ctx.moveTo(i, halfH - h);
            ctx.lineTo(i, halfH + h);
        }
        ctx.stroke();

        ctx.restore();
    }

    // Builds an array of peaks for drawing
    // Need the decoded buffer
    // Note that we go first through all the sample data and then
    // compute the value for a given column in the canvas, not the reverse
    // A sampleStep value is used to avoid iterating every individual sample,
    // as there can be ~15 million samples in a 3-minute song.
    getPeaks() {
        let buffer = this.decodedAudioBuffer;
        // size of the block of samples that will be used to compute a single peak
        let sampleSize = Math.ceil(buffer.length / this.displayWidth);

        // If sampleStep is undefined, define it as a tenth of sampleSize
        // ~~ is equivalent to Math.floor FOR POSITIVE VALUES ONLY, this is a trick to avoid using Math.floor()
        // is the bit operator for "NOT", so ~~ is like applying NOT twice. It removes the decimal part of a number
        // converted to a 32 bit integer. ~~x is equivalent to toInt32(x).
        // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators#examples
        // Note : ~~4.9 is equal to 4 and ~~-4.9 is equal to -4
        // But Math.floor(-4.9) is -5
        // So be careful, here sampleSize is always positive so we can use ~~
        this.sampleStep = this.sampleStep || ~~(sampleSize / 10);
        if (this.sampleStep < 1) this.sampleStep = 1; // avoid infinite loops on very short buffers

        // An audio sample can be stereo or mono, we average the peaks of each channel
        let channels = buffer.numberOfChannels;

        // The result is an array of size equal to the displayWidth
        this.peaks = new Float32Array(this.displayWidth);

        // For each column in the canvas, compute peak across all channels
        for (let i = 0; i < this.displayWidth; i++) {
            let start = ~~(i * sampleSize);
            let end = start + sampleSize;
            // Clamp to channel length later per channel
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
