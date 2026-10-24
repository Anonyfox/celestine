// Run after npm run build. Horizons-derived station times (true ecliptic/equinox of date):
// for each predicted station, 17 apparent longitudes over ±H days are fitted with a quartic
// and the root of its derivative is the reference instant. Windows stay short (±1–2 d) so the
// monthly lunar reflex in geocentric longitude (~0.16″ for Pluto) is resolved, not smoothed:
// for slow planets it shifts stations by tens of minutes. Cached, polite, no libraries.
import { writeFile } from 'node:fs/promises';
import { findStations } from '../../dist/events/index.js';
import { query } from './horizons.mjs';

const ids = {
  Mercury: ['199', 1],
  Venus: ['299', 1.5],
  Mars: ['499', 2],
  Jupiter: ['599', 2],
  Saturn: ['699', 2],
  Uranus: ['799', 2],
  Neptune: ['899', 2],
  Pluto: ['999', 2],
};
const jd = (y) => Date.UTC(y, 0, 1) / 86400000 + 2440587.5;
const select = (all, count) =>
  Array.from({ length: count }, (_, i) => all[Math.round((i * (all.length - 1)) / (count - 1))]);
const unwrap = (values) => values.map((v) => v + 360 * Math.round((values[0] - v) / 360));

// Least-squares polynomial in x ∈ [-1, 1] (normal equations, Gaussian elimination).
function fit(xs, ys, degree) {
  const n = degree + 1;
  const m = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (let k = 0; k < xs.length; k++)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) m[i][j] += xs[k] ** (i + j);
      m[i][n] += ys[k] * xs[k] ** i;
    }
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(m[r][i]) > Math.abs(m[p][i])) p = r;
    [m[i], m[p]] = [m[p], m[i]];
    for (let r = 0; r < n; r++)
      if (r !== i) {
        const f = m[r][i] / m[i][i];
        for (let c = i; c <= n; c++) m[r][c] -= f * m[i][c];
      }
  }
  return m.map((row, i) => row[n] / row[i]);
}
const evaluate = (c, x) => c.reduceRight((acc, v) => acc * x + v, 0);
const derive = (c) => c.slice(1).map((v, i) => v * (i + 1));

const stations = [];
for (const [body, [id, half]] of Object.entries(ids)) {
  const [a, b] = [jd(1900), jd(2100)];
  const all = findStations(body, a, b, { includeNutation: true });
  const chosen = select(all, 16);
  // Consumer diagnosis: every Mercury station 2026–2030.
  if (body === 'Mercury')
    chosen.push(...all.filter((e) => e.jd >= jd(2026) && e.jd < jd(2031) && !chosen.includes(e)));
  // Recentre (without refitting the prediction) when the model misses by > H/4.
  let pending = chosen.map((e) => e.jd);
  for (let pass = 0; pending.length && pass < 10; pass++) {
    const retry = [];
    for (let i = 0; i < pending.length; i += 2) {
      const batch = pending.slice(i, i + 2);
      const offsets = Array.from({ length: 17 }, (_, k) => (k - 8) / 8);
      const dates = batch.flatMap((center) => offsets.map((x) => center + x * half));
      const { rows } = await query(id, dates);
      if (rows.length !== dates.length) throw Error(`${body}: expected ${dates.length} rows`);
      batch.forEach((center, j) => {
        const lon = unwrap(rows.slice(j * 17, j * 17 + 17).map((r) => Number(r[3])));
        const c = fit(offsets, lon, 4);
        const d = derive(c);
        const dd = derive(d);
        let x = 0;
        for (let k = 0; k < 50; k++) x -= evaluate(d, x) / evaluate(dd, x);
        if (!(Math.abs(x) < 0.25)) {
          if (!Number.isFinite(x)) throw Error(`${body} ${center}: no extremum`);
          retry.push(center + Math.max(-1, Math.min(1, x)) * half);
          return;
        }
        const residual = Math.max(...offsets.map((o, k) => Math.abs(evaluate(c, o) - lon[k])));
        stations.push({
          body,
          type: evaluate(dd, x) > 0 ? 'direct' : 'retrograde',
          jd: Number((center + x * half).toFixed(7)),
          longitude: Number((((evaluate(c, x) % 360) + 360) % 360).toFixed(7)),
          fitResidualArcsec: Number((residual * 3600).toFixed(5)),
        });
      });
    }
    pending = retry;
  }
  if (pending.length) throw Error(`${body}: ${pending.length} stations did not converge`);
  console.log(body, chosen.length);
}
stations.sort((p, q) => (p.body === q.body ? p.jd - q.jd : 0));
await writeFile(
  new URL('../../src/events/__fixtures__/horizons-stations.json', import.meta.url),
  `${JSON.stringify(stations, null, 1)}\n`,
);
