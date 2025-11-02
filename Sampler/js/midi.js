// MIDI manager: enable/select inputs and emit note events

export class MidiManager {
    constructor() {
        this.access = null;
        this.input = null;
        this.listeners = { noteon: [], noteoff: [], statechange: [] };
        this.pressed = new Set(); // track held notes
    }

    static isSupported() {
        return 'requestMIDIAccess' in navigator;
    }

    static isSecure() {
        return window.isSecureContext === true;
    }

    static explainError(err) {
        if (!MidiManager.isSupported()) return 'Web MIDI not supported (use Chrome/Edge)';
        if (!MidiManager.isSecure()) return 'Blocked: open via http(s) or http://localhost (not file://)';
        if (err && err.name === 'SecurityError') return 'Blocked by browser security policy for this context';
        if (err && err.name === 'NotAllowedError') return 'Permission denied. Allow MIDI devices in site permissions';
        return 'MIDI access failed';
    }

    async enable() {
        if (!MidiManager.isSupported()) throw new Error('unsupported');
        if (!MidiManager.isSecure()) throw new Error('insecure');
        try {
            this.access = await navigator.requestMIDIAccess();
            // device hot-plug
            this.access.onstatechange = () => this._emit('statechange');
            return this.access;
        } catch (e) {
            const msg = MidiManager.explainError(e);
            const err = new Error(msg);
            err.cause = e;
            throw err;
        }
    }

    getInputs() {
        if (!this.access) return [];
        return Array.from(this.access.inputs.values()).map(i => ({ id: i.id, name: i.name || i.id }));
    }

    selectInput(id) {
        if (!this.access) return;
        if (this.input) this.input.onmidimessage = null;
        const input = Array.from(this.access.inputs.values()).find(i => i.id === id);
        if (!input) { this.input = null; return; }
        input.onmidimessage = (ev) => this._handleMessage(ev);
        this.input = input;
    }

    on(type, cb) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(cb);
        return () => {
            this.listeners[type] = this.listeners[type].filter(fn => fn !== cb);
        };
    }

    _emit(type, payload) {
        (this.listeners[type] || []).forEach(fn => {
            try { fn(payload); } catch { /* ignore */ }
        });
    }

    _handleMessage(ev) {
        const [status, note, velocity] = ev.data;
        const cmd = status & 0xf0;
        const channel = (status & 0x0f) + 1; // 1..16
        // note off
        if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
            this.pressed.delete(note);
            this._emit('noteoff', { note, channel });
            return;
        }
        if (cmd === 0x90 && velocity > 0) {
            if (this.pressed.has(note)) return; // ignore repeats
            this.pressed.add(note);
            this._emit('noteon', { note, velocity, channel });
        }
    }
}
