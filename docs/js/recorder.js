// recorder.js
export function attachRecorder({ recordBtn, getCtx, getSounds, getGui, getCurrentIndex, engine, status }) {
    if (!recordBtn) return;
    let _mediaStream = null;
    let _mediaRecorder = null;

    async function stopAndProcessRecording(chunks) {
        try {
            const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
            const ab = await blob.arrayBuffer();
            const decoded = await getCtx().decodeAudioData(ab);
            const url = URL.createObjectURL(blob);
            const sounds = getSounds();
            const gui = getGui();
            const currentIndex = typeof getCurrentIndex === 'function' ? getCurrentIndex() : undefined;
            // if a pad is selected (currentIndex >=0) overwrite it, otherwise append
            if (typeof currentIndex === 'number' && currentIndex >= 0 && sounds[currentIndex]) {
                sounds[currentIndex].buffer = decoded;
                sounds[currentIndex].ready = true;
                sounds[currentIndex].blob = blob;
                sounds[currentIndex].url = url;
                sounds[currentIndex].name = sounds[currentIndex].name || 'Mic recording';
                engine.setBuffers(sounds.map(s => s.buffer));
                if (gui) { gui.setReady(currentIndex, true); gui.setProgress(currentIndex, 1); gui.selectPad(currentIndex); }
                status.textContent = 'Recording saved to selected pad';
            } else {
                const snd = { url, name: 'Mic recording', buffer: decoded, ready: true, blob };
                sounds.push(snd);
                engine.setBuffers(sounds.map(s => s.buffer));
                if (gui) { gui.buildPads(sounds); const newIndex = sounds.length - 1; gui.selectPad(newIndex); gui.setReady(newIndex, true); }
                status.textContent = 'Recording added as new pad';
            }
        } catch (e) {
            status.textContent = 'Failed to process recording';
        }
    }

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
