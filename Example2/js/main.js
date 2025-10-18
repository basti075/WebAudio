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

// Base URL of the REST API (Seance2/ExampleRESTEndpoint[Corrige]) — will be auto-detected
let API_BASE = 'http://localhost:3000';
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

// Active sounds for the currently selected preset
let sounds = [];

// UI elements for presets
const presetSelect = document.querySelector('#presetSelect');
const presetStatus = document.querySelector('#presetStatus');

function resolveSampleUrl(u) {
    // Absolute URL: keep as-is
    if (/^https?:\/\//i.test(u)) return u;
    // Already under /presets
    if (u.startsWith('/presets/')) return `${API_BASE}${encodeURI(u)}`;
    // Relative like "./808/file.wav" -> "/presets/808/file.wav"
    const trimmed = u.replace(/^\.\//, '');
    return `${API_BASE}/presets/${encodeURI(trimmed)}`;
}

async function loadAndDecodeAll() {
    const results = await Promise.allSettled(
        sounds.map(async (sound) => {
            const buffer = await loadAndDecodeSound(sound.url, ctx);
            sound.setBuffer(buffer);
            return sound;
        })
    );
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) {
        console.warn(`Failed to load ${failed.length} sample(s)`, failed);
    }
    // Keep only successfully decoded sounds
    sounds = sounds.filter(s => !!s.buffer);
    return { ok: sounds.length > 0, failed: failed.length };
}

function rebuildButtonsAndWaveform() {
    if (!sounds.length || !sounds[0].buffer) {
        if (presetStatus) presetStatus.textContent = 'No decodable samples available.';
        buttonsContainer.innerHTML = '';
        if (waveformDrawer && waveformDrawer.canvas) waveformDrawer.clearCanvas();
        return;
    }
    // Initialize waveform with first sound
    currentIndex = 0;
    const initialBuffer = sounds[currentIndex].buffer;
    waveformDrawer.clearCanvas();
    waveformDrawer.init(initialBuffer, canvas, '#e83ee8ff');
    waveformDrawer.drawWave(0, canvas.height);

    // Apply default trim bars for first sound
    const { left, right } = sounds[currentIndex].getTrimBars();
    trimbarsDrawer.leftTrimBar.x = left;
    trimbarsDrawer.rightTrimBar.x = right;

    // Build buttons
    buttonsContainer.innerHTML = '';
    sounds.forEach((sound, i) => {
        const btn = document.createElement('button');
        const label = sound.url.split('/').pop();
        btn.textContent = `Play: ${decodeURIComponent(label)}`;
        btn.style.marginRight = '0.5rem';

        btn.onclick = async () => {
            if (ctx.state === 'suspended') await ctx.resume();

            // Save trim bars for current
            const currentSound = sounds[currentIndex];
            currentSound.saveTrimBars(trimbarsDrawer.leftTrimBar.x, trimbarsDrawer.rightTrimBar.x);

            currentIndex = i;
            const selectedSound = sounds[i];
            const buffer = selectedSound.buffer;
            if (!buffer) return;

            waveformDrawer.clearCanvas();
            waveformDrawer.init(buffer, canvas, '#e83ee8ff');
            waveformDrawer.drawWave(0, canvas.height);

            // Restore trim bars
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
}

async function fetchAndPopulatePresets() {
    try {
        presetStatus.textContent = 'Loading presets...';
        const res = await fetch(`${API_BASE}/api/presets`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const presets = await res.json();
        if (!Array.isArray(presets) || presets.length === 0) throw new Error('No presets');

        // Fill dropdown
        presetSelect.innerHTML = '';
        presets.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            if (idx === 0) opt.selected = true;
            presetSelect.appendChild(opt);
        });

        // Build sounds from first preset
        const first = presets[0];
        sounds = (first.samples || [])
            .filter(s => s && s.url)
            .map(s => new Sound(resolveSampleUrl(s.url)));

        {
            const { ok, failed } = await loadAndDecodeAll();
            rebuildButtonsAndWaveform();
            presetStatus.textContent = ok
                ? `Loaded ${presets.length} preset(s)${failed ? ` • ${failed} failed` : ''}`
                : 'Preset has no decodable samples';
        }

        // Handle changes
        presetSelect.onchange = async () => {
            const name = presetSelect.value;
            const p = presets.find(x => x.name === name);
            if (!p) return;
            // Reset sounds for this preset
            sounds = (p.samples || [])
                .filter(s => s && s.url)
                .map(s => new Sound(resolveSampleUrl(s.url)));
            presetStatus.textContent = 'Loading samples...';
            const { ok, failed } = await loadAndDecodeAll();
            rebuildButtonsAndWaveform();
            presetStatus.textContent = ok
                ? `Preset "${name}" ready${failed ? ` • ${failed} failed` : ''}`
                : `Preset "${name}" has no decodable samples`;
        };
    } catch (err) {
        console.error('Failed to fetch presets:', err);
        presetStatus.textContent = 'Presets unavailable, using built-in samples';
        // Fallback to a small default list
        const fallback = [
            'https://upload.wikimedia.org/wikipedia/commons/a/a3/Hardstyle_kick.wav',
            'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c7/Redoblante_de_marcha.ogg/Redoblante_de_marcha.ogg.mp3'
        ];
        sounds = fallback.map(u => new Sound(u));
        const { ok, failed } = await loadAndDecodeAll();
        rebuildButtonsAndWaveform();
        if (presetStatus) {
            presetStatus.textContent = ok
                ? `Using built-in samples${failed ? ` • ${failed} failed` : ''}`
                : 'Built-in samples unavailable';
        }
    }
}

window.onload = async function init() {
    ctx = new AudioContext();

    // two canvas : one for drawing the waveform, the other for the trim bars
    canvas = document.querySelector("#myCanvas");
    canvasOverlay = document.querySelector("#myCanvasOverlay");

    // create the waveform drawer and the trimbars drawer
    waveformDrawer = new WaveformDrawer();
    trimbarsDrawer = new TrimbarsDrawer(canvasOverlay, 0, canvas.width);

    // Detect API base (try multiple candidates) before fetching presets
    await detectApiBase();
    // Fetch presets and initialize UI
    await fetchAndPopulatePresets();

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

// Try multiple API endpoints to find a reachable server with CORS enabled
async function detectApiBase() {
    const candidates = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
    ];
    for (const url of candidates) {
        try {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 1500);
            const r = await fetch(`${url}/api/health`, { signal: controller.signal });
            clearTimeout(t);
            if (r.ok) {
                API_BASE = url;
                if (presetStatus) presetStatus.textContent = `API detected at ${API_BASE}`;
                return;
            }
        } catch (_) {
            // try next
        }
    }
    if (presetStatus) presetStatus.textContent = 'Presets unavailable, using built-in samples';
}



