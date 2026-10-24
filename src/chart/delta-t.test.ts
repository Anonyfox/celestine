import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMoonPosition } from '../ephemeris/moon.js';
import { deltaTAt, toTT } from '../time/delta-t.js';
import { calculateChart, calculatePlanets } from './chart.js';
import { calculatePlanetPositions } from './planet-positions.js';

describe('opt-in chart TT ephemerides', () => {
  const birth = {
    year: 2026,
    month: 10,
    day: 24,
    hour: 12,
    minute: 0,
    second: 0,
    timezone: 0,
    latitude: 51.5,
    longitude: 0,
  };

  it('preserves default results and zero-correction positions exactly', () => {
    const original = calculateChart(birth);
    assert.deepEqual(calculateChart(birth, {}), original);
    for (const deltaT of [0, () => 0]) {
      const corrected = calculateChart(birth, { deltaT });
      // The supplied configuration is intentionally retained in chart.options.
      assert.deepEqual({ ...corrected, options: original.options }, original);
      assert.deepEqual(calculatePlanets(birth, { deltaT }), calculatePlanets(birth));
    }
  });

  it('corrects every body while leaving houses, angles and UT time data identical', () => {
    const original = calculateChart(birth, { includeNodes: 'both', includeLilith: 'both' });
    const jd = original.calculated.julianDate;
    let calls = 0;
    const corrected = calculateChart(birth, {
      ...original.options,
      deltaT: (ut) => {
        calls++;
        assert.equal(ut, jd);
        return deltaTAt(ut);
      },
    });
    assert.equal(calls, 1);
    assert.deepEqual(corrected.houses, original.houses);
    assert.deepEqual(corrected.angles, original.angles);
    assert.deepEqual(corrected.calculated, original.calculated);
    const moon = original.planets.find((p) => p.name === 'Moon')!;
    const moved = corrected.planets.find((p) => p.name === 'Moon')!;
    const expectedShift = (deltaTAt(jd) / 86400) * getMoonPosition(jd).longitudeSpeed;
    // Public Moon speed is a one-day difference; allow its curvature over that day.
    assert.ok(Math.abs(moved.longitude - moon.longitude - expectedShift) < expectedShift * 0.02);
    assert.equal(moved.longitude, getMoonPosition(toTT(jd)).longitude);
    assert.deepEqual(
      calculatePlanetPositions(jd, { ...original.options, deltaT: deltaTAt }),
      calculatePlanetPositions(toTT(jd), original.options),
    );
    assert.deepEqual(
      calculatePlanets(birth, { deltaT: deltaTAt }),
      calculatePlanets(birth, { deltaT: deltaTAt(jd) }),
    );
  });
});
