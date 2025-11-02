import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import { SamplerEngine } from './samplerEngine.js';
import { SamplerGUI } from './samplerGUI.js';
import { MidiManager } from './midi.js';

// API base
const API_CANDIDATES = ['http://localhost:3000', 'http://127.0.0.1:3000'];
let API_BASE = API_CANDIDATES[0];

function resolveUrl(u) {
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/presets/')) return API_BASE + encodeURI(u);
    const t = u.replace(/^\.\//, '');
    return `${API_BASE}/presets/${encodeURI(t)}`;
}

async function detectApiBase() {
    for (const url of API_CANDIDATES) {
        try {
            const r = await fetch(`${url}/api/health`);
            if (r.ok) { API_BASE = url; return; }
        } catch {
            // try next
        }
    }
}

async function downloadArrayBufferWithProgress(url, onProgress) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const total = Number(res.headers.get('Content-Length')) || 0;
    if (!res.body) return await res.arrayBuffer();
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        if (onProgress && total) onProgress(received / total);
    }
    const size = chunks.reduce((s, c) => s + c.byteLength, 0);
    const ab = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) { ab.set(c, offset); offset += c.byteLength; }
    return ab.buffer;
}

async function loadBuffer(url, ctx, onProgress) {
    const ab = await downloadArrayBufferWithProgress(url, p => onProgress && onProgress(Math.max(0, Math.min(0.9, p * 0.9))));
    // decode (last 10%)
    onProgress && onProgress(0.95);
    const decoded = await ctx.decodeAudioData(ab);
    onProgress && onProgress(1);
    return decoded;
}

class Sound {
    constructor(url, name) {
        this.url = url;
        this.name = name;
        this.buffer = null;
        this.ready = false;
        this.trim = { left: 0, right: 1 };
    }
}

// Trim storage per URL
const TRIMS_KEY = 'assignmentSampler.trims.v1';
function loadAllTrims() {
    try { return JSON.parse(localStorage.getItem(TRIMS_KEY) || '{}'); }
    catch { return {}; }
}
function saveTrimForUrl(url, left, right) {
    try {
        const m = loadAllTrims();
        m[url] = { left, right };
        localStorage.setItem(TRIMS_KEY, JSON.stringify(m));
    } catch { /* no-op */ }
}

