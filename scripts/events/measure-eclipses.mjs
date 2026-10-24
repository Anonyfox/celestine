// Run after npm run build. References are NASA's TT greatest instants.
import { readFile } from 'node:fs/promises';
import { getMoonPosition } from '../../dist/ephemeris/moon.js';
import { getSunPosition } from '../../dist/ephemeris/sun.js';
import { findEclipses } from '../../dist/events/index.js';

const fixture = JSON.parse(
  await readFile(new URL('../../src/events/__fixtures__/nasa-eclipses.json', import.meta.url)),
);
const a = 2458849.5,
  b = 2462867.5;
const refs = fixture.events.filter((e) => e.jd >= a && e.jd <= b);
const start = performance.now();
const events = findEclipses(a, b);
console.log('11-year ms', performance.now() - start, 'count', events.length, refs.length);
const errors = {
  time: [],
  gamma: [],
  solarMagnitude: [],
  umbralMagnitude: [],
  penumbralMagnitude: [],
  ut: [],
};
events.forEach((e, i) => {
  const r = refs[i];
  if (!r) return;
  if (e.kind !== r.kind || e.type !== r.type)
    console.log('MISMATCH', r.date, r.kind, r.type, e.kind, e.type);
  errors.time.push(Math.abs(e.jd - r.jd) * 86400);
  errors.gamma.push(Math.abs(e.gamma - r.gamma));
  errors.ut.push(Math.abs(e.jdUT - (r.jd - r.deltaT / 86400)) * 86400);
  if (e.kind === 'solar') errors.solarMagnitude.push(Math.abs(e.magnitude - r.magnitude));
  else
    for (const k of ['umbralMagnitude', 'penumbralMagnitude'])
      errors[k].push(Math.abs(e[k] - r[k]));
});
for (const [key, values] of Object.entries(errors))
  console.log(
    key,
    'max',
    Math.max(...values),
    'mean',
    values.reduce((a, b) => a + b, 0) / values.length,
  );
const t = performance.now();
const century = findEclipses(2451910.5, 2488434.5);
const counts = {};
for (const e of century) {
  counts[e.kind] ??= {};
  counts[e.kind][e.type] = (counts[e.kind][e.type] ?? 0) + 1;
}
console.log('Century ms', performance.now() - t, counts);

const horizons = JSON.parse(
  await readFile(new URL('../../src/events/__fixtures__/horizons-eclipses.json', import.meta.url)),
);
for (const [key, position] of [
  ['sunLongitude', getSunPosition],
  ['moonLongitude', getMoonPosition],
]) {
  const errors = horizons.events.map((r) =>
    Math.abs(
      (((position(r.jd, { includeNutation: true, includeSpeed: false }).longitude - r[key] + 540) %
        360) -
        180) *
        3600,
    ),
  );
  console.log(key, 'max arcsec', Math.max(...errors));
}
