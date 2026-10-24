import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CelestialBody } from '../ephemeris/positions.js';
import { getAllRetrogradePeriods } from './retrograde-transits.js';

test('getAllRetrogradePeriods stays a Map and serialises to a plain object', () => {
  const start = 2461041.5;
  const result = getAllRetrogradePeriods(
    [CelestialBody.Sun, CelestialBody.Mercury, CelestialBody.Saturn],
    start,
    start + 365,
  );
  assert.ok(result instanceof Map);
  assert.deepEqual([...result.keys()], ['Mercury', 'Saturn']);
  const json = JSON.parse(JSON.stringify(result));
  assert.deepEqual(Object.keys(json), ['Mercury', 'Saturn']);
  assert.deepEqual(json, JSON.parse(JSON.stringify(Object.fromEntries(result))));
  assert.equal(json.Mercury.length, result.get('Mercury')!.length);
  assert.equal(json.Mercury[0].stationRetroJD, result.get('Mercury')![0]!.stationRetroJD);
});
