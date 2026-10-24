import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as esm from 'celestine';
import { build } from 'esbuild';
import { bundleOptions, entries } from './entries.mjs';

const cjs = createRequire(import.meta.url)('celestine');
const birth = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  second: 0,
  timezone: 0,
  latitude: 51.5,
  longitude: 0,
};
for (const api of [esm, cjs]) {
  assert.equal(api.toJulianDate(birth), 2451545);
  assert.equal(api.time.fromJulianDate(2451545).year, 2000);
  assert.equal(api.eclipticToZodiac(0).signName, 'Aries');
}
for (const name of ['getSunPosition', 'getMoonPosition', 'getMercuryPosition'])
  assert.deepEqual(esm.ephemeris[name](2451545), cjs.ephemeris[name](2451545));
assert.deepEqual(esm.calculateChart(birth), cjs.calculateChart(birth));
for (const name of ['toJulianDate', 'realistic']) {
  const result = await build({
    ...bundleOptions,
    stdin: { contents: entries[name], resolveDir: process.cwd() },
  });
  const api = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`
  );
  assert.equal(api.toJulianDate(birth), 2451545);
  if (name === 'realistic') {
    assert.equal(api.fromJulianDate(2451545).year, 2000);
    assert.equal(api.eclipticToZodiac(0).signName, 'Aries');
    for (const [index, body] of [
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
    ].entries())
      assert.deepEqual(api.positions[index](2451545), esm.ephemeris[`get${body}Position`](2451545));
    assert.deepEqual(api.findStationPoints(esm.CelestialBody.Mercury, 2451545, 2451546), []);
    assert.deepEqual(
      api.findAllAspects([
        { name: 'a', longitude: 0 },
        { name: 'b', longitude: 120 },
      ]),
      esm.aspects.findAllAspects([
        { name: 'a', longitude: 0 },
        { name: 'b', longitude: 120 },
      ]),
    );
    assert.deepEqual(api.calculateChart(birth), esm.calculateChart(birth));
  }
}
console.log('Consumer: ESM, CJS, namespaces, named imports and executed package bundles pass.');
for (const name of [
  'ephemeris',
  'time',
  'zodiac',
  'aspects',
  'transits',
  'chart',
  'houses',
  'progressions',
]) {
  const subpath = await import(`celestine/${name}`);
  const required = createRequire(import.meta.url)(`celestine/${name}`);
  assert.deepEqual(Object.keys(subpath).sort(), Object.keys(Reflect.get(esm, name)).sort());
  assert.deepEqual(Object.keys(required).sort(), Object.keys(cjs[name]).sort());
  for (const key of Object.keys(subpath)) {
    assert.equal(subpath[key], Reflect.get(esm, name)[key]);
    assert.equal(required[key], cjs[name][key]);
  }
}
console.log('Consumer: all eight ESM/CJS subpaths match their root namespaces.');
const events = await import('celestine/events');
const eventsCjs = createRequire(import.meta.url)('celestine/events');
assert.equal('events' in esm, false);
assert.equal('events' in cjs, false);
assert.deepEqual(Object.keys(events).sort(), Object.keys(eventsCjs).sort());
assert.deepEqual(
  events.findSeasons(2461041.5, 2461406.5),
  eventsCjs.findSeasons(2461041.5, 2461406.5),
);
assert.deepEqual(events.getMoonPhase(2451545), eventsCjs.getMoonPhase(2451545));
console.log('Consumer: subpath-only celestine/events matches across ESM and CJS.');
const precise = await import('celestine/precise');
const preciseCjs = createRequire(import.meta.url)('celestine/precise');
assert.equal('precise' in esm, false);
assert.equal('precise' in cjs, false);
assert.deepEqual(Object.keys(precise).sort(), Object.keys(preciseCjs).sort());
assert.deepEqual(precise.getPallasPosition(2460000.5), preciseCjs.getPallasPosition(2460000.5));
assert.deepEqual(precise.PRECISE_RANGE, preciseCjs.PRECISE_RANGE);
assert.throws(() => precise.getChironPosition(precise.PRECISE_RANGE.endJD + 1), RangeError);
console.log('Consumer: subpath-only celestine/precise matches across ESM and CJS.');
const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const pkgCjs = createRequire(import.meta.url)('celestine/package.json');
const { default: pkgEsm } = await import('celestine/package.json', { with: { type: 'json' } });
assert.equal(pkgCjs.version, manifest.version);
assert.equal(pkgEsm.version, manifest.version);
assert.equal(pkgCjs.name, 'celestine');
console.log(
  `Consumer: celestine/package.json resolves in CJS and ESM (version ${manifest.version}).`,
);
