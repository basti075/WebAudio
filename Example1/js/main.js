// imports
import { loadAndDecodeSound, playSound } from './soundutils.js';

// audio context
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

// play button
const playButton = document.querySelector("#playButton");
if (playButton) {
    playButton.disabled = true;
}

window.onload = async function init() {
    // container for per-sound buttons
    if (!buttonsContainer) {
        buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'buttonsContainer';
        buttonsContainer.style.marginTop = '1rem';
        document.body.appendChild(buttonsContainer);
    }
    ctx = new AudioContext();


    // decode all sounds
    decodedSounds = await Promise.all(
        soundURLs.map(url => loadAndDecodeSound(url, ctx))
    );

    // we enable the play sound button, now that the sound is loaded and decoded
    if (playButton) {
        playButton.disabled = false;
    }

    // one button per sound
    buttonsContainer.innerHTML = '';
    soundURLs.forEach((url, i) => {
        const btn = document.createElement('button');
        const label = url.split('/').pop();
        btn.textContent = `Play: ${decodeURIComponent(label)}`;
        btn.style.marginRight = '0.5rem';
        btn.onclick = async () => {
            // resume context if needed
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            const buffer = decodedSounds[i];
            if (!buffer) return;
            playSound(ctx, buffer, 0, buffer.duration);
        };
        buttonsContainer.appendChild(btn);
    });

    // main button plays first sound
    if (playButton) {
        playButton.onclick = async function (evt) {
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            const buffer = decodedSounds[0];
            if (!buffer) return;
            playSound(ctx, buffer, 0, buffer.duration);
        }
    }
}
