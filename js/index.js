import AudioTrimmer  from './AudioTrimmer.js'
import { loadAndDecodeSound } from './soundutils.js';


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

window.onload = async function init() {
    // audio context with fallback for older browsers
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    const promises = soundURLs.map(URL => loadAndDecodeSound(URL, ctx));
    let decodedSounds;
    try {
        decodedSounds = await Promise.all(promises);
    } catch (e) {
        // If one decoding fails, Promise.all will reject — if you want partial success,
        // wrap each load promise in a catch. For now log and rethrow.
        console.error('Failed to load or decode one or more sounds', e);
        throw e;
    }

    const container = document.querySelector("#buttonsContainer");
    const wrapper = document.querySelector(".wrapper");
    const canvas = document.querySelector(".myCanvas");
    const canvasOverlay = document.querySelector(".myCanvasOverlay");

    if (!container) console.warn('#buttonsContainer not found in DOM');
    if (!canvas) console.warn('.myCanvas not found in DOM');
    if (!canvasOverlay) console.warn('.myCanvasOverlay not found in DOM');

    decodedSounds.forEach((sound, index) => {
        if (!sound) return; // skip failed decodes (if any)
        const audioTrimmer = new AudioTrimmer(ctx, sound, container, canvas, canvasOverlay);
        // filename extraction: handle .ogg.mp3 too
        const filename = soundURLs[index].split('/').pop().replace(/\.(?:ogg\.mp3|wav|mp3|ogg)$/, '');
        audioTrimmer.createButton(filename);
    });
};
