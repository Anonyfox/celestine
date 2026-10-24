import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { AspectType } from '../aspects/types.js';
import { CelestialBody } from '../ephemeris/positions.js';
import { nutation } from '../events/luminaries.js';
import { angularSeparation } from '../transits/transit-detection.js';
import { findTransitPasses, searchTransitPasses } from './transit-passes.js';

const start = 2460310.5;
const end = 2461041.5;

test('Moon passes are distinct, ordered, and used by month and summary', () => {
  const result = searchTransitPasses({
    startJD: start,
    endJD: start + 90,
    natalPoints: [{ name: 'Sun', longitude: 280, type: 'luminary' }],
    config: { transitingBodies: [CelestialBody.Moon], aspectTypes: [AspectType.Conjunction] },
  });
  assert.ok(result.transits.length >= 3 && result.transits.length <= 4);
  assert.equal(result.summary.totalTransits, result.transits.length);
  assert.equal(Object.values(result.byMonth).flat().length, result.transits.length);
  result.transits.forEach((p, i) => {
    assert.equal(p.exactPasses, 1);
    assert.ok(p.enterOrbJD < p.exactJDs[0] && p.exactJDs[0] < p.leaveOrbJD);
    assert.ok(p.durationDays > 0.1 && p.durationDays < 3);
    assert.equal(p.transit.exactJD, p.exactJDs[0]);
    if (i) assert.ok(result.transits[i - 1].leaveOrbJD < p.enterOrbJD);
  });
});

test('retrograde triples join only while continuously in orb; both window edges clip', () => {
  const joined = findTransitPasses(CelestialBody.Saturn, 345, 0, 5, start, end);
  assert.equal(joined.length, 1);
  assert.equal(joined[0].exactPasses, 3);
  assert.equal(joined[0].hasRetrogradePass, true);
  const separate = findTransitPasses(CelestialBody.Saturn, 345, 0, 1, start, end);
  assert.deepEqual(
    separate.map((p) => p.exactPasses),
    [1, 1, 1],
  );
  assert.deepEqual(
    separate.flatMap((p) => p.exactJDs),
    joined[0].exactJDs,
  );
  const a = joined[0].exactJDs[0] - 1;
  const b = joined[0].exactJDs[2] + 1;
  const clipped = findTransitPasses(CelestialBody.Saturn, 345, 0, 5, a, b)[0];
  assert.equal(clipped.enterOrbJD, a);
  assert.equal(clipped.leaveOrbJD, b);
  assert.equal(clipped.durationDays, b - a);
  assert.deepEqual(findTransitPasses(CelestialBody.Saturn, 345, 0, 1, start, start), []);
  assert.throws(() => findTransitPasses(CelestialBody.Saturn, 345, 0, -1, start, end));
});

test('Horizons TT apparent longitudes confirm pass boundaries and exact hits', () => {
  const refs = JSON.parse(
    readFileSync(new URL('__fixtures__/horizons-transit-passes.json', import.meta.url), 'utf8'),
  ) as {
    body: CelestialBody;
    natalLongitude: number;
    aspectAngle: number;
    orb: number;
    startJD: number;
    endJD: number;
    samples: { jd: number; longitude: number; boundary: boolean }[];
  }[];
  const budgets = JSON.parse(readFileSync(new URL('../../budgets.json', import.meta.url), 'utf8'));
  for (const r of refs) {
    const passes = findTransitPasses(
      r.body,
      r.natalLongitude,
      r.aspectAngle,
      r.orb,
      r.startJD,
      r.endJD,
    ).slice(0, 3);
    assert.deepEqual(
      passes.flatMap((p) => [p.enterOrbJD, ...p.exactJDs, p.leaveOrbJD]),
      r.samples.map((s) => s.jd),
    );
    let maximum = 0;
    for (const s of r.samples) {
      // Quantity 31 is true equinox of date. Convert the reference to the default mean frame.
      const deviation = Math.abs(
        angularSeparation(s.longitude - nutation(s.jd), r.natalLongitude) - r.aspectAngle,
      );
      const error = Math.abs(deviation - (s.boundary ? r.orb : 0)) * 3600;
      maximum = Math.max(maximum, error);
      assert.ok(error < budgets.precision[r.body].lonArcsec, `${r.body}: ${error} arcsec`);
    }
    console.log(`${r.body}: maximum reference residual ${maximum.toFixed(4)} arcsec`);
  }
});
