// About imports and exports in JavaScript modules
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export

// default imports of classes from waveformdrawer.js and trimbarsdrawer.js
import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
// "named" imports from utils.js and soundutils.js
import { loadAndDecodeSound, playSound } from './soundutils.js';
import { pixelToSeconds } from './utils.js';

// The AudioContext object is the main "entry point" into the Web Audio API
let ctx;

const soundURLs = [
    'https://upload.wikimedia.org/wikipedia/commons/a/a3/Hardstyle_kick.wav',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c7/Redoblante_de_marcha.ogg/Redoblante_de_marcha.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c9/Hi-Hat_Cerrado.ogg/Hi-Hat_Cerrado.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/0/07/Hi-Hat_Abierto.ogg/Hi-Hat_Abierto.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3c/Tom_Agudo.ogg/Tom_Agudo.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/a4/Tom_Medio.ogg/Tom_Medio.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8d/Tom_Grave.ogg/Tom_Grave.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/6/68/Crash.ogg/Crash.ogg.mp3',
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/24/Ride.ogg/Ride.ogg.mp3'
];
let decodedSounds = [];
let buttonsContainer = document.querySelector('#buttonsContainer');
let currentIndex = 0; // which sound is selected for waveform/trim playback

let canvas, canvasOverlay;
// waveform drawer is for drawing the waveform in the canvas
// trimbars drawer is for drawing the trim bars in the overlay canvas

let waveformDrawer, trimbarsDrawer;
let mousePos = { x: 0, y: 0 }

// Define a Sound class to encapsulate sound-related data and methods
class Sound {
    constructor(url) {
        this.url = url;
        this.buffer = null; // Decoded audio buffer
        this.trimBars = { left: 100, right: 200 }; // Default trim bar positions
    }

    setBuffer(buffer) {
        this.buffer = buffer;
    }

    saveTrimBars(left, right) {
        this.trimBars.left = left;
        this.trimBars.right = right;
    }

    getTrimBars() {
        return this.trimBars;
    }
}

// Replace soundURLs with an array of Sound objects
const sounds = soundURLs.map(url => new Sound(url));

window.onload = async function init() {
    ctx = new AudioContext();

    // two canvas : one for drawing the waveform, the other for the trim bars
    canvas = document.querySelector("#myCanvas");
    canvasOverlay = document.querySelector("#myCanvasOverlay");

    // create the waveform drawer and the trimbars drawer
    waveformDrawer = new WaveformDrawer();
    trimbarsDrawer = new TrimbarsDrawer(canvasOverlay, 0, canvas.length);

    // Load and decode all sounds in parallel
    await Promise.all(
        sounds.map(async sound => {
            const buffer = await loadAndDecodeSound(sound.url, ctx);
            sound.setBuffer(buffer);
        })
    );

    // Initialize waveform with the first decoded buffer
    currentIndex = 0;
    const initialBuffer = sounds[currentIndex].buffer;
    waveformDrawer.init(initialBuffer, canvas, '#e83ee8ff');
    waveformDrawer.drawWave(0, canvas.height);

    // Set the trim bars to their default positions for the first sound
    const { left, right } = sounds[currentIndex].getTrimBars();
    trimbarsDrawer.leftTrimBar.x = left;
    trimbarsDrawer.rightTrimBar.x = right;

    // Create one button per sound to play it and update the waveform
    buttonsContainer.innerHTML = '';
    sounds.forEach((sound, i) => {
        const btn = document.createElement('button');
        const label = sound.url.split('/').pop();
        btn.textContent = `Play: ${decodeURIComponent(label)}`;
        btn.style.marginRight = '0.5rem';

        btn.onclick = async () => {
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // Save current trim bar positions
            const currentSound = sounds[currentIndex];
            currentSound.saveTrimBars(trimbarsDrawer.leftTrimBar.x, trimbarsDrawer.rightTrimBar.x);

            currentIndex = i;
            const selectedSound = sounds[i];
            const buffer = selectedSound.buffer;
            if (!buffer) return;

            waveformDrawer.clearCanvas();
            waveformDrawer.init(buffer, canvas, '#e83ee8ff');
            waveformDrawer.drawWave(0, canvas.height);

            // Restore trim bar positions for the selected sound
            const { left, right } = selectedSound.getTrimBars();
            trimbarsDrawer.leftTrimBar.x = left;
            trimbarsDrawer.rightTrimBar.x = right;

            const start = pixelToSeconds(left, buffer.duration, canvas.width);
            const end = pixelToSeconds(right, buffer.duration, canvas.width);
            const duration = Math.max(0, end - start);
            playSound(ctx, buffer, start, duration || buffer.duration);
        };

        buttonsContainer.appendChild(btn);
    });

    // declare mouse event listeners for ajusting the trim bars
    canvasOverlay.onmousemove = (evt) => {
        // get the mouse position in the canvas
        let rect = canvas.getBoundingClientRect();

        mousePos.x = (evt.clientX - rect.left);
        mousePos.y = (evt.clientY - rect.top);

        // When the mouse moves, we check if we are close to a trim bar
        // if so: move it!
        trimbarsDrawer.moveTrimBars(mousePos);
    };

    canvasOverlay.onmousedown = (evt) => {
        // If a trim bar is close to the mouse position, we start dragging it
        trimbarsDrawer.startDrag();
    };

    canvasOverlay.onmouseup = (evt) => {
        // We stop dragging the trim bars (if they were being dragged)
        trimbarsDrawer.stopDrag();
    };

    // start the animation loop for drawing the trim bars
    requestAnimationFrame(animate);
};

// Animation loop for drawing the trim bars
// We use requestAnimationFrame() to call the animate function
// at a rate of 60 frames per second (if possible)
// see https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
function animate() {
    // clear overlay canvas;
    trimbarsDrawer.clear();

    // draw the trim bars
    trimbarsDrawer.draw();

    // redraw in 1/60th of a second
    requestAnimationFrame(animate);
}



