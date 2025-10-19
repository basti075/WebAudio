import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import { SamplerEngine } from './samplerEngine.js';
import { SamplerGUI } from './samplerGUI.js';

// API auto-detection for local dev server
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
            // ignore, try next candidate
        }
    }
}

async function loadBuffer(url, ctx) {
    const res = await fetch(url);
    const ab = await res.arrayBuffer();
    return await ctx.decodeAudioData(ab);
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

// Persist trims per sample URL
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
    // Route engine to destination (WAM removed)
    try { engine.routeOnce(ctx.destination); } catch { /* ignore */ }
    const sounds = [];
    // MIDI state
    let midiAccess = null, currentMidiInput = null;

    resumeBtn.onclick = async () => { if (ctx.state === 'suspended') await ctx.resume(); };

    await detectApiBase();

    // WAM removed: engine outputs directly to destination

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
        const results = await Promise.allSettled(list.map(async (s, idx) => {
            s.buffer = await loadBuffer(s.url, ctx);
            s.ready = !!s.buffer;
            if (s.ready && gui) gui.setReady(idx, true);
            return s;
        }));
        const ok = results.filter(r => r.status === 'fulfilled').length;
        sounds.splice(0, sounds.length, ...list.filter(s => s.ready));
        engine.setBuffers(sounds.map(s => s.buffer));
        status.textContent = ok ? `Preset "${p.name}" ready (${ok}/${list.length})` : `Preset "${p.name}" has no decodable samples`;

        // GUI
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
            // persist trim for this sample URL
            saveTrimForUrl(sounds[i].url, tr.left, tr.right);
            engine.play(i, start, duration);
        });
        gui.buildPads(sounds);
        // Mark pads that already decoded
        sounds.forEach((s, i) => { if (s.buffer) gui.setReady(i, true); });
        // If we have at least one decoded buffer, auto-select and draw it so the waveform is visible immediately
        const firstIdx = sounds.findIndex(s => !!s.buffer);
        if (firstIdx >= 0) {
            gui.selectPad(firstIdx);
            currentIndex = firstIdx;
            currentBuffer = sounds[firstIdx].buffer;
            syncCanvasSizeAndRedraw();
            tr.left = sounds[firstIdx].trim.left; tr.right = sounds[firstIdx].trim.right;
        } else {
            // Still sync sizes to be ready for the first click
            syncCanvasSizeAndRedraw();
        }
    }
    // Initial clear; actual drawing happens after first buffer is available
    wf.clearCanvas();

    // hook play selection
    playSelectionBtn.onclick = () => {
        const active = padsRoot.querySelector('.pad.active');
        if (!active) return;
        const idx = [...padsRoot.querySelectorAll('.pad')].indexOf(active);
        if (idx < 0 || !sounds[idx] || !sounds[idx].buffer) return;
        const { start, duration } = gui.currentSelection(sounds[idx].buffer);
        engine.play(idx, start, duration);
    };

    // presets dropdown
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

    // overlay animation
    function animate() {
        tr.clear();
        tr.draw();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // Redraw waveform when the wrapper resizes for accurate peaks with responsive canvas
    if ('ResizeObserver' in window && canvasWrapper) {
        const ro = new ResizeObserver(() => { syncCanvasSizeAndRedraw(); });
        ro.observe(canvasWrapper);
    } else {
        window.addEventListener('resize', syncCanvasSizeAndRedraw);
    }

    // Load All button: decode all sounds in current preset
    loadAllBtn.onclick = async () => {
        if (!sounds.length) return;
        loadAllBtn.disabled = true; globalStatus.textContent = 'Loading…';
        const results = await Promise.allSettled(sounds.map(async (s, i) => { if (s.buffer) return s; s.buffer = await loadBuffer(s.url, ctx); s.ready = !!s.buffer; if (s.ready && gui) gui.setReady(i, true); return s; }));
        const ok = results.filter(r => r.status === 'fulfilled').length;
        globalStatus.textContent = `Done (${ok}/${sounds.length})`;
        setTimeout(() => { globalStatus.textContent = ''; loadAllBtn.disabled = false; }, 1200);
    };

    // Persist trims after user finishes dragging (on mouseup)
    window.addEventListener('mouseup', () => {
        if (currentIndex >= 0 && sounds[currentIndex]) {
            sounds[currentIndex].trim = { left: tr.left, right: tr.right };
            saveTrimForUrl(sounds[currentIndex].url, tr.left, tr.right);
        }
    });

    // MIDI enable + selection
    midiEnableBtn.onclick = async () => {
        if (!('requestMIDIAccess' in navigator)) { midiStatus.textContent = 'Web MIDI not supported'; return; }
        try {
            midiAccess = await navigator.requestMIDIAccess();
            midiStatus.textContent = 'MIDI enabled';
            populateMidiInputs();
            midiInputSel.disabled = false;
            midiAccess.onstatechange = populateMidiInputs;
        } catch { midiStatus.textContent = 'MIDI access denied'; }
    };

    function populateMidiInputs() {
        const selected = midiInputSel.value;
        midiInputSel.innerHTML = '';
        if (!midiAccess) return;
        const inputs = Array.from(midiAccess.inputs.values());
        if (!inputs.length) { midiInputSel.innerHTML = '<option>(none)</option>'; midiInputSel.disabled = true; return; }
        for (const input of inputs) { const opt = document.createElement('option'); opt.value = input.id; opt.textContent = input.name || input.id; midiInputSel.appendChild(opt); }
        const toSel = Array.from(midiInputSel.options).find(o => o.value === selected) || midiInputSel.options[0];
        if (toSel) toSel.selected = true;
        bindSelectedMidiInput();
    }

    midiInputSel.addEventListener('change', bindSelectedMidiInput);
    const BASE_NOTE = 36; // C2
    const ORDER = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];
    function bindSelectedMidiInput() {
        if (!midiAccess) return;
        if (currentMidiInput) currentMidiInput.onmidimessage = null;
        const id = midiInputSel.value;
        const input = Array.from(midiAccess.inputs.values()).find(i => i.id === id);
        if (!input) { midiStatus.textContent = 'MIDI input not found'; return; }
        input.onmidimessage = (ev) => {
            const [status, note, velocity] = ev.data; const cmd = status & 0xf0;
            if (cmd === 0x90 && velocity > 0) { const off = note - BASE_NOTE; if (off < 0 || off > 15) return; const padIndex = ORDER[off]; const btn = padsRoot.querySelectorAll('.pad')[padIndex]; if (btn) btn.click(); }
        };
        currentMidiInput = input;
        midiStatus.textContent = `Input: ${input.name || input.id} (C2→pads)`;
    }
});
