export class SamplerGUI {
    constructor(root, waveCanvas, overlayCanvas, trimbars, onPad) {
        this.root = root;
        this.waveCanvas = waveCanvas;
        this.overlayCanvas = overlayCanvas;
        this.trimbars = trimbars;
        this.onPad = onPad;
        this._activeIndex = -1;
        this._pads = []; // store pad refs
    }

    buildPads(sounds) {
        this.root.innerHTML = '';
        this._pads = [];
        sounds.forEach((s, idx) => {
            const div = document.createElement('div');
            div.className = 'pad';
            div.role = 'button';
            div.tabIndex = 0;
            div.ariaLabel = s.name || 'Sample';
            div.innerHTML = `<span class="name">${s.name || 'Sample'}</span>`;
            div.addEventListener('click', () => this.onPad(idx));
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.onPad(idx);
                }
            });
            this.root.appendChild(div);
            this._pads[idx] = div;
        });
    }

    selectPad(index) {
        const pads = [...this.root.querySelectorAll('.pad')];
        pads.forEach(p => p.classList.remove('active'));
        if (pads[index]) pads[index].classList.add('active');
        this._activeIndex = index;
    }

    setReady(index, ready = true) {
        const el = this._pads[index];
        if (!el) return;
        el.classList.toggle('ready', !!ready);
    }

    currentSelection(buffer) {
        const start = this.trimbars.left * buffer.duration;
        const duration = Math.max(0.001, (this.trimbars.right - this.trimbars.left) * buffer.duration);
        return { start, duration };
    }
}
