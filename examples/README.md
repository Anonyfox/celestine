# Runnable examples

Run `npm install` and `npm run build` from the repository root first.

- Node: `node examples/node-cli.mjs` uses the current instant.
- Reproduce an instant: `node examples/node-cli.mjs 2026-10-24T12:00:00Z`.
- Station and lunar searches use TT; displayed ISO dates use model-derived UT as UTC.
- The Moon label is the nearest principal phase; illumination is also printed.

Serve the repository root, for example with `python3 -m http.server 8000`, and open
`http://localhost:8000/examples/browser-natal-chart.html`.
The browser demo imports **celestine@0.9.0** from esm.sh by default; this requires network access.
Append `?src=local` after building to use `../dist/index.js` entirely offline.
Enter date/time in UT (UTC offset zero), latitude north and longitude east in degrees,
and choose a house system. The SVG wheel and ten-body table use `calculateChart` output;
house numbers follow the computed cusps and lines show computed major aspects.
Play advances one day per tick from the entered moment. `?play=1` starts automatically
unless reduced motion is requested. The initial moment is 2026-01-01 12:00 UT, Hamburg.

Re-record with `npm run demo:gif` (Node 22+, `/usr/bin/google-chrome`, `/usr/bin/ffmpeg`;
set `CHROME_PATH` to override Chrome). No additional dependencies are needed.
The recorder serves the repository on a free loopback port, loads `?src=local&play=1&capture=1`,
and drives the same date-step function explicitly so capture speed cannot change the dates.
It writes `assets/demo.gif`: 120 daily frames at 12 fps, 800×500, ten seconds, looping.
The extra `capture=1` parameter pauses the wall clock for deterministic capture.
Temporary screenshots and the Chrome profile are removed on exit. Chrome uses `--no-sandbox`
for container compatibility; the recorder serves only local repository files.

Use `cloudflare-worker.ts` as the entry point in your existing Worker project.
Bundle it with your Worker tooling and the local celestine package available.
Try `?date=2000-01-01T12:00&tz=0&lat=51.5074&lon=-0.1278`.
Bad inputs return JSON with HTTP status 400; valid inputs return the chart.

The examples use the default mean ecliptic/equinox of date coordinate frame.
