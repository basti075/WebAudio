export const API_BASE = 'https://webaudio-22k9.onrender.com';

export function resolveUrl(u) {
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/presets/')) return API_BASE + encodeURI(u);
    const t = u.replace(/^\.\//, '');
    return `${API_BASE}/presets/${encodeURI(t)}`;
}

export async function downloadArrayBufferWithProgress(url, onProgress) {
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

export async function loadBuffer(url, ctx, onProgress) {
    const ab = await downloadArrayBufferWithProgress(url, p => onProgress && onProgress(Math.max(0, Math.min(0.9, p * 0.9))));
    onProgress && onProgress(0.95);
    const decoded = await ctx.decodeAudioData(ab);
    onProgress && onProgress(1);
    return decoded;
}

export async function fetchPresets() {
    const r = await fetch(`${API_BASE}/api/presets`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
}

export async function uploadBlobs(folder, blobs) {
    const fd = new FormData();
    for (const b of blobs) fd.append('files', b.blob, b.filename);
    const res = await fetch(`${API_BASE}/api/upload/${encodeURIComponent(folder)}`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    return await res.json();
}
