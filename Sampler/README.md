# Assignment Sampler Final

A small sampler app that:
- Fetches presets from the REST API (Seance2/ExampleRESTEndpointCorrige)
- Decodes sounds in parallel with Promise.allSettled
- Draws waveforms and interactive trim bars
- Plays the trimmed selection via a SamplerEngine (headless)
- Optionally routes audio through a WAM Sampler plugin (if it accepts input)

## How to run
1. Start the REST API server:
   - Open terminal at `Seance2/ExampleRESTEndpointCorrige`
   - Install deps then start:
     - Windows PowerShell:
       ```powershell
       npm install
       npm start
       ```
   - Verify: open http://localhost:3000/api/health
2. Serve the `AssignmentSamplerFinal` folder with a static server (VS Code Live Server or any HTTP server). Then open the page in your browser.

## Notes
- If the WAM Sampler does not accept input, engine audio will route to destination and WAM will still play from its GUI.
- Use the Enable Audio button if the AudioContext is suspended by the browser (autoplay policies).
