import { playSound  } from "./soundutils.js";
import TrimbarsDrawer from "./trimbarsdrawer.js";
import { pixelToSeconds } from "./utils.js";
import WaveformDrawer from "./waveformdrawer.js";

export default class AudioTrimmer {
    constructor(audioContext, audioBuffer, container, canvas, canvasOverlay) {
        this.audioContext = audioContext;
        this.audioBuffer = audioBuffer;
        this.startTime = 0;
        this.endTime = audioBuffer.duration || 0;
        this.button = null;
        this.container = container;
        this.canvas = canvas;
        this.canvasOverlay = canvasOverlay;
        this.waveformDrawer = new WaveformDrawer();
        this.trimbarsDrawer = new TrimbarsDrawer(this.canvasOverlay, 100, 200);
         this.mousePos = {x: 0, y: 0};
    }


    initCanvas() {
        if (!this.canvas || !this.audioBuffer) {
            console.warn('Cannot initialize canvas: missing canvas or audioBuffer');
            return;
        }
        
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.waveformDrawer.init(this.audioBuffer, this.canvas, '#83E83E');
        this.waveformDrawer.drawWave(0, this.canvas.height);

        if(this.trimbarsDrawer && this.trimbarsDrawer.leftTrimBar && this.trimbarsDrawer.rightTrimBar){
            this.trimbarsDrawer.leftTrimBar.x = 0;
            this.trimbarsDrawer.rightTrimBar.x = this.canvas.width;
        }
    }

    createButton(label) {  
        this.button = document.createElement("button");
        this.button.textContent = label;
        this.container.appendChild(this.button);

        this.setupEventHandlers();
        this.handleOnClick();
        this.animate();

        return this.button;

    }

    handleOnClick() {
        if (!this.button) return;

        this.button.onclick = async () => {
            if(this.audioContext && this.audioContext.state === 'suspended'){
                await this.audioContext.resume();
            }

            if(!this.canvas || this.audioBuffer) return;
            this.initCanvas();

            this.startTime = pixelToSeconds(
                this.trimbarsDrawer.leftTrimBar.x,
                this.audioBuffer.duration,
                this.canvas.width
            );
            this.endTime = pixelToSeconds(
                this.trimbarsDrawer.rightTrimBar.x,
                this.audioBuffer.duration,
                this.canvas.width
            );
            playSound(this.audioContext, this.audioBuffer, this.startTime, this.endTime);
        }
    }
    setupEventHandlers() {
        this.canvasOverlay.onmousemove = (evt) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = evt.clientX - rect.left;
            this.mousePos.y = evt.clientY - rect.top;
            this.trimbarsDrawer.moveTrimBars(this.mousePos);
        };
        this.canvasOverlay.onmousedown = () => this.trimbarsDrawer.startDrag();
        this.canvasOverlay.onmouseup = () => this.trimbarsDrawer.stopDrag();
    }

    animate() {
        this.trimbarsDrawer.clear();
        this.trimbarsDrawer.draw();
        requestAnimationFrame(() => this.animate());
    }
}