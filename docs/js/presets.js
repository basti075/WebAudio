import { API_BASE, fetchPresets, uploadBlobs } from './api.js';

export function attachPresetControls({ saveBtn, deleteBtn, presetSelect, getSounds, getGui, buildFromPreset, isProtectedPreset, statusElem, globalStatus, engine }) {
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const name = (prompt('Enter a name for the new preset') || '').trim();
            if (!name) return;
            saveBtn.disabled = true; globalStatus.textContent = 'Saving…';
            try {
                const sounds = getSounds();
                const folder = (name || '').toString().normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)+/g, '').toLowerCase() || 'preset';
                const blobs = [];
                const samples = Array.from({ length: sounds.length }, (_, i) => ({ name: sounds[i]?.name || `sample${i}`, url: sounds[i]?.url }));
                for (let i = 0; i < sounds.length; i++) {
                    const s = sounds[i];
                    if (s && s.blob) {
                        const sampleName = s.name || `sample${i}`;
                        const filename = `${i}-${sampleName.replace(/[^a-z0-9\.\-]/gi, '_')}.webm`;
                        blobs.push({ index: i, blob: s.blob, filename });
                        samples[i] = { name: sampleName, url: `/presets/${folder}/${filename}` };
                    }
                }
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
                const preset = { name, type: 'sampler', isFactoryPresets: false, samples };
                const r = await fetch(`${API_BASE}/api/presets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preset) });
                if (r.status === 201) {
                    globalStatus.textContent = 'Preset saved successfully';
                    try {
                        const newPresets = await fetchPresets();
                        presetSelect.innerHTML = '';
                        newPresets.forEach((p, idx) => {
                            const opt = document.createElement('option'); opt.value = p.name; opt.textContent = p.name; if (idx === 0) opt.selected = true; presetSelect.appendChild(opt);
                        });
                        presetSelect.value = name;
                        if (deleteBtn) deleteBtn.disabled = isProtectedPreset(name);
                        const sel = newPresets.find(x => x.name === name);
                        if (sel) await buildFromPreset(sel);
                    } catch (e) { console.error('refresh after save failed', e); }
                } else if (r.status === 409) {
                    const overwrite = confirm('A preset with this name already exists. Overwrite it?');
                    if (overwrite) {
                        const putRes = await fetch(`${API_BASE}/api/presets/${encodeURIComponent(name)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preset) });
                        if (putRes.ok) {
                            globalStatus.textContent = 'Preset overwritten successfully';
                            try {
                                const newPresets = await fetchPresets();
                                presetSelect.innerHTML = '';
                                newPresets.forEach((p, idx) => {
                                    const opt = document.createElement('option'); opt.value = p.name; opt.textContent = p.name; if (idx === 0) opt.selected = true; presetSelect.appendChild(opt);
                                });
                                presetSelect.value = name;
                                if (deleteBtn) deleteBtn.disabled = isProtectedPreset(name);
                                const sel = newPresets.find(x => x.name === name);
                                if (sel) await buildFromPreset(sel);
                            } catch (e) { console.error('refresh after overwrite failed', e); }
                        } else {
                            const txt = await putRes.text(); globalStatus.textContent = 'Failed to overwrite preset: ' + txt;
                        }
                    } else {
                        globalStatus.textContent = 'Preset not saved (name exists)';
                    }
                } else {
                    const txt = await r.text(); globalStatus.textContent = 'Failed to save preset: ' + txt;
                }
            } catch (e) {
                globalStatus.textContent = 'Save failed: ' + (e && e.message ? e.message : e);
            } finally { saveBtn.disabled = false; setTimeout(() => { globalStatus.textContent = ''; }, 2000); }
        };
    }

    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            const name = presetSelect.value; if (!name) return;
            if (isProtectedPreset(name)) { alert('This preset is protected and cannot be deleted.'); return; }
            const ok = confirm(`Delete preset "${name}"? This cannot be undone.`);
            if (!ok) return;
            deleteBtn.disabled = true; globalStatus.textContent = 'Deleting...';
            try {
                const res = await fetch(`${API_BASE}/api/presets/${encodeURIComponent(name)}`, { method: 'DELETE' });
                if (res.status === 204 || res.ok) {
                    globalStatus.textContent = 'Preset deleted';
                    try {
                        const newPresets = await fetchPresets();
                        presetSelect.innerHTML = '';
                        newPresets.forEach((p, idx) => { const opt = document.createElement('option'); opt.value = p.name; opt.textContent = p.name; if (idx === 0) opt.selected = true; presetSelect.appendChild(opt); });
                        if (deleteBtn) deleteBtn.disabled = isProtectedPreset(presetSelect.value);
                        if (newPresets.length) { await buildFromPreset(newPresets[0]); } else {
                            const sounds = getSounds(); sounds.splice(0, sounds.length); engine.setBuffers([]); if (getGui()) getGui().buildPads([]);
                        }
                    } catch (e) { console.error('refresh after delete failed', e); }
                } else { const txt = await res.text(); globalStatus.textContent = 'Delete failed: ' + txt; }
            } catch (e) { globalStatus.textContent = 'Delete failed: ' + (e && e.message ? e.message : e); }
            finally { deleteBtn.disabled = false; setTimeout(() => { globalStatus.textContent = ''; }, 2000); }
        };
    }
}
