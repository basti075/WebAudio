# WebSampler - Sampler

## Quick start
1. Web demo and backend:
   - The frontend is hosted on GitHub Pages: https://basti075.github.io/WebAudio/
   - The REST backend is hosted on Render: https://webaudio-22k9.onrender.com

2. Use the UI:
   - Load samples, use the trim/play controls and the waveform view to edit and play sounds.
   - The UI communicates with the REST endpoint for sample listing/loading and any server-backed operations.

3. MIDI control:
   - A MIDI device can be used to control the pads. Connect your MIDI controller to the computer before opening the UI.
   - The browser may request permission to access MIDI devices; use a browser with Web MIDI API support (for example, Chrome or Edge).
   - Once connected, MIDI notes or CCs mapped by the UI will trigger pad playback and controls.

## Requirements
 - A browser with Web MIDI API support if you want to use a MIDI controller (e.g., Chrome, Edge).

## Authors
- Bastian Holzer
- Stevenson Jules

