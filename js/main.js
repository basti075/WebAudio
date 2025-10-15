// "named" imports from utils.js and soundutils.js
import WaveformDrawer from './waveformdrawer.js';
import TrimbarsDrawer from './trimbarsdrawer.js';
// "named" imports from utils.js and soundutils.js
import { loadAndDecodeSound, playSound } from './soundutils.js';
import { pixelToSeconds } from './utils.js';

const soundURLs = [
   'https://upload.wikimedia.org/wikipedia/commons/a/a3/Hardstyle_kick.wav',
   'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c7/Redoblante_de_marcha.ogg/Redoblante_de_marcha.ogg.mp3',
   'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c9/Hi-Hat_Cerrado.ogg/Hi-Hat_Cerrado.ogg.mp3',
   'https://upload.wikimedia.org/wikipedia/commons/transcoded/0/07/Hi-Hat_Abierto.ogg/Hi-Hat_Abierto.ogg.mp3',
   'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3c/Tom_Agudo.ogg/Tom_Agudo.ogg.mp3',
   'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/a4/Tom_Medio.ogg/Tom_Medio.ogg.mp3',
   'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8d/Tom_Grave.ogg/Tom_Grave.ogg.mp3',
   'https://upload.wikimedia.org/wikipedia/commons/transcoded/6/68/Crash.ogg/Crash.ogg.mp3',
   'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/24/Ride.ogg/Ride.ogg.mp3'
]

// Array to store decoded audio buffers
let decodedSounds = [];

let canvas, canvasOverlay;
let waveformDrawer, trimbarsDrawer;
let mousePos = { x: 0, y: 0 }

window.onload = async function init() {
  const ctx = new AudioContext();

  canvas = document.querySelector("#myCanvas");
  canvasOverlay = document.querySelector("#myCanvasOverlay");

  waveformDrawer = new WaveformDrawer();
  trimbarsDrawer = new TrimbarsDrawer(canvasOverlay, 100, 200);
  
  
  const soundContainer = document.querySelector("#buttonsContainer"); // Conteneur pour les divs

  try {
    // Charger et décoder tous les sons en parallèle
    const promises = soundURLs.map(async (url) => await loadAndDecodeSound(url, ctx));
    decodedSounds = await Promise.all(promises);
  

    // Créer un div pour chaque son
    decodedSounds.forEach((decodedSound, index) => {

      const playButton = document.createElement("button");
      playButton.textContent = `${soundURLs[index].split('/').pop().replace(/\.(wav|ogg|mp3|ogg\.mp3)$/, '')}`; // Nom du fichier
      
      playButton.onclick = (evt) => {
        waveformDrawer.init(decodedSounds[index], canvas, '#83E83E');
        waveformDrawer.clear();
        waveformDrawer.drawWave(0, canvas.height);

        let start = pixelToSeconds(trimbarsDrawer.leftTrimBar.x, decodedSound.duration, canvas.width);
        let end = pixelToSeconds(trimbarsDrawer.rightTrimBar.x, decodedSound.duration, canvas.width);
        
        console.log("start: " + start + " end: " + end);        
        playSound(ctx, decodedSounds[index], start, end); 
        
      };
      soundContainer.appendChild(playButton);

    });
    canvasOverlay.onmousemove = (evt) => {
      let rect = canvas.getBoundingClientRect();

        mousePos.x = (evt.clientX - rect.left);
        mousePos.y = (evt.clientY - rect.top);
        trimbarsDrawer.moveTrimBars(mousePos);
    }

    canvasOverlay.onmousedown = (evt) => {
        trimbarsDrawer.startDrag();
    }

    canvasOverlay.onmouseup = (evt) => {
        trimbarsDrawer.stopDrag();
    }
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
