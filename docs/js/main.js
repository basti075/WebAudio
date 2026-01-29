import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import { SamplerEngine } from './samplerEngine.js';
import { SamplerGUI } from './samplerGUI.js';
import { MidiManager } from './midi.js';
import { API_BASE, resolveUrl, downloadArrayBufferWithProgress, loadBuffer, fetchPresets, uploadBlobs } from './api.js';
import { attachRecorder } from './recorder.js';
import { attachPresetControls } from './presets.js';

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
    const deleteBtnElem = document.getElementById('deletePresetBtn');
    let initialPresetNames = new Set();
    // Protected preset names: these should NOT be deletable.
    const PROTECTED_PRESET_NAMES = ['808', 'Basic Kit', 'Steveland Vinyl', 'Electronic', 'Hip-Hop'];
    function normalizePresetName(n) { return (n || '').toString().toLowerCase().replace(/[-\s]+/g, ' ').trim(); }
    const protectedPresetSet = new Set(PROTECTED_PRESET_NAMES.map(normalizePresetName));
    function isProtectedPreset(name) { return protectedPresetSet.has(normalizePresetName(name)); }
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

    // Headless mode detection for automated testing: use ?headless=1 or #headless
    const urlp = new URLSearchParams(window.location.search);
    const headlessMode = urlp.get('headless') === '1' || urlp.get('headless') === 'true' || window.location.hash === '#headless';

    resumeBtn.onclick = async () => { if (ctx.state === 'suspended') await ctx.resume(); };



    // pad font
    document.documentElement.style.setProperty('--pad-font', "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace");


    // fetchPresets provided by ./api.mjs
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

    const recordBtn = document.getElementById('recordBtn');

    // Preset save/delete provided by ./presets.mjs

    const deleteBtn = document.getElementById('deletePresetBtn');

    // Attach recorder and preset handlers (use getters so they see updated `gui` and `sounds`).
    attachRecorder({ recordBtn, getCtx: () => ctx, getSounds: () => sounds, getGui: () => gui, getCurrentIndex: () => currentIndex, engine, status });
    attachPresetControls({ saveBtn: document.getElementById('savePresetBtn'), deleteBtn, presetSelect, getSounds: () => sounds, getGui: () => gui, buildFromPreset, isProtectedPreset, statusElem: status, globalStatus, engine });

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
        // If running headless, skip GUI creation and DOM updates.
        if (headlessMode) {
            try {
                // hide entire UI
                document.body.style.display = 'none';
            } catch (e) { /* ignore */ }
            // load into sounds array and decode buffers without GUI progress
            sounds.splice(0, sounds.length, ...list);
            const results = await Promise.allSettled(list.map(async (s) => {
                try {
                    s.buffer = await loadBuffer(s.url, ctx, () => {});
                    s.ready = !!s.buffer;
                    return s;
                } catch (e) {
                    return s;
                }
            }));
            engine.setBuffers(sounds.map(s => s.buffer));
            const okCount = results.filter(r => r.status === 'fulfilled').length;
            status.textContent = `Preset "${p.name}" loaded (${okCount}/${list.length})`;
            // signal headless completion so external test runners can detect success
            try {
                const out = { preset: p.name, loaded: okCount, total: list.length };
                console.log('HEADLESS_DONE', out);
                window.__HEADLESS_RESULT = out;
                window.dispatchEvent(new CustomEvent('headless:done', { detail: out }));
            } catch (e) { /* ignore */ }
            return;
        }

        // build GUI
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

        // capture the list of presets that exist now (kept for reference)
        initialPresetNames = new Set(presets.map(p => p.name));

        presets.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            if (idx === 0) opt.selected = true;
            presetSelect.appendChild(opt);
        });

        // disable delete for protected preset names
        if (deleteBtnElem) deleteBtnElem.disabled = isProtectedPreset(presets[0]?.name);

        await buildFromPreset(presets[0]);
        // If running in headless mode, hide UI and run a non-interactive load of all samples.
        if (headlessMode) {
            try {
                const toolbar = document.querySelector('.toolbar'); if (toolbar) toolbar.style.display = 'none';
                const h1 = document.querySelector('h1'); if (h1) h1.style.display = 'none';
                // ensure audio resumed
                if (ctx.state === 'suspended') await ctx.resume();
                // reuse the same load-all routine
                if (typeof loadAllBtn.onclick === 'function') {
                    await loadAllBtn.onclick();
                } else {
                    // fallback: manually load buffers
                    await (async () => {
                        const results = await Promise.allSettled(sounds.map(async (s, i) => {
                            if (s.buffer) return s;
                            try { s.buffer = await loadBuffer(s.url, ctx, p => {}); s.ready = !!s.buffer; return s; }
                            catch { return s; }
                        }));
                        engine.setBuffers(sounds.map(s => s.buffer));
                    })();
                }
                const loaded = sounds.filter(s => !!s.buffer).length;
                const total = sounds.length;
                const out = { presets: presets.length, preset: presets[0].name, loaded, total };
                console.log('HEADLESS_DONE', out);
                window.__HEADLESS_RESULT = out;
                window.dispatchEvent(new CustomEvent('headless:done', { detail: out }));
            } catch (e) {
                console.error('HEADLESS_ERROR', e);
                window.__HEADLESS_ERROR = e && e.message ? e.message : String(e);
            }
        }
        presetSelect.onchange = async () => {
            const p = presets.find(x => x.name === presetSelect.value);
            if (deleteBtnElem) deleteBtnElem.disabled = isProtectedPreset(presetSelect.value);
            if (p) await buildFromPreset(p);
        };
    } catch (e) {
        console.error('fetchPresets failed', e);
        status.textContent = 'API unavailable: ' + (e && e.message ? e.message : String(e));
        if (globalStatus) globalStatus.textContent = 'See console for details';
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
