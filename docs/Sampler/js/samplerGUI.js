export class SamplerGUI {
    constructor(root, waveCanvas, overlayCanvas, trimbars, onPad) {
        this.root = root;
        this.waveCanvas = waveCanvas;
        this.overlayCanvas = overlayCanvas;
        this.trimbars = trimbars;
        this.onPad = onPad;
        this._activeIndex = -1;
        this._pads = [];
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
            div.innerHTML = `
                <div class="progress" aria-hidden="true"><div class="bar"></div></div>
                <span class="name">${s.name || 'Sample'}</span>`;
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
        if (ready) {
            el.classList.remove('loading');
            const bar = el.querySelector('.bar');
            if (bar) bar.style.width = '100%';
        }
    }

    setBusy(index, busy = true) {
        const el = this._pads[index];
        if (!el) return;
        el.classList.toggle('loading', !!busy);
        if (busy) this.setProgress(index, 0);
    }

    setProgress(index, fraction) {
        const el = this._pads[index];
        if (!el) return;
        const bar = el.querySelector('.bar');
        if (!bar) return;
        const pct = Math.max(0, Math.min(1, Number(fraction) || 0));
        bar.style.width = (pct * 100).toFixed(1) + '%';
    }

    currentSelection(buffer) {
        const start = this.trimbars.left * buffer.duration;
        const duration = Math.max(0.001, (this.trimbars.right - this.trimbars.left) * buffer.duration);
        return { start, duration };
    }
}
