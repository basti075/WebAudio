# WebSampler

## Authors
- Bastian Holzer
- Stevenson Jules

## Quick start
1. Web demo and backend:
   - The frontend is hosted on GitHub Pages: https://basti075.github.io/WebAudio/
   - The REST backend is hosted on Render: https://webaudio-22k9.onrender.com

2. Use the UI:
   - Load samples, use the trim/play controls and the waveform view to edit and play sounds.
   - The UI communicates with the REST endpoint for sample listing/loading and any server-backed operations.

3. Recording & presets
   - You can record audio from your microphone directly into pads using the "Record to Pad" button.
   - After recording you can "Save Preset" to upload the recorded samples and preset JSON to the server; the new preset will appear in the preset dropdown and can be loaded immediately.
   - Note: the example backend is hosted on Render and uses the instance filesystem for uploaded files (stored under `public/presets`).

4. MIDI control:
   - A MIDI device can be used to control the pads. Connect your MIDI controller to the computer before opening the UI.
   - The browser may request permission to access MIDI devices; use a browser with Web MIDI API support (for example, Chrome or Edge).
   - Once connected, MIDI notes or CCs mapped by the UI will trigger pad playback and controls.

## Requirements
 - A browser with Web MIDI API support if you want to use a MIDI controller (e.g., Chrome, Edge).

## Headless mode

- The UI supports a headless/testing mode that hides the interactive controls and performs a non-interactive load of the first preset and its samples.
- Enable headless mode by opening the page with the query parameter `?headless=1` (or `?headless=true`) or by appending `#headless` to the URL.
- When finished the page logs a completion object as `HEADLESS_DONE` in the console, stores the result at `window.__HEADLESS_RESULT`, and dispatches a `headless:done` event.
- Example link: https://basti075.github.io/WebAudio/?headless=1

