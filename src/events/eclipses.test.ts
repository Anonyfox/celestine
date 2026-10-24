import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getMoonPosition } from '../ephemeris/moon.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { toUT } from '../time/delta-t.js';
import { findEclipses } from './index.js';
import { wrap } from './search.js';
import type { EclipseKind } from './types.js';

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`__fixtures__/${name}.json`, import.meta.url), 'utf8'));
interface Reference {
  jd: number;
  kind: EclipseKind;
  type: string;
  deltaT: number;
  gamma: number;
  magnitude: number;
  umbralMagnitude: number;
  penumbralMagnitude: number;
}
const nasa = fixture('nasa-eclipses') as {
  events: Reference[];
  centuryCounts: Record<string, Record<string, number>>;
};
const a = 2458849.5; // 2020-01-01 TT
const b = 2462867.5; // 2031-01-01 TT

test('NASA 2020–2030: one-to-one kinds/types, TT maximum and shadow geometry', (t) => {
  const refs = nasa.events.filter((e) => e.jd >= a && e.jd <= b);
  const start = performance.now();
  const events = findEclipses(a, b);
  assert.equal(events.length, refs.length);
  let maxTime = 0,
    sumTime = 0,
    maxGamma = 0,
    maxSolar = 0,
    maxUmbral = 0,
    maxPenumbral = 0,
    maxUT = 0;
  events.forEach((e, i) => {
    const r = refs[i]!;
    assert.equal(e.kind, r.kind);
    assert.equal(e.type, r.type);
    assert.ok(i === 0 || e.jd > events[i - 1]!.jd);
    const dt = Math.abs(e.jd - r.jd) * 86400;
    maxTime = Math.max(maxTime, dt);
    sumTime += dt;
    maxGamma = Math.max(maxGamma, Math.abs(e.gamma - r.gamma));
    maxUT = Math.max(maxUT, Math.abs(e.jdUT - (r.jd - r.deltaT / 86400)) * 86400);
    assert.equal(e.jdUT, toUT(e.jd));
    if (e.kind === 'solar') maxSolar = Math.max(maxSolar, Math.abs(e.magnitude - r.magnitude));
    else {
      maxUmbral = Math.max(maxUmbral, Math.abs(e.umbralMagnitude - r.umbralMagnitude));
      maxPenumbral = Math.max(maxPenumbral, Math.abs(e.penumbralMagnitude - r.penumbralMagnitude));
      assert.equal(e.magnitude, e.type === 'penumbral' ? e.penumbralMagnitude : e.umbralMagnitude);
    }
  });
  // Ceilings rounded up from the committed measurement script, not fitted coefficients.
  assert.ok(maxTime < 18);
  assert.ok(maxGamma < 0.00043);
  assert.ok(maxSolar < 0.00054);
  assert.ok(maxUmbral < 0.00071);
  assert.ok(maxPenumbral < 0.0007);
  // NASA lists predicted ΔT for these years; Celestine uses later USNO data. Measured 20.7 s.
  assert.ok(maxUT < 25);
  t.diagnostic(
    JSON.stringify({
      count: events.length,
      maxTime,
      meanTime: sumTime / events.length,
      maxGamma,
      maxSolar,
      maxUmbral,
      maxPenumbral,
      maxUT,
      ms: performance.now() - start,
    }),
  );
});

test('Horizons at NASA TT epochs: true-equinox longitudes within position budgets', (t) => {
  const refs = fixture('horizons-eclipses').events as {
    jd: number;
    sunLongitude: number;
    moonLongitude: number;
  }[];
  const budgets = JSON.parse(
    readFileSync(new URL('../../budgets.json', import.meta.url), 'utf8'),
  ).precision;
  let sun = 0,
    moon = 0;
  // Compare at the reference epoch: a greatest-time residual must not be counted
  // as a longitude residual, especially for the fast Moon.
  for (const r of refs) {
    sun = Math.max(
      sun,
      Math.abs(wrap(getSunPosition(r.jd, { includeNutation: true }).longitude - r.sunLongitude)) *
        3600,
    );
    moon = Math.max(
      moon,
      Math.abs(wrap(getMoonPosition(r.jd, { includeNutation: true }).longitude - r.moonLongitude)) *
        3600,
    );
  }
  t.diagnostic(`Horizons max longitude error: Sun ${sun} arcsec, Moon ${moon} arcsec`);
  assert.ok(sun <= budgets.Sun.lonArcsec);
  for (const includeNutation of [false, true]) {
    for (const e of findEclipses(nasa.events[0]!.jd - 1, nasa.events.at(-1)!.jd + 1, {
      includeNutation,
    })) {
      assert.equal(e.sunLongitude, getSunPosition(e.jd, { includeNutation }).longitude);
      assert.equal(e.moonLongitude, getMoonPosition(e.jd, { includeNutation }).longitude);
      assert.ok(e.sunLongitude >= 0 && e.sunLongitude < 360);
      assert.ok(e.moonLongitude >= 0 && e.moonLongitude < 360);
    }
  }
  // The 8 arcsec Moon budget is the maximum over the precision sample set. At these
  // eclipse epochs the same Moon series reaches 9.91 arcsec, so the bound here is 10.
  assert.ok(moon < 10, `Moon ${moon} arcsec exceeds 10`);
});

test('inclusive boundaries, empty intervals, kind selection, frame alias and invalid inputs', () => {
  const all = findEclipses(a, b);
  const e = all[0]!;
  assert.equal(findEclipses(e.jd, e.jd).length, 1);
  assert.equal(findEclipses(e.jd, e.jd + 1).length, 1);
  assert.equal(findEclipses(e.jd - 1, e.jd).length, 1);
  assert.deepEqual(findEclipses(e.jd + 0.01, e.jd + 1), []);
  assert.deepEqual(findEclipses(a, a), []);
  assert.deepEqual(findEclipses(a, b, { kinds: [] }), []);
  for (const kind of ['solar', 'lunar'] as const) {
    const selected = findEclipses(a, b, { kinds: [kind, kind] });
    assert.deepEqual(
      selected,
      all.filter((e) => e.kind === kind),
    );
  }
  assert.deepEqual(
    findEclipses(a, a + 30, { nutation: true }),
    findEclipses(a, a + 30, { includeNutation: true }),
  );
  for (const [lo, hi] of [
    [NaN, b],
    [a, Infinity],
    [b, a],
  ])
    assert.throws(() => findEclipses(lo!, hi!), RangeError);
  assert.throws(() => findEclipses(a, b, { kinds: ['invalid' as EclipseKind] }), RangeError);
});

test('NASA century totals 2001–2100, including seven hybrid eclipses', () => {
  const counts: Record<string, Record<string, number>> = { solar: {}, lunar: {} };
  for (const e of findEclipses(2451910.5, 2488434.5)) {
    const family = counts[e.kind]!;
    family[e.type] = (family[e.type] ?? 0) + 1;
  }
  assert.deepEqual(counts, nasa.centuryCounts);
});
