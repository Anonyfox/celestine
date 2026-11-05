import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getRetrogradeProgress } from 'celestine/retrograde';
import { CelestialBody } from '../ephemeris/positions.js';
import { toUT } from '../time/delta-t.js';
import { julianDate } from '../time/julian-date.js';
import { findRetrogradePeriods, getRetrogradeShadow } from './index.js';

const date = (month: number, day: number) => julianDate(2024, month, day);
const mercury = findRetrogradePeriods(CelestialBody.Mercury, date(4, 1), date(5, 1))[0];

describe('getRetrogradeProgress', () => {
  it('measures halfway through the April 2024 Mercury retrograde', () => {
    assert.ok(Math.abs(mercury.stationRetroJD - date(4, 1)) < 2);
    assert.ok(Math.abs(mercury.stationDirectJD - date(4, 25)) < 1);
    const mid = (mercury.stationRetroJD + mercury.stationDirectJD) / 2;
    const progress = getRetrogradeProgress(CelestialBody.Mercury, mid);
    assert.ok(progress);
    assert.ok(Math.abs(progress.percentDone - 50) < 0.001);
    assert.equal(progress.phase, 'retrograde');
    assert.deepEqual(progress.shadow, getRetrogradeShadow(progress.period));
    assert.equal(progress.midpointJDUT, toUT(progress.midpointJD));
    assert.deepEqual(getRetrogradeProgress(progress.period, mid), progress);
  });

  it('classifies inclusive station and shadow boundaries and clamps percentages', () => {
    const shadow = getRetrogradeShadow(mercury);
    for (const [jd, phase, percent] of [
      [shadow.preShadowStartJD - 1, 'outside', 0],
      [shadow.preShadowStartJD, 'pre-shadow', 0],
      [mercury.stationRetroJD, 'retrograde', 0],
      [mercury.stationDirectJD, 'retrograde', 100],
      [shadow.postShadowEndJD, 'post-shadow', 100],
      [shadow.postShadowEndJD + 1, 'outside', 100],
    ] as const) {
      const result = getRetrogradeProgress(mercury, jd);
      assert.equal(result.phase, phase);
      assert.equal(result.percentDone, percent);
    }
    for (const jd of [shadow.preShadowStartJD + 1, shadow.postShadowEndJD - 1]) {
      const result = getRetrogradeProgress(CelestialBody.Mercury, jd);
      assert.ok(result);
      assert.ok(Math.abs(result.period.stationRetroJD - mercury.stationRetroJD) < 0.00001);
    }
    const upcoming = getRetrogradeProgress(CelestialBody.Mercury, shadow.preShadowStartJD - 1);
    assert.ok(upcoming);
    assert.equal(upcoming.phase, 'outside');
    assert.ok(Math.abs(upcoming.period.stationRetroJD - mercury.stationRetroJD) < 0.00001);
  });

  it('omits the UT midpoint on hand-built periods without UT stations', () => {
    const { stationRetroJDUT: _r, stationDirectJDUT: _d, ...withoutUT } = mercury;
    const result = getRetrogradeProgress(withoutUT, mercury.stationRetroJD);
    assert.equal('midpointJDUT' in result, false);
  });

  it('rejects invalid times and periods and returns null for the Sun', () => {
    assert.equal(getRetrogradeProgress(CelestialBody.Sun, date(4, 12)), null);
    assert.throws(() => getRetrogradeProgress(mercury, Number.NaN), RangeError);
    assert.throws(
      () =>
        getRetrogradeProgress({ ...mercury, stationDirectJD: mercury.stationRetroJD }, date(4, 12)),
      RangeError,
    );
  });
});
