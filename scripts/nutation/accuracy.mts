/**
 * Apparent (true ecliptic/equinox of date) accuracy with `includeNutation: true` vs JPL
 * Horizons quantity 31, for every body with a fixture, the celestine/precise bodies and the
 * true-equinox event searches. Run from the repo root: `npx tsx scripts/nutation/accuracy.mts`.
 */
import { readFileSync } from 'node:fs';
import { getPosition } from '../../src/ephemeris/positions.js';
import { findLunarPhases, findSeasons, findSignIngresses } from '../../src/events/index.js';
import * as precise from '../../src/precise/index.js';
import { toTT } from '../../src/time/delta-t.js';

const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const D = Math.PI / 180;
const wrap = (x: number) => (((x % 360) + 540) % 360) - 180;
const arcsec = (x: number) => x.toFixed(2).padStart(6);
console.log('| Body | n | true-of-date lon max | lat max | mean-of-date lon max |');
console.log('|---|---|---|---|---|');
for (const body of [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Chiron',
]) {
  const { rows } = json(`src/ephemeris/__fixtures__/horizons/${body.toLowerCase()}.json`);
  let lon = 0,
    lat = 0,
    mean = 0;
  for (const [jd, , mlon, , , qlon, qlat] of rows) {
    const p = getPosition(body, jd, { includeNutation: true });
    lon = Math.max(lon, Math.abs(wrap(p.longitude - qlon)) * 3600);
    lat = Math.max(lat, Math.abs(p.latitude - qlat) * 3600);
    mean = Math.max(mean, Math.abs(wrap(getPosition(body, jd).longitude - mlon)) * 3600);
  }
  console.log(
    `| ${body} | ${rows.length} | ${arcsec(lon)}″ | ${arcsec(lat)}″ | ${arcsec(mean)}″ |`,
  );
}
console.log('\n| Precise body | 1800–2200 apparent max | 2020–2030 apparent max |');
console.log('|---|---|---|');
for (const body of ['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta']) {
  const get = (
    precise as Record<string, (jd: number, o: object) => { longitude: number; latitude: number }>
  )[`get${body}Position`];
  const max = (file: string) => {
    let m = 0;
    for (const [jd, lon, lat] of json(`scripts/chiron/holdout/${file}-${body.toLowerCase()}.json`)
      .rows) {
      const p = get(jd, { includeNutation: true });
      m = Math.max(
        m,
        Math.hypot(wrap(p.longitude - lon) * Math.cos(lat * D), p.latitude - lat) * 3600,
      );
    }
    return m;
  };
  console.log(`| ${body} | ${arcsec(max('obs400'))}″ | ${arcsec(max('obs60-2020-2030'))}″ |`);
}
const events = json('src/events/__fixtures__/horizons-events.json') as {
  kind: string;
  body: string;
  phase: string;
  jd: number;
}[];
const worst: Record<string, number> = {};
const squares: Record<string, number[]> = {};
for (const r of events) {
  const a = r.jd - 0.2,
    b = r.jd + 0.2;
  const key = r.kind === 'ingress' ? `ingress ${r.body}` : r.kind;
  let hit: { jd: number }[];
  if (r.kind === 'phase') hit = findLunarPhases(a, b, { phases: [r.phase as never] });
  else if (r.kind === 'season') hit = findSeasons(a, b);
  else if (r.kind === 'ingress' && ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].includes(r.body))
    hit = findSignIngresses(r.body as never, a, b, { includeNutation: true });
  else continue;
  const error = Math.abs(hit[0]!.jd - r.jd) * 86400;
  worst[key] = Math.max(worst[key] ?? 0, error);
  squares[key] ??= [];
  squares[key].push(error * error);
}
let usno = 0;
for (const [year, rows] of Object.entries(
  json('src/events/__fixtures__/usno-seasons.json') as Record<string, [number, number][]>,
)) {
  const a = Date.UTC(Number(year), 0, 1) / 86400000 + 2440587.5;
  const found = findSeasons(toTT(a), toTT(a + 366));
  rows.forEach(([jdUT], i) => {
    usno = Math.max(usno, Math.abs(found[i]!.jdUT - jdUT) * 86400);
  });
}
console.log('\n| Event search vs Horizons (TT) | max error | RMS |');
console.log('|---|---|---|');
for (const [k, v] of Object.entries(worst).sort()) {
  const rms = Math.sqrt(squares[k]!.reduce((a, b) => a + b, 0) / squares[k]!.length);
  console.log(`| ${k} | ${v.toFixed(2)} s | ${rms.toFixed(2)} s |`);
}
console.log(`| seasons vs USNO (UT, ±30 s source rounding) | ${usno.toFixed(2)} s | |`);
