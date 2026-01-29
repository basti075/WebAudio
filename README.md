# WebSampler - Sampler

## Quick start
1. Start the REST endpoint used by the Sampler:
   - Open `WebAudio/ExampleRESTEndpointCorrige` and run  `npm start`.
   - Ensure the endpoint is reachable before using the Sampler UI.

> Note: the REST backend is deployed on Render at https://webaudio-22k9.onrender.com — the Sampler UI can use this URL instead of running a local server.

2. Open the Sampler UI:
   - Open `WebAudio/Sampler/index.html` in a browser.

3. Use the UI:
   - Load samples, use the trim/play controls and the waveform view to edit and play sounds.
   - The UI communicates with the REST endpoint for sample listing/loading and any server-backed operations.

4. MIDI control:
   - A MIDI device can be used to control the pads. Connect your MIDI controller to the computer before opening the UI.
   - The browser may request permission to access MIDI devices; use a browser with Web MIDI API support (for example, Chrome or Edge).
   - Once connected, MIDI notes or CCs mapped by the UI will trigger pad playback and controls.

## Requirements
- Node.js (to run the REST endpoint) and a modern browser.
 - A browser with Web MIDI API support if you want to use a MIDI controller (e.g., Chrome, Edge).

## Authors
- Bastian Holzer
- Stevenson Jules

