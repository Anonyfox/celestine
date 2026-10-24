// Measured errors only: never updates limits or writes fixtures.
import { readFile } from 'node:fs/promises';
import * as events from '../../dist/events/index.js';
import { ephemeris, time } from '../../dist/index.js';

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
const wrap = (x) => (((x % 360) + 540) % 360) - 180;
const speed = (body, jd) =>
  wrap(
    ephemeris.getPosition(body, jd + 0.01).longitude -
      ephemeris.getPosition(body, jd - 0.01).longitude,
  ) / 0.02;
// Each reference in its own frame: jd is Horizons-native (true equinox or frame-free),
// jdMean the derived mean-equinox crossing (the library default).
for (const r of references) {
  const runs = [];
  if (r.kind === 'phase')
    runs.push(['', r.jd, (a, b) => events.findLunarPhases(a, b, { phases: [r.phase] })]);
  else if (r.kind === 'season') {
    runs.push(['true', r.jd, (a, b) => events.findSeasons(a, b)]);
    runs.push(['mean', r.jdMean, (a, b) => events.findSignIngresses('Sun', a, b)]);
  } else if (r.kind === 'ingress') {
    runs.push(['true', r.jd, (a, b) => events.findSignIngresses(r.body, a, b, { nutation: true })]);
    runs.push(['mean', r.jdMean, (a, b) => events.findSignIngresses(r.body, a, b)]);
  } else {
    const angles = [Math.min(r.angle, 360 - r.angle)];
    const fixed = r.fixed !== undefined;
    runs.push([
      fixed ? 'mean fixed' : '',
      fixed ? r.jdMean : r.jd,
      (a, b) => events.findAspectTimes(r.body, r.targetBody ?? r.fixed, a, b, { angles }),
    ]);
  }
  for (const [frame, ref, find] of runs) {
    // ±0.2 d around the independent reference; narrower than any repeat crossing.
    const actual = find(ref - 0.2, ref + 0.2);
    if (actual.length !== 1) throw Error(`Expected one event: ${JSON.stringify(r)}`);
    const name = `Horizons ${r.kind} ${r.body}${frame ? ` ${frame}` : ''} TT`;
    record(name, (actual[0].jd - ref) * 86400);
    if (r.kind === 'ingress')
      record(`${name} implied arcsec`, (actual[0].jd - ref) * speed(r.body, ref) * 3600);
  }
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
