import assert from 'node:assert/strict';
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
