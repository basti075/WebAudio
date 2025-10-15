import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
import { loadAndDecodeSound, playSound } from './soundutils.js';
import { pixelToSeconds } from './utils.js';

const URL_endpoint = "http://localhost:3000/api/presets";

const fetchData = async () => {
  try {
    const data = await fetch(URL_endpoint);
    const response = await data.json();
    return response;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

let canvas, canvasOverlay;
let waveformDrawer, trimbarsDrawer;
let mousePos = { x: 0, y: 0 };

window.onload = async function init() {
  const ctx = new AudioContext();
  const presets = await fetchData();

  canvas = document.querySelector("#myCanvas");
  canvasOverlay = document.querySelector("#myCanvasOverlay");

  waveformDrawer = new WaveformDrawer();
  trimbarsDrawer = new TrimbarsDrawer(canvasOverlay, 100, 200);

  const soundContainer = document.querySelector(".container");

  try {
    if (!presets || presets.length === 0)
      throw new Error('No presets found');

    // 🎛️ Create dropdown
    const select = document.createElement("select");
    select.id = "presetSelect";
    presets.forEach(preset => {
      const option = document.createElement("option");
      option.value = preset.name;
      option.textContent = preset.name;
      select.appendChild(option);
    });
    soundContainer.appendChild(select);

    // 🟩 Container for buttons
    const buttonsContainer = document.createElement("div");
    buttonsContainer.id = "buttonsContainer";
    soundContainer.appendChild(buttonsContainer);

    // 🧠 Cache decoded buffers
    const decodedBuffers = {};

    // When a preset is selected
    select.addEventListener("change", async () => {
      const selectedPreset = presets.find(p => p.name === select.value);
      if (!selectedPreset) return;

      buttonsContainer.innerHTML = ''; // clear previous buttons

      // Decode all sounds in the selected preset
      const promises = selectedPreset.samples.map(async (sample) => {
        sample.url = `http://localhost:3000/presets/${sample.url}`;
        const decoded = await loadAndDecodeSound(sample.url, ctx);
        return { name: sample.name, buffer: decoded };
      });

      const decodedSounds = await Promise.all(promises);
      decodedBuffers[selectedPreset.name] = decodedSounds;

      // 🎵 Create buttons for each sample
      decodedSounds.forEach(({ name, buffer }) => {
        const playButton = document.createElement("button");
        playButton.textContent = name;

        playButton.onclick = () => {
          waveformDrawer.init(buffer, canvas, '#83E83E');
          waveformDrawer.clear();
          waveformDrawer.drawWave(0, canvas.height);

          const start = pixelToSeconds(trimbarsDrawer.leftTrimBar.x, buffer.duration, canvas.width);
          const end = pixelToSeconds(trimbarsDrawer.rightTrimBar.x, buffer.duration, canvas.width);

          playSound(ctx, buffer, start, end);
        };

        buttonsContainer.appendChild(playButton);
      });
    });

    // Trigger default selection
    select.dispatchEvent(new Event('change'));

    // Mouse events for trimbars
    canvasOverlay.onmousemove = (evt) => {
      let rect = canvas.getBoundingClientRect();
      mousePos.x = evt.clientX - rect.left;
      mousePos.y = evt.clientY - rect.top;
      trimbarsDrawer.moveTrimBars(mousePos);
    };

    canvasOverlay.onmousedown = () => trimbarsDrawer.startDrag();
    canvasOverlay.onmouseup = () => trimbarsDrawer.stopDrag();

    requestAnimationFrame(animate);
  } catch (error) {
    console.error('Erreur lors du chargement ou du décodage des fichiers audio :', error);
  }
};

function animate() {
  trimbarsDrawer.clear();
  trimbarsDrawer.draw();
  requestAnimationFrame(animate);
}
