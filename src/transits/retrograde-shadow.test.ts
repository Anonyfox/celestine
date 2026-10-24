import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import { wrap } from '../events/search.js';
import type { EventFrameOptions } from '../events/types.js';
import { toUT } from '../time/delta-t.js';
import { findRetrogradePeriods, getRetrogradeShadow } from './retrograde-transits.js';

const jd = (year: number) => Date.UTC(year, 0, 1) / 86400000 + 2440587.5;
const frame = { includeNutation: true };
for (const body of [
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
]) {
  test(`${body}: shadow crossings close in both frames and surround their period`, () => {
    const year = body === CelestialBody.Saturn || body === CelestialBody.Neptune ? 2025 : 2026;
    for (const options of [undefined, frame, { nutation: true }] as (
      | EventFrameOptions
      | undefined
    )[]) {
      const periods = findRetrogradePeriods(body, jd(year), jd(year + 2), options);
      assert.ok(periods.length);
      for (const p of periods) {
        const s = getRetrogradeShadow(p, options);
        assert.ok(s.preShadowStartJD < p.stationRetroJD);
        assert.ok(s.postShadowEndJD > p.stationDirectJD);
        assert.equal(s.shadowZoneStart, p.stationDirectLongitude);
        assert.equal(s.shadowZoneEnd, p.stationRetroLongitude);
        for (const [t, target] of [
          [s.preShadowStartJD, s.shadowZoneStart],
          [s.postShadowEndJD, s.shadowZoneEnd],
        ]) {
          const pos = getPosition(
            body,
            t!,
            options && {
              includeNutation:
                options.includeNutation ?? ('nutation' in options ? options.nutation : undefined),
            },
          );
          assert.ok(Math.abs(wrap(pos.longitude - target!) / pos.longitudeSpeed) < 1e-6);
        }
        if (year === 2025 && p.stationRetroJD > jd(2025) && p.stationRetroJD < jd(2026)) {
          assert.ok(s.shadowZoneStart > s.shadowZoneEnd);
          assert.ok(s.preShadowStartJD > jd(2025) && s.preShadowStartJD < jd(2026));
        }
      }
    }
  });
}
test('Mercury February 2026: true equinox crossings match reported UT minutes', () => {
  const p = findRetrogradePeriods(CelestialBody.Mercury, jd(2026), jd(2027), frame)[0]!;
  const s = getRetrogradeShadow(p, frame);
  for (const [actual, expected] of [
    [s.preShadowStartJD, Date.UTC(2026, 1, 11, 22, 12)],
    [s.postShadowEndJD, Date.UTC(2026, 3, 9, 11, 42)],
  ]) {
    // True equinox of date; TT -> UT uses the library's date-dependent ΔT.
    assert.ok(Math.abs(toUT(actual!) - (expected! / 86400000 + 2440587.5)) * 1440 < 2);
  }
});
test('unbracketable period terminates with a RangeError', () => {
  assert.throws(
    () =>
      getRetrogradeShadow({
        body: CelestialBody.Mercury,
        stationRetroJD: Number.NaN,
        stationDirectJD: Number.NaN,
        stationRetroLongitude: 0,
        stationDirectLongitude: 1,
        durationDays: 0,
      }),
    RangeError,
  );
});

const referenceFile = new URL('../events/__fixtures__/horizons-shadows.json', import.meta.url);
test('Horizons: independent shadow crossings and station-degree zones', () => {
  // Implied longitude error |Δt|·|speed| in arcseconds: measured maxima (2026-10-24) rounded
  // up. It includes the station-longitude error, so it can exceed the ingress limits.
  const limits: Record<string, number> = {
    Mercury: 0.8,
    Venus: 0.8,
    Mars: 0.6,
    Jupiter: 0.4,
    Saturn: 0.2,
    Uranus: 0.4,
    Neptune: 0.25,
    Pluto: 0.2,
  };
  type Reference = {
    body: CelestialBody;
    retro: { jd: number; longitude: number };
    direct: { jd: number; longitude: number };
    pre: { jd: number; speed: number; bracket: number[] };
    post: { jd: number; speed: number; bracket: number[] };
  };
  const rows: Reference[] = JSON.parse(readFileSync(referenceFile, 'utf8'));
  assert.equal(rows.length, 10);
  const errors = [];
  for (const r of rows) {
    const periods = findRetrogradePeriods(r.body, r.retro.jd - 2, r.direct.jd + 2, frame);
    assert.equal(periods.length, 1);
    const p = periods[0]!;
    const s = getRetrogradeShadow(p, frame);
    for (const [actual, expected] of [
      [s.shadowZoneStart, r.direct.longitude],
      [s.shadowZoneEnd, r.retro.longitude],
    ])
      assert.ok(Math.abs(wrap(actual! - expected!)) * 3600 < 3.3, `${r.body} zone`);
    const measured: Record<string, number | string> = { body: r.body, stationTT: r.retro.jd };
    for (const [name, t, ref] of [
      ['pre', s.preShadowStartJD, r.pre],
      ['post', s.postShadowEndJD, r.post],
    ] as const) {
      const [a, b, u, v] = ref.bracket;
      assert.ok(a! <= ref.jd && ref.jd <= b! && u! <= 0 && v! >= 0);
      const minutes = (t - ref.jd) * 1440;
      const arcsec = Math.abs(t - ref.jd) * Math.abs(ref.speed) * 3600;
      assert.ok(arcsec < limits[r.body]!, `${r.body} ${name}: ${arcsec} arcsec`);
      measured[`${name} minutes`] = Number(minutes.toFixed(4));
      measured[`${name} arcsec`] = Number(arcsec.toFixed(5));
    }
    errors.push(measured);
  }
  assert.equal(errors.length, rows.length);
});
