// Measured errors only: never updates limits or writes fixtures.
import { readFile } from 'node:fs/promises';
import * as events from '../../dist/events/index.js';
import { time } from '../../dist/index.js';

const dir = new URL('../../src/events/__fixtures__/', import.meta.url);
const stats = new Map();
function record(name, error) {
  if (!stats.has(name)) stats.set(name, []);
  stats.get(name).push(error);
}
for (const kind of ['phases', 'seasons']) {
  const years = JSON.parse(await readFile(new URL(`usno-${kind}.json`, dir)));
  for (const [year, rows] of Object.entries(years)) {
    const a = Date.UTC(Number(year), 0, 1) / 86400000 + 2440587.5;
    const b = Date.UTC(Number(year) + 1, 0, 1) / 86400000 + 2440587.5;
    const actual = (kind === 'phases' ? events.findLunarPhases : events.findSeasons)(
      time.toTT(a),
      time.toTT(b),
    );
    if (rows.length !== actual.length)
      throw Error(`Count ${kind} ${year}: ${actual.length} != ${rows.length}`);
    rows.forEach(([jd], i) => {
      record(`USNO ${kind} UT`, (actual[i].jdUT - jd) * 86400);
    });
  }
}
const references = JSON.parse(await readFile(new URL('horizons-events.json', dir)));
for (const r of references) {
  let actual;
  // ±0.2 d around the independent reference; narrower than any repeat crossing.
  const a = r.jd - 0.2,
    b = r.jd + 0.2;
  if (r.kind === 'phase') actual = events.findLunarPhases(a, b, { phases: [r.phase] });
  else if (r.kind === 'season') actual = events.findSeasons(a, b);
  else if (r.kind === 'ingress')
    actual = events.findSignIngresses(r.body, a, b, { nutation: true });
  else
    actual = events.findAspectTimes(r.body, r.targetBody ?? r.fixed, a, b, {
      angles: [Math.min(r.angle, 360 - r.angle)],
    });
  if (actual.length !== 1) throw Error(`Expected one event: ${JSON.stringify(r)}`);
  record(`Horizons ${r.kind} ${r.body} TT`, (actual[0].jd - r.jd) * 86400);
}
const illumination = JSON.parse(await readFile(new URL('illumination.json', dir)));
for (const [jd, fraction] of illumination)
  record('Horizons illumination fraction', events.getMoonPhase(jd).illumination - fraction);
const output = Object.fromEntries(
  [...stats].map(([key, values]) => [
    key,
    {
      n: values.length,
      max: Math.max(...values.map(Math.abs)),
      rms: Math.sqrt(values.reduce((s, e) => s + e * e, 0) / values.length),
    },
  ]),
);
console.log(JSON.stringify(output, null, 2));
