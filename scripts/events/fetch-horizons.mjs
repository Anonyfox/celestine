// Run after npm run build. Sequential, cached, polite retrieval; no external libraries.
import { mkdir, writeFile } from 'node:fs/promises';
import { CelestialBody, ephemeris, events } from '../../dist/index.js';
import { query } from './horizons.mjs';

const dir = new URL('../../src/events/__fixtures__/', import.meta.url);
await mkdir(dir, { recursive: true });
const ids = {
  Sun: '10',
  Moon: '301',
  Mercury: '199',
  Venus: '299',
  Mars: '499',
  Jupiter: '599',
  Saturn: '699',
  Uranus: '799',
  Neptune: '899',
  Pluto: '999',
};
const start = 2415020.5,
  end = 2488434.5;
const wrap = (x) => (((x % 360) + 540) % 360) - 180;
const select = (all, count) =>
  Array.from({ length: count }, (_, i) => all[Math.round((i * (all.length - 1)) / (count - 1))]);
const requests = [];
// Confirm frame empirically before deriving event times. Preserve both residuals.
const frameDates = [2415020, 2451545, 2488070];
const frameSource = await query('10', frameDates);
const frame = frameDates.map((jd, i) => {
  const reference = Number(frameSource.rows[i][3]);
  const mean = ephemeris.getSunPosition(jd).longitude;
  const nutation = ephemeris.nutationInLongitude((jd - 2451545) / 36525);
  return {
    jd,
    reference,
    meanResidualArcsec: wrap(mean - reference) * 3600,
    trueResidualArcsec: wrap(mean + nutation - reference) * 3600,
  };
});
if (!frame.every((r) => Math.abs(r.trueResidualArcsec) < Math.abs(r.meanResidualArcsec)))
  throw Error('Frame confirmation failed');
await writeFile(new URL('frame.json', dir), `${JSON.stringify(frame)}\n`);
// 64 phases, 44 seasons, evenly spread, including all four types.
for (let i = 0; i < 16; i++) {
  const year = 1900 + Math.round((i * 200) / 15);
  const a = Date.UTC(year, 0, 1) / 86400000 + 2440587.5;
  for (const e of events.findLunarPhases(a, a + 32).slice(0, 4))
    requests.push({
      kind: 'phase',
      predicted: e.jd,
      phase: e.phase,
      body: 'Moon',
      targetBody: 'Sun',
      angle: ['new-moon', 'first-quarter', 'full-moon', 'last-quarter'].indexOf(e.phase) * 90,
    });
}
for (let i = 0; i < 11; i++) {
  const a = Date.UTC(1900 + i * 20, 0, 1) / 86400000 + 2440587.5;
  for (const e of events.findSeasons(a, a + 366))
    requests.push({
      kind: 'season',
      predicted: e.jd,
      type: e.type,
      body: 'Sun',
      angle:
        ['march-equinox', 'june-solstice', 'september-equinox', 'december-solstice'].indexOf(
          e.type,
        ) * 90,
    });
}
for (const body of Object.keys(ids)) {
  console.log('select ingresses', body);
  const all = events.findSignIngresses(body, start, end, { nutation: true });
  const chosen = select(all, 12);
  // Replace two central entries with retrograde crossings where possible.
  const retro = all.filter((e) => e.retrograde);
  if (retro.length) {
    chosen[5] = retro[0];
    chosen[6] = retro.at(-1);
  }
  for (const e of chosen)
    requests.push({
      kind: 'ingress',
      predicted: e.jd,
      body,
      angle: (e.retrograde ? e.previousSign : e.sign) * 30,
      retrograde: e.retrograde,
    });
}
// Moving and fixed-longitude aspects, and an explicit Mercury 2023 retrograde triple pass.
const pairs = [
  ['Moon', 'Mars'],
  ['Moon', 'Jupiter'],
  ['Sun', 'Saturn'],
  ['Mars', 'Saturn'],
  ['Jupiter', 'Saturn'],
  ['Mercury', 45],
];
for (let i = 0; i < pairs.length; i++) {
  const [body, target] = pairs[i];
  const a = Date.UTC(1900 + i * 35, 0, 1) / 86400000 + 2440587.5;
  const all = events.findAspectTimes(body, target, a, a + (body === 'Jupiter' ? 7305 : 1500));
  for (const e of select(all, 7)) {
    const sep = wrap(
      ephemeris.getPosition(body, e.jd).longitude -
        (typeof target === 'number' ? target : ephemeris.getPosition(target, e.jd).longitude),
    );
    requests.push({
      kind: 'aspect',
      predicted: e.jd,
      body,
      ...(typeof target === 'number' ? { fixed: target } : { targetBody: target }),
      angle: sep < 0 ? 360 - e.angle : e.angle,
    });
  }
}
for (const e of events.findAspectTimes(CelestialBody.Mercury, 45, 2460035.5, 2460100.5, {
  angles: [0],
}))
  requests.push({
    kind: 'aspect',
    predicted: e.jd,
    body: 'Mercury',
    fixed: 45,
    angle: 0,
    triplePass: true,
  });
