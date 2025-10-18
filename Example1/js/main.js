// About imports and exports in JavaScript modules
// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
// and https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export

// "named" imports from utils.js and soundutils.js
import { loadAndDecodeSound, playSound } from './soundutils.js';

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

// The button for playing the sound
const playButton = document.querySelector("#playButton");
// disable the button until the sound is loaded and decoded (if it exists)
if (playButton) {
    playButton.disabled = true;
}

window.onload = async function init() {
    // Ensure we have a container for per-sound buttons even if it wasn't in the HTML
    if (!buttonsContainer) {
        buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'buttonsContainer';
        buttonsContainer.style.marginTop = '1rem';
        document.body.appendChild(buttonsContainer);
    }
    ctx = new AudioContext();


    // Load and decode all sounds concurrently using Promise.all
    // Each URL is processed by loadAndDecodeSound, which returns a decoded AudioBuffer
    decodedSounds = await Promise.all(
        soundURLs.map(url => loadAndDecodeSound(url, ctx))
    );

    // we enable the play sound button, now that the sound is loaded and decoded
    if (playButton) {
        playButton.disabled = false;
    }

    // Create one button per sound
    buttonsContainer.innerHTML = '';
    soundURLs.forEach((url, i) => {
        const btn = document.createElement('button');
        const label = url.split('/').pop();
        btn.textContent = `Play: ${decodeURIComponent(label)}`;
        btn.style.marginRight = '0.5rem';
        btn.onclick = async () => {
            // Some browsers require a user interaction to resume audio context
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            const buffer = decodedSounds[i];
            if (!buffer) return;
            playSound(ctx, buffer, 0, buffer.duration);
        };
        buttonsContainer.appendChild(btn);
    });

    // Event listener for the button. When the button is pressed, we play the first sound
    if (playButton) {
        playButton.onclick = async function (evt) {
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            // From soundutils.js; play the first decoded buffer for demo purposes
            const buffer = decodedSounds[0];
            if (!buffer) return;
            playSound(ctx, buffer, 0, buffer.duration);
        }
    }
}
