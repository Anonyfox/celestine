import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getMoonPosition } from '../ephemeris/moon.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { findLunarPhases } from './index.js';
import { nutation } from './luminaries.js';
import { wrap } from './search.js';

// [TT jd, phase, Horizons Moon ObsEcLon, Horizons Sun ObsEcLon] (true equinox of date), from
// scripts/events/fetch-phase-longitudes.mjs; 148 phases, 2025-2027.
const rows = JSON.parse(
  readFileSync(new URL('__fixtures__/horizons-phase-longitudes.json', import.meta.url), 'utf8'),
) as [number, string, number, number][];
const arcsec = (a: number, b: number) => Math.abs(wrap(a - b)) * 3600;

test('phase longitudes match JPL Horizons within the Moon and Sun position budgets', () => {
  assert.equal(rows.length, 148);
  const events = findLunarPhases(rows[0]![0] - 0.5, rows.at(-1)![0] + 0.5, {
    includeNutation: true,
  });
  const mean = findLunarPhases(rows[0]![0] - 0.5, rows.at(-1)![0] + 0.5);
  assert.equal(events.length, rows.length);
  let moon = 0;
  let sun = 0;
  rows.forEach(([jd, phase, moonRef, sunRef], i) => {
    const e = events[i]!;
    assert.equal(e.phase, phase);
    assert.ok(Math.abs(e.jd - jd) < 1e-8);
    moon = Math.max(moon, arcsec(e.moonLongitude, moonRef));
    sun = Math.max(sun, arcsec(e.sunLongitude, sunRef));
    // Default frame: mean equinox of date, the true-equinox value minus nutation in longitude.
    const m = mean[i]!;
    assert.ok(arcsec(m.moonLongitude + nutation(m.jd), e.moonLongitude) < 1e-3);
    assert.ok(arcsec(m.moonLongitude, getMoonPosition(m.jd).longitude) < 1e-3);
    assert.ok(arcsec(m.sunLongitude, getSunPosition(m.jd).longitude) < 1e-3);
    // The defining separation holds at the instant.
    const offset = { 'new-moon': 0, 'first-quarter': 90, 'full-moon': 180, 'last-quarter': 270 };
    assert.ok(
      arcsec(e.moonLongitude - e.sunLongitude, offset[phase as keyof typeof offset]) < 1e-3,
    );
  });
  // Measured 2026-10-24: Moon 7.46″, Sun 0.28″ (budgets.json precision: Moon 8″, Sun 0.4″).
  assert.ok(moon < 8, `Moon ${moon}″`);
  assert.ok(sun < 0.4, `Sun ${sun}″`);
});

test('short phase names are accepted; unknown names list the valid ones', () => {
  const a = findLunarPhases(2461000, 2461060, { phases: ['full', 'new'] });
  const b = findLunarPhases(2461000, 2461060, { phases: ['full-moon', 'new-moon'] });
  assert.deepEqual(a, b);
  assert.deepEqual(
    findLunarPhases(2461000, 2461060, { phases: ['first', 'first-quarter'] }),
    findLunarPhases(2461000, 2461060, { phases: ['first-quarter'] }),
  );
  assert.equal(findLunarPhases(2461000, 2461060, { phases: ['last'] })[0]!.phase, 'last-quarter');
  assert.throws(
    // @ts-expect-error invalid phase name
    () => findLunarPhases(2461000, 2461060, { phases: ['waxing'] }),
    /Unknown lunar phase "waxing"; use new-moon, first-quarter, full-moon, last-quarter, new, first, full, last/,
  );
});
