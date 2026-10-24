// Held-out accuracy of celestine/precise vs JPL Horizons, with 0.3.0 root and 0.2.1 for context.
// Usage: node --import tsx scripts/chiron/accuracy.mts [path-to-celestine-0.2.1/dist/index.js]
// Horizons apparent longitudes are brought to the mean ecliptic of date with an 18-term
// IAU 1980 nutation (≈0.05″), as in src/precise/precise.test.ts.
import { readFileSync } from 'node:fs';
import * as root from '../../src/ephemeris/index.ts';
import * as precise from '../../src/precise/index.ts';

const old = process.argv[2] ? (await import(process.argv[2])).ephemeris : undefined;
const D = Math.PI / 180;
const NUTATION: [number, number, number, number, number, number, number][] = [
  [0, 0, 0, 0, 1, -171996, -174.2],
  [-2, 0, 0, 2, 2, -13187, -1.6],
  [0, 0, 0, 2, 2, -2274, -0.2],
  [0, 0, 0, 0, 2, 2062, 0.2],
  [0, 1, 0, 0, 0, 1426, -3.4],
  [0, 0, 1, 0, 0, 712, 0.1],
  [-2, 1, 0, 2, 2, -517, 1.2],
  [0, 0, 0, 2, 1, -386, -0.4],
  [0, 0, 1, 2, 2, -301, 0],
  [-2, -1, 0, 2, 2, 217, -0.5],
  [-2, 0, 1, 0, 0, -158, 0],
  [-2, 0, 0, 2, 1, 129, 0.1],
  [0, 0, -1, 2, 2, 123, 0],
  [2, 0, 0, 0, 0, 63, 0],
  [0, 0, 1, 0, 1, 63, 0.1],
  [2, 0, -1, 2, 2, -59, 0],
  [0, 0, -1, 0, 1, -58, -0.1],
  [0, 0, 1, 2, 1, -51, 0],
];
function nutation(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const args = [
    297.85036 + 445267.11148 * T,
    357.52772 + 35999.05034 * T,
    134.96298 + 477198.867398 * T,
    93.27191 + 483202.017538 * T,
    125.04452 - 1934.136261 * T,
  ];
  let sum = 0;
  for (const [a, b, c, d, e, s, st] of NUTATION)
    sum +=
      (s + st * T) *
      Math.sin((a * args[0] + b * args[1] + c * args[2] + d * args[3] + e * args[4]) * D);
  return sum / 1e4 / 3600;
}
const rows = (f: string): number[][] =>
  JSON.parse(readFileSync(new URL(`./holdout/${f}.json`, import.meta.url), 'utf8')).rows;
type Get = (jd: number) => { longitude: number; latitude: number };
function stats(get: Get, set: number[][]) {
  let max = 0;
  let ss = 0;
  for (const [jd, lon, lat] of set) {
    const p = get(jd);
    const dl = ((((p.longitude - (lon - nutation(jd))) % 360) + 540) % 360) - 180;
    const e = Math.hypot(dl * Math.cos(lat * D), p.latitude - lat) * 3600;
    max = Math.max(max, e);
    ss += e * e;
  }
  return [max, Math.sqrt(ss / set.length)];
}
const fmt = ([m, r]: number[]) =>
  m >= 3600
    ? `${(m / 3600).toFixed(2)}° / ${(r / 3600).toFixed(2)}°`
    : m >= 60
      ? `${(m / 60).toFixed(1)}′ / ${(r / 60).toFixed(1)}′`
      : `${m.toFixed(2)}″ / ${r.toFixed(2)}″`;
console.log(
  '| Body | Window | n | precise max / RMS | root 0.3.0–0.4.0 max / RMS | 0.2.1 max / RMS |',
);
console.log('|---|---|---|---|---|---|');
for (const name of ['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta']) {
  const file = name.toLowerCase();
  const recent = rows(`obs100-2000-2050-${file}`).filter(
    ([jd]) => jd >= 2458849.5 && jd < 2462502.5,
  );
  const windows: [string, number[][]][] = [
    ['1800–2200', rows(`obs400-${file}`)],
    ['2020–2030', [...rows(`obs60-2020-2030-${file}`), ...recent]],
  ];
  for (const [label, set] of windows) {
    const cells = [precise, root, old].map((lib) =>
      lib ? fmt(stats(Reflect.get(lib, `get${name}Position`) as Get, set)) : 'n/a',
    );
    console.log(`| ${name} | ${label} | ${set.length} | ${cells.join(' | ')} |`);
  }
}
