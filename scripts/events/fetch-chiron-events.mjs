// Run after npm run build. Predictions select windows only; all references come from Horizons.
import { writeFile } from 'node:fs/promises';
import { findSignIngresses } from '../../dist/events/index.js';
import { getChironPosition } from '../../dist/precise/index.js';
import { toTT } from '../../dist/time/index.js';
import { query } from './horizons.mjs';
import { derive, evaluate, fit } from './shadow-fit.mjs';

const date = (year, month = 1, day = 1) =>
  toTT(Date.UTC(year, month - 1, day) / 86400000 + 2440587.5);
const start = date(2020),
  end = date(2036);
const wrap = (x) => (((x % 360) + 540) % 360) - 180;
async function longitudes(dates) {
  const { rows } = await query('2060;', dates);
  if (rows.length !== dates.length)
    throw Error(`Expected ${dates.length} rows, got ${rows.length}`);
  const values = rows.map((r) => Number(r[3]));
  if (!values.every(Number.isFinite)) throw Error('Invalid Horizons longitude');
  return values;
}
const predictions = findSignIngresses('Chiron', start, end, { includeNutation: true });
const ingresses = [];
for (const e of predictions) {
  const angle = (e.retrograde ? e.previousSign : e.sign) * 30;
  const step = 0.02;
  const dates = Array.from({ length: 41 }, (_, i) => e.jd + (i - 20) * step);
  const values = (await longitudes(dates)).map((v) => wrap(v - angle));
  const i = values.findIndex((v, i) => i < values.length - 1 && v * values[i + 1] <= 0);
  if (i < 0) throw Error(`Ingress not bracketed: ${JSON.stringify(e)}`);
  const speed = (values[i + 1] - values[i]) / step;
  const jd = dates[i] - values[i] / speed;
  ingresses.push({
    jd,
    angle,
    sign: e.sign,
    retrograde: e.retrograde,
    speed,
    bracket: [dates[i], dates[i + 1], values[i], values[i + 1]],
  });
}
// Isolate derivative reversals independently of findStations (which excludes Chiron).
const centers = [];
for (let a = start; a < end; a += 2) {
  const b = Math.min(a + 2, end);
  if (getChironPosition(a).longitudeSpeed * getChironPosition(b).longitudeSpeed > 0) continue;
  let lo = a,
    hi = b;
  const direction = getChironPosition(lo).longitudeSpeed;
  while (hi - lo > 1e-6) {
    const mid = (lo + hi) / 2;
    if (getChironPosition(mid).longitudeSpeed * direction > 0) lo = mid;
    else hi = mid;
  }
  centers.push((lo + hi) / 2);
}
const stations = [];
const offsets = Array.from({ length: 17 }, (_, i) => (i - 8) / 8);
for (const predicted of centers) {
  let center = predicted,
    settled = false;
  for (let pass = 0; pass < 10; pass++) {
    const values = await longitudes(offsets.map((x) => center + x * 2));
    const lon = values.map((v) => values[0] + wrap(v - values[0]));
    const c = fit(offsets, lon, 4),
      d = derive(c),
      dd = derive(d);
    let x = 0;
    for (let k = 0; k < 30; k++) x -= evaluate(d, x) / evaluate(dd, x);
    if (!Number.isFinite(x)) throw Error('Nonfinite station fit');
    if (Math.abs(x) >= 0.25) {
      center += Math.max(-1, Math.min(1, x)) * 2;
      continue;
    }
    stations.push({
      jd: center + 2 * x,
      type: evaluate(dd, x) > 0 ? 'direct' : 'retrograde',
      longitude: ((evaluate(c, x) % 360) + 360) % 360,
      fitResidualArcsec:
        Math.max(...offsets.map((o, i) => Math.abs(evaluate(c, o) - lon[i]))) * 3600,
    });
    settled = true;
    break;
  }
  if (!settled) throw Error(`Station did not converge: ${predicted}`);
}
const dates = [date(2026, 1, 1), date(2026, 6, 6), date(2026, 10, 1)];
const values = await longitudes(dates);
const fixture = {
  source: 'JPL Horizons',
  command: '2060;',
  retrieved: '2026-10-24',
  frame: 'apparent geocentric true ecliptic/equinox of date',
  timeScale: 'TT',
  ingressLimitArcsec:
    Math.ceil(
      Math.max(
        ...ingresses.map((r, i) => Math.abs(r.jd - predictions[i].jd) * Math.abs(r.speed) * 3600),
      ) * 100,
    ) / 100,
  ingresses,
  stations,
  longitudes: dates.map((jd, i) => ({ jd, longitude: values[i] })),
};
// Atomic in the sense that no partial fixture is written when any request fails.
await writeFile(
  new URL('../../src/events/__fixtures__/horizons-chiron-events.json', import.meta.url),
  `${JSON.stringify(fixture, null, 2)}\n`,
);
console.log(
  `Chiron: ${ingresses.length} ingresses, ${stations.length} stations, ${dates.length} positions`,
);
