# WebSampler

## Authors
- Bastian Holzer
- Stevenson Jules


## Web demo and backend:
   - The frontend is hosted on GitHub Pages: https://basti075.github.io/WebAudio/
   - The REST backend is hosted on Render: https://webaudio-22k9.onrender.com

## Use the UI:
   - Load samples, use the trim/play controls and the waveform view to edit and play sounds.
   - The UI communicates with the REST endpoint for sample listing/loading and any server-backed operations.

## Recording & presets
   - You can record audio from your microphone directly into pads using the "Record to Pad" button.
   - After recording you can "Save Preset" to upload the recorded samples and preset JSON to the server; the new preset will appear in the preset dropdown and can be loaded immediately.
   - Note: the example backend is hosted on Render and uses the instance filesystem for uploaded files (stored under `public/presets`).

## MIDI control:
   - A MIDI device can be used to control the pads. Connect your MIDI controller to the computer before opening the UI.
   - The browser may request permission to access MIDI devices; use a browser with Web MIDI API support (for example, Chrome or Edge).
   - Once connected, MIDI notes or CCs mapped by the UI will trigger pad playback and controls.

## Requirements
 - A browser with Web MIDI API support if you want to use a MIDI controller (e.g., Chrome, Edge).

## Headless mode

- Headless mode runs the page in a non-interactive test mode. Use `?headless=1`, `?headless=true` or `#headless` on the URL to enable it.
- Behavior:
   - The UI is hidden and no DOM-based controls are created.
   - The page automatically loads the first preset, decodes all samples, and sets the engine buffers.
   - On completion it logs `HEADLESS_DONE` to the console and sets `window.__HEADLESS_RESULT` to an object `{ preset, loaded, total }`, and dispatches a `headless:done` event with the same detail.
- Example link: https://basti075.github.io/WebAudio/?headless=1

## Keyboard Controls

- **Layout:** The computer keyboard can trigger pads using the following spatial mapping (bottom-left pad = index 0, left→right, bottom→top).
- **Bottom row (pads 0–3):** **y** : **x** : **c** : **v**
- **Next row (pads 4–7):** **a** : **s** : **d** : **f**
- **Next row (pads 8–11):** **q** : **w** : **e** : **r**
- **Top row (pads 12–15):** **1** : **2** : **3** : **4**



