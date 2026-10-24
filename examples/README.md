# Runnable examples

Run `npm install` and `npm run build` from the repository root first.

- Node: `node examples/node-cli.mjs` uses the current instant.
- Reproduce an instant: `node examples/node-cli.mjs 2026-10-24T12:00:00Z`.
- Station and lunar searches use TT; displayed ISO dates use model-derived UT as UTC.
- The Moon label is the nearest principal phase; illumination is also printed.

Serve the root with any static HTTP server and open `examples/browser-natal-chart.html`.
The browser example uses a pinned esm.sh import and needs network access.
For local built code, replace its CDN specifier with `../dist/index.js`.
Enter civil local time and a numeric UTC offset, positive east of Greenwich.

Use `cloudflare-worker.ts` as the entry point in your existing Worker project.
Bundle it with your Worker tooling and the local celestine package available.
Try `?date=2000-01-01T12:00&tz=0&lat=51.5074&lon=-0.1278`.
Bad inputs return JSON with HTTP status 400; valid inputs return the chart.

The examples use the default mean ecliptic/equinox of date coordinate frame.