window.addEventListener('load', async () => {
    const ctx = new AudioContext();
    const presetSelect = document.getElementById('presetSelect');
    const status = document.getElementById('status');
    const resumeBtn = document.getElementById('resumeAudio');
    const playSelectionBtn = document.getElementById('playSelection');
    const loadAllBtn = document.getElementById('loadAll');
    const globalStatus = document.getElementById('globalStatus');
    const midiEnableBtn = document.getElementById('midiEnable');
    const midiInputSel = document.getElementById('midiInput');
    const midiStatus = document.getElementById('midiStatus');
    const padsRoot = document.getElementById('pads');
    const waveCanvas = document.getElementById('waveCanvas');
    const waveOverlay = document.getElementById('waveOverlay');
    const canvasWrapper = waveCanvas.parentElement;

    const wf = new WaveformDrawer();
    const tr = new TrimbarsDrawer(waveOverlay, 100, 300);
    const engine = new SamplerEngine(ctx);
    // route audio
    try { engine.routeOnce(ctx.destination); } catch { /* ignore */ }
    const sounds = [];
    // MIDI
    const midi = new MidiManager();

    resumeBtn.onclick = async () => { if (ctx.state === 'suspended') await ctx.resume(); };

    await detectApiBase();

    // pad font
    document.documentElement.style.setProperty('--pad-font', "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace");


    async function fetchPresets() {
        const r = await fetch(`${API_BASE}/api/presets`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.json();
    }
    function soundsFromPreset(p) {
        const saved = loadAllTrims();
        return (p.samples || [])
            .filter(s => s && s.url)
            .map(s => {
                const url = resolveUrl(s.url);
                const snd = new Sound(url, s.name);
                if (saved[url] && typeof saved[url].left === 'number' && typeof saved[url].right === 'number') {
                    snd.trim.left = Math.max(0, Math.min(1, saved[url].left));
                    snd.trim.right = Math.max(0, Math.min(1, saved[url].right));
                }
                return snd;
            });
    }

    let gui = null;
    let currentIndex = -1;
    let currentBuffer = null;

    function syncCanvasSizeAndRedraw() {
        if (!canvasWrapper) return;

        const targetW = Math.max(1, Math.floor(canvasWrapper.clientWidth));
        const targetH = waveCanvas.height; // keep attribute height

        if (waveCanvas.width !== targetW) waveCanvas.width = targetW;
        if (waveOverlay.width !== targetW) waveOverlay.width = targetW;
        if (waveOverlay.height !== targetH) waveOverlay.height = targetH;

        if (currentBuffer) {
            wf.clearCanvas();
            wf.init(currentBuffer, waveCanvas, '#6EC8FF');
            wf.drawWave(0, waveCanvas.height);
        }
    }
    async function buildFromPreset(p) {
        status.textContent = `Loading "${p.name}"...`;
        const list = soundsFromPreset(p);
        // build GUI (show progress per pad)
        gui = new SamplerGUI(padsRoot, waveCanvas, waveOverlay, tr, (i) => {
            gui.selectPad(i);
            const buf = sounds[i].buffer;
            if (!buf) return;
            currentIndex = i;
            currentBuffer = buf;
            syncCanvasSizeAndRedraw();
            tr.left = sounds[i].trim.left; tr.right = sounds[i].trim.right;
            const { start, duration } = gui.currentSelection(buf);
            sounds[i].trim = { left: tr.left, right: tr.right };
            // save trim
            saveTrimForUrl(sounds[i].url, tr.left, tr.right);
            engine.play(i, start, duration);
        });
        gui.buildPads(list);
        // load with progress
        sounds.splice(0, sounds.length, ...list);
        const results = await Promise.allSettled(list.map(async (s, idx) => {
            try {
                gui.setBusy(idx, true); gui.setProgress(idx, 0);
                s.buffer = await loadBuffer(s.url, ctx, p => gui.setProgress(idx, p));
                s.ready = !!s.buffer;
                if (s.ready) gui.setReady(idx, true);
                return s;
            } catch (e) {
                gui.setBusy(idx, false); gui.setProgress(idx, 0);
                throw e;
            }
        }));
        const ok = results.filter(r => r.status === 'fulfilled').length;
        engine.setBuffers(sounds.map(s => s.buffer));
        status.textContent = ok ? `Preset "${p.name}" ready (${ok}/${list.length})` : `Preset "${p.name}" has no decodable samples`;
        // auto-select first decoded buffer for visible waveform
        const firstIdx = sounds.findIndex(s => !!s.buffer);
        if (firstIdx >= 0) {
            gui.selectPad(firstIdx);
            currentIndex = firstIdx;
            currentBuffer = sounds[firstIdx].buffer;
            syncCanvasSizeAndRedraw();
            tr.left = sounds[firstIdx].trim.left; tr.right = sounds[firstIdx].trim.right;
        } else {
            // still sync sizes for first click
            syncCanvasSizeAndRedraw();
        }
    }
    // initial clear
    wf.clearCanvas();

    // play selection
    playSelectionBtn.onclick = () => {
        const active = padsRoot.querySelector('.pad.active');
        if (!active) return;
        const idx = [...padsRoot.querySelectorAll('.pad')].indexOf(active);
        if (idx < 0 || !sounds[idx] || !sounds[idx].buffer) return;
        const { start, duration } = gui.currentSelection(sounds[idx].buffer);
        engine.play(idx, start, duration);
    };

    // presets
    try {
        const presets = await fetchPresets();
        presetSelect.innerHTML = '';
        presets.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            if (idx === 0) opt.selected = true;
            presetSelect.appendChild(opt);
        });
        await buildFromPreset(presets[0]);
        presetSelect.onchange = async () => {
            const p = presets.find(x => x.name === presetSelect.value);
            if (p) await buildFromPreset(p);
        };
    } catch (e) {
        status.textContent = 'API unavailable; please start server in Seance2/ExampleRESTEndpointCorrige';
    }

    // overlay draw loop
    function animate() {
        tr.clear();
        tr.draw();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // resize-aware redraw
    if ('ResizeObserver' in window && canvasWrapper) {
        const ro = new ResizeObserver(() => { syncCanvasSizeAndRedraw(); });
        ro.observe(canvasWrapper);
    } else {
        window.addEventListener('resize', syncCanvasSizeAndRedraw);
    }

    // load all samples
    loadAllBtn.onclick = async () => {
        if (!sounds.length) return;
        loadAllBtn.disabled = true; globalStatus.textContent = 'Loading…';
        const results = await Promise.allSettled(sounds.map(async (s, i) => {
            if (s.buffer) return s;
            try {
                gui.setBusy(i, true); gui.setProgress(i, 0);
                s.buffer = await loadBuffer(s.url, ctx, p => gui.setProgress(i, p));
                s.ready = !!s.buffer; if (s.ready && gui) gui.setReady(i, true);
                return s;
            } finally {
                gui.setBusy(i, false);
            }
        }));
        const ok = results.filter(r => r.status === 'fulfilled').length;
        globalStatus.textContent = `Done (${ok}/${sounds.length})`;
        setTimeout(() => { globalStatus.textContent = ''; loadAllBtn.disabled = false; }, 1200);
    };

    // save trims on mouseup
    window.addEventListener('mouseup', () => {
        if (currentIndex >= 0 && sounds[currentIndex]) {
            sounds[currentIndex].trim = { left: tr.left, right: tr.right };
            saveTrimForUrl(sounds[currentIndex].url, tr.left, tr.right);
        }
    });

    // MIDI mapping C2→pads
    const BASE_NOTE = 36; // C2
    const ORDER = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];

    function populateMidiInputs() {
        const selected = midiInputSel.value;
        midiInputSel.innerHTML = '';
        const inputs = midi.getInputs();
        if (!inputs.length) { midiInputSel.innerHTML = '<option>(none)</option>'; midiInputSel.disabled = true; return; }
        for (const i of inputs) { const opt = document.createElement('option'); opt.value = i.id; opt.textContent = i.name; midiInputSel.appendChild(opt); }
        const toSel = Array.from(midiInputSel.options).find(o => o.value === selected) || midiInputSel.options[0];
        if (toSel) toSel.selected = true;
        if (toSel) { midi.selectInput(toSel.value); midiStatus.textContent = `Input: ${toSel.textContent} (C2→pads)`; }
        midiInputSel.disabled = false;
    }

    midi.on('statechange', populateMidiInputs);

    midi.on('noteon', ({ note, velocity }) => {
        const off = note - BASE_NOTE;
        if (off < 0 || off > 15) return;
        const padIndex = ORDER[off];
        const btn = padsRoot.querySelectorAll('.pad')[padIndex];
        if (btn) btn.click();
    });

    midiEnableBtn.onclick = async () => {
        try {
            await midi.enable();
            midiStatus.textContent = 'MIDI enabled';
            populateMidiInputs();
        } catch (e) {
            midiStatus.textContent = (e && e.message) ? e.message : 'MIDI access failed';
        }
    };

    midiInputSel.addEventListener('change', () => {
        const id = midiInputSel.value;
        midi.selectInput(id);
        const opt = midiInputSel.selectedOptions[0];
        if (opt) midiStatus.textContent = `Input: ${opt.textContent} (C2→pads)`;
    });
});
