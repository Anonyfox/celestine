import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import { toUT } from '../time/delta-t.js';
import {
  findAspectTimes,
  findLunarPhases,
  findSeasons,
  findSignIngresses,
  findVoidOfCourseMoon,
  getMoonPhase,
} from './index.js';
import { wrap } from './search.js';

const start = 2460035.5;
const end = start + 90;
test('ingresses hit exact boundaries, including retrograde re-entries and nodes/Lilith', () => {
  for (const body of Object.values(CelestialBody)) {
    const events = findSignIngresses(body, start, end);
    for (const e of events) {
      assert.ok(
        Math.abs(
          wrap(getPosition(body, e.jd).longitude - (e.retrograde ? e.previousSign : e.sign) * 30),
        ) < 1e-6,
      );
      assert.equal(e.jdUT, toUT(e.jd));
      assert.equal(e.previousSign, (e.sign + (e.retrograde ? 1 : 11)) % 12);
    }
  }
  assert.ok(findSignIngresses(CelestialBody.Mercury, start, start + 365).some((e) => e.retrograde));
});

test('lunar phases, illumination and seasons: conventions and inclusive endpoints', () => {
  const phases = findLunarPhases(start, end);
  assert.ok(phases.length >= 11);
  for (const e of phases) {
    const angle = ['new-moon', 'first-quarter', 'full-moon', 'last-quarter'].indexOf(e.phase) * 90;
    assert.ok(Math.abs(wrap(getMoonPhase(e.jd).elongation - angle)) < 1e-6);
    const info = getMoonPhase(e.jd);
    assert.ok(info.illumination >= 0 && info.illumination <= 1);
    assert.equal(info.waxing, info.elongation < 180);
  }
  assert.equal(findLunarPhases(phases[0]!.jd, phases[0]!.jd).length, 1);
  assert.ok(
    findLunarPhases(start, end, { phases: ['full-moon', 'full-moon'] }).every(
      (e) => e.phase === 'full-moon',
    ),
  );
  assert.deepEqual(findLunarPhases(start, end, { phases: [] }), []);
  assert.equal(findSeasons(start, start + 365).length, 4);
  assert.throws(() => getMoonPhase(Number.NaN), RangeError);
  assert.throws(() => findLunarPhases(start, end, { phases: ['bad' as never] }), RangeError);
  assert.throws(() => findSeasons(end, start), RangeError);
});

test('aspects are exact for both branches, fixed points, and retrograde triple passes', () => {
  const fixed = findAspectTimes(CelestialBody.Mercury, 45, start, start + 65, { angles: [0] });
  assert.equal(fixed.length, 3);
  assert.equal(
    findAspectTimes(CelestialBody.Mercury, CelestialBody.Saturn, 2460000.5, 2460100.5, {
      angles: [60],
    }).length,
    3,
  );
  for (const target of [CelestialBody.Saturn, 405]) {
    const all = findAspectTimes(CelestialBody.Mars, target, start, start + 1095);
    assert.ok(all.length > 1);
    for (const e of all) {
      const difference = wrap(
        getPosition(e.body, e.jd).longitude -
          (typeof e.target === 'number' ? e.target : getPosition(e.target, e.jd).longitude),
      );
      assert.ok(Math.abs(Math.abs(difference) - e.angle) < 1e-6);
      if (e.angle > 0 && e.angle < 180) {
        const h = 0.001;
        const sep = (t: number) =>
          Math.abs(
            wrap(
              getPosition(e.body, t).longitude -
                (typeof e.target === 'number' ? e.target : getPosition(e.target, t).longitude),
            ),
          );
        assert.equal(e.increasing, sep(e.jd + h) > sep(e.jd - h));
      }
    }
  }
  assert.deepEqual(findAspectTimes(CelestialBody.Mars, CelestialBody.Mars, start, end), []);
  assert.throws(() => findAspectTimes(CelestialBody.Mars, Number.NaN, start, end), RangeError);
  assert.throws(
    () => findAspectTimes(CelestialBody.Mars, 0, start, end, { angles: [-1] }),
    RangeError,
  );
});

test('VOC periods are ordered complete sign stays; empty-body convention and overlap', () => {
  const periods = findVoidOfCourseMoon(start, end);
  assert.ok(periods.length > 30);
  const ingresses = findSignIngresses(CelestialBody.Moon, start - 4, end + 4);
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i]!;
    assert.ok(p.start <= p.end && p.start <= end && p.end >= start);
    assert.ok(i === 0 || periods[i - 1]!.end <= p.start);
    assert.ok(ingresses.some((e) => Math.abs(e.jd - p.end) < 1e-6 && e.sign === p.nextSign));
    assert.equal(p.startUT, toUT(p.start));
    assert.equal(p.start, p.lastAspect?.jd);
  }
  const empty = findVoidOfCourseMoon(start, end, { bodies: [CelestialBody.Moon] });
  for (const p of empty) {
    assert.equal(p.lastAspect, null);
    assert.ok(ingresses.some((e) => Math.abs(e.jd - p.start) < 1e-6));
  }
  const point = periods[2]!.end;
  assert.ok(findVoidOfCourseMoon(point, point).some((p) => Math.abs(p.end - point) < 1e-6));
});
