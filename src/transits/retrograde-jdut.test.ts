import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CelestialBody } from '../ephemeris/positions.js';
import { findStations } from '../events/stations.js';
import { toUT } from '../time/delta-t.js';
import { findRetrogradePeriods, findStationPoints } from './retrograde-transits.js';

test('station points and retrograde periods carry jdUT like findStations', () => {
  const [a, b] = [2461041.5, 2461406.5];
  const events = findStations(CelestialBody.Mercury, a, b);
  const points = findStationPoints(CelestialBody.Mercury, a, b);
  assert.equal(points.length, events.length);
  for (const [i, p] of points.entries()) {
    assert.equal(p.jdUT, toUT(p.jd));
    assert.equal(p.jd, events[i]!.jd);
    assert.equal(p.jdUT, events[i]!.jdUT);
    assert.equal(p.type, `station-${events[i]!.type}`);
  }
  const periods = findRetrogradePeriods(CelestialBody.Mercury, a, b);
  assert.ok(periods.length >= 3);
  for (const period of periods) {
    assert.equal(period.stationRetroJDUT, toUT(period.stationRetroJD));
    assert.equal(period.stationDirectJDUT, toUT(period.stationDirectJD));
  }
});
