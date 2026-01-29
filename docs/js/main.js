import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import { SamplerEngine } from './samplerEngine.js';
import { SamplerGUI } from './samplerGUI.js';
import { MidiManager } from './midi.js';


const API_BASE = 'https://webaudio-22k9.onrender.com';

function resolveUrl(u) {
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/presets/')) return API_BASE + encodeURI(u);
    const t = u.replace(/^\.\//, '');
    return `${API_BASE}/presets/${encodeURI(t)}`;
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

    const recordBtn = document.getElementById('recordBtn');
    let _mediaStream = null;
    let _mediaRecorder = null;

    async function stopAndProcessRecording(chunks) {
        try {
            const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
            const ab = await blob.arrayBuffer();
            const decoded = await ctx.decodeAudioData(ab);
            const url = URL.createObjectURL(blob);
            if (currentIndex >= 0 && sounds[currentIndex]) {
                sounds[currentIndex].buffer = decoded;
                sounds[currentIndex].ready = true;
                sounds[currentIndex].blob = blob;
                sounds[currentIndex].url = url;
                sounds[currentIndex].name = sounds[currentIndex].name || 'Mic recording';
                engine.setBuffers(sounds.map(s => s.buffer));
                if (gui) {
                    gui.setReady(currentIndex, true);
                    gui.setProgress(currentIndex, 1);
                    gui.selectPad(currentIndex);
                }
                status.textContent = 'Recording saved to selected pad';
            } else {
                const snd = new Sound(url, 'Mic recording');
                snd.buffer = decoded; snd.ready = true; snd.blob = blob;
                sounds.push(snd);
                engine.setBuffers(sounds.map(s => s.buffer));
                if (gui) {
                    gui.buildPads(sounds);
                    const newIndex = sounds.length - 1;
                    gui.selectPad(newIndex);
                    gui.setReady(newIndex, true);
                }
                status.textContent = 'Recording added as new pad';
            }
        } catch (e) {
            status.textContent = 'Failed to process recording';
        }
    }

    if (recordBtn) {
        recordBtn.onclick = async () => {
            if (_mediaRecorder && _mediaRecorder.state === 'recording') {
                _mediaRecorder.stop();
                recordBtn.textContent = 'Record to Pad';
                return;
            }
            try {
                _mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (e) {
                status.textContent = 'Microphone access denied';
                return;
            }
            const chunks = [];
            try {
                _mediaRecorder = new MediaRecorder(_mediaStream);
            } catch (e) {
                status.textContent = 'Recording not supported in this browser';
                _mediaStream.getTracks().forEach(t => t.stop());
                _mediaStream = null;
                return;
            }
            _mediaRecorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
            _mediaRecorder.onstop = async () => {
                await stopAndProcessRecording(chunks);
                if (_mediaStream) _mediaStream.getTracks().forEach(t => t.stop());
                _mediaStream = null; _mediaRecorder = null;
            };
            _mediaRecorder.start();
            recordBtn.textContent = 'Stop Recording';
            status.textContent = 'Recording…';
        };
    }

    // Save preset flow
    const saveBtn = document.getElementById('savePresetBtn');
    function slugify(s) {
        return (s || '').toString().normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)+/g, '').toLowerCase();
    }

    async function uploadBlobs(folder, blobs) {
        // blobs: [{ blob, filename }]
        const fd = new FormData();
        for (const b of blobs) fd.append('files', b.blob, b.filename);
        const res = await fetch(`${API_BASE}/api/upload/${encodeURIComponent(folder)}`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        return await res.json(); // { uploaded, files: [ { originalName, storedName, size, url } ] }
    }

    if (saveBtn) {
        saveBtn.onclick = async () => {
            const name = (prompt('Enter a name for the new preset') || '').trim();
            if (!name) return;
            saveBtn.disabled = true; globalStatus.textContent = 'Saving…';
            try {
                const folder = slugify(name) || 'preset';
                // Build blobs list with index so we can replace urls after upload
                const blobs = [];
                const samples = Array.from({ length: sounds.length }, (_, i) => ({ name: sounds[i]?.name || `sample${i}`, url: sounds[i]?.url }));
                for (let i = 0; i < sounds.length; i++) {
                    const s = sounds[i];
                    if (s && s.blob) {
                        const sampleName = s.name || `sample${i}`;
                        const filename = `${i}-${sampleName.replace(/[^a-z0-9\.\-]/gi, '_')}.webm`;
                        blobs.push({ index: i, blob: s.blob, filename });
                        // placeholder url; will replace after upload
                        samples[i] = { name: sampleName, url: `/presets/${folder}/${filename}` };
                    }
                }

                // upload blobs if any and patch sample URLs from server response
                if (blobs.length) {
                    const uploadRes = await uploadBlobs(folder, blobs);
                    if (uploadRes && Array.isArray(uploadRes.files)) {
                        const map = new Map(uploadRes.files.map(f => [f.storedName, f.url]));
                        for (const b of blobs) {
                            const stored = map.get(b.filename);
                            if (stored) samples[b.index].url = stored;
                        }
                    }
                }

                const preset = {
                    name,
                    type: 'sampler',
                    isFactoryPresets: false,
                    samples
                };

                const r = await fetch(`${API_BASE}/api/presets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preset) });
                if (r.status === 201) {
                    globalStatus.textContent = 'Preset saved successfully';
                    try {
                        const newPresets = await fetchPresets();
                        presetSelect.innerHTML = '';
                        newPresets.forEach((p, idx) => {
                            const opt = document.createElement('option');
                            opt.value = p.name; opt.textContent = p.name; if (idx === 0) opt.selected = true;
                            presetSelect.appendChild(opt);
                        });
                        presetSelect.value = name;
                        if (deleteBtnElem) deleteBtnElem.disabled = isProtectedPreset(name);
                        const sel = newPresets.find(x => x.name === name);
                        if (sel) await buildFromPreset(sel);
                    } catch (e) {
                        console.error('refresh after save failed', e);
                    }
                } else if (r.status === 409) {
                    // prompt to overwrite
                    const overwrite = confirm('A preset with this name already exists. Overwrite it?');
                    if (overwrite) {
                        const putRes = await fetch(`${API_BASE}/api/presets/${encodeURIComponent(name)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preset) });
                        if (putRes.ok) {
                            globalStatus.textContent = 'Preset overwritten successfully';
                            try {
                                const newPresets = await fetchPresets();
                                presetSelect.innerHTML = '';
                                newPresets.forEach((p, idx) => {
                                    const opt = document.createElement('option');
                                    opt.value = p.name; opt.textContent = p.name; if (idx === 0) opt.selected = true;
                                    presetSelect.appendChild(opt);
                                });
                                presetSelect.value = name;
                                if (deleteBtnElem) deleteBtnElem.disabled = isProtectedPreset(name);
                                const sel = newPresets.find(x => x.name === name);
                                if (sel) await buildFromPreset(sel);
                            } catch (e) {
                                console.error('refresh after overwrite failed', e);
                            }
                        } else {
                            const txt = await putRes.text();
                            globalStatus.textContent = 'Failed to overwrite preset: ' + txt;
                        }
                    } else {
                        globalStatus.textContent = 'Preset not saved (name exists)';
                    }
                } else {
                    const txt = await r.text();
                    globalStatus.textContent = 'Failed to save preset: ' + txt;
                }
            } catch (e) {
                globalStatus.textContent = 'Save failed: ' + (e && e.message ? e.message : e);
            } finally {
                saveBtn.disabled = false; setTimeout(() => { globalStatus.textContent = ''; }, 2000);
            }
        };
    }

    // Delete preset
    const deleteBtn = document.getElementById('deletePresetBtn');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            const name = presetSelect.value;
                if (!name) return;
                
            const ok = confirm(`Delete preset "${name}"? This cannot be undone.`);
            if (!ok) return;
            deleteBtn.disabled = true; globalStatus.textContent = 'Deleting...';
            try {
                const res = await fetch(`${API_BASE}/api/presets/${encodeURIComponent(name)}`, { method: 'DELETE' });
                if (res.status === 204 || res.ok) {
                    globalStatus.textContent = 'Preset deleted';
                    // refresh presets list and UI
                    try {
                        const newPresets = await fetchPresets();
                        presetSelect.innerHTML = '';
                        newPresets.forEach((p, idx) => {
                            const opt = document.createElement('option');
                            opt.value = p.name; opt.textContent = p.name; if (idx === 0) opt.selected = true;
                            presetSelect.appendChild(opt);
                        });
                        if (deleteBtnElem) deleteBtnElem.disabled = initialPresetNames.has(presetSelect.value);
                        if (newPresets.length) {
                            await buildFromPreset(newPresets[0]);
                        } else {
                            // clear UI
                            sounds.splice(0, sounds.length);
                            engine.setBuffers([]);
                            if (gui) gui.buildPads([]);
                            wf.clearCanvas(); status.textContent = '';
                        }
                    } catch (e) {
                        console.error('refresh after delete failed', e);
                    }
                } else {
                    const txt = await res.text();
                    globalStatus.textContent = 'Delete failed: ' + txt;
                }
            } catch (e) {
                globalStatus.textContent = 'Delete failed: ' + (e && e.message ? e.message : e);
            } finally {
                deleteBtn.disabled = false; setTimeout(() => { globalStatus.textContent = ''; }, 2000);
            }
        };
    }

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