// Three Mercury–Saturn sextiles across Mercury's April–May 2023 retrograde.
for (const e of events.findAspectTimes(
  CelestialBody.Mercury,
  CelestialBody.Saturn,
  2460000.5,
  2460100.5,
  { angles: [60] },
)) {
  const separation = wrap(
    ephemeris.getPosition('Mercury', e.jd).longitude -
      ephemeris.getPosition('Saturn', e.jd).longitude,
  );
  requests.push({
    kind: 'aspect',
    predicted: e.jd,
    body: 'Mercury',
    targetBody: 'Saturn',
    angle: separation < 0 ? 300 : 60,
    triplePassMoving: true,
  });
}
// Make grids with steps of ~3 arcsec, except explicit one-minute luminary grids.
for (const r of requests) {
  const speed = Math.abs(ephemeris.getPosition(r.body, r.predicted).longitudeSpeed);
  r.step = ['Sun', 'Moon'].includes(r.body)
    ? 1 / 1440
    : Math.min(0.1, 3 / 3600 / Math.max(speed, 0.0001));
  r.dates = Array.from({ length: 17 }, (_, i) => r.predicted + (i - 8) * r.step);
}
// Batch independent events by body to reduce network requests (max 48 epochs/request).
const needed = new Map();
for (const r of requests)
  for (const body of [r.body, ...(r.targetBody ? [r.targetBody] : [])]) {
    if (!needed.has(body)) needed.set(body, new Set());
    for (const jd of r.dates) needed.get(body).add(jd);
  }
const positions = new Map();
for (const [body, set] of needed) {
  const dates = [...set].sort((a, b) => a - b);
  const values = new Map();
  positions.set(body, values);
  for (let i = 0; i < dates.length; i += 48) {
    const chunk = dates.slice(i, i + 48);
    const result = await query(ids[body], chunk);
    result.rows.forEach((row, j) => {
      values.set(chunk[j], Number(row[3]));
    });
  }
  console.log('fetched', body, dates.length);
}
const references = requests.map((r) => {
  const values = r.dates.map((jd) => {
    const p = positions.get(r.body).get(jd);
    const q = r.targetBody ? positions.get(r.targetBody).get(jd) : (r.fixed ?? 0);
    // Fixed natal points are mean-equinox; subtract nutation from Horizons.
    const correction =
      r.fixed !== undefined ? ephemeris.nutationInLongitude((jd - 2451545) / 36525) : 0;
    return wrap(p - q - correction - r.angle);
  });
  let index = -1;
  for (let i = 0; i < values.length - 1; i++)
    if (values[i] * values[i + 1] <= 0 && Math.abs(values[i]) + Math.abs(values[i + 1]) < 180) {
      index = i;
      break;
    }
  if (index < 0) throw Error(`Grid does not bracket ${JSON.stringify(r)}: ${values}`);
  const t0 = r.dates[index],
    t1 = r.dates[index + 1],
    v0 = values[index],
    v1 = values[index + 1];
  const jd = t0 - (v0 * (t1 - t0)) / (v1 - v0);
  const { dates, ...metadata } = r;
  return { ...metadata, jd, bracket: [t0, t1, v0, v1] };
});
await writeFile(new URL('horizons-events.json', dir), `${JSON.stringify(references)}\n`);
const illuminationDates = Array.from(
  { length: 51 },
  (_, i) => start + ((end - start - 1) * i) / 50,
);
const illuminated = await query('301', illuminationDates.slice(0, 48), '10');
const tail = await query('301', illuminationDates.slice(48), '10');
await writeFile(
  new URL('illumination.json', dir),
  `${JSON.stringify([...illuminated.rows, ...tail.rows].map((row, i) => [illuminationDates[i], Number(row[3]) / 100]))}\n`,
);
console.log('reference events', references.length);
