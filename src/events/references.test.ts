import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { CelestialBody } from '../ephemeris/positions.js';
import { getPosition } from '../ephemeris/positions.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { toTT } from '../time/delta-t.js';
import type { LunarPhase } from './index.js';
import {
  findAspectTimes,
  findLunarPhases,
  findSeasons,
  findSignIngresses,
  getMoonPhase,
} from './index.js';
import { nutation } from './luminaries.js';
import { wrap } from './search.js';

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`__fixtures__/${name}.json`, import.meta.url), 'utf8'));

// Ingress limits are on the implied longitude error |Δt|·|speed| (arcseconds), rounded up
// from measured maxima in either frame (README), each inside the body's position budget.
// A time limit is ill-conditioned for slow planets (time error = position error / speed,
// unbounded at a station); this bounds every crossing by the ephemeris error instead.
const ingressLimits: Record<string, number> = {
  Sun: 0.32,
  Moon: 7,
  Mercury: 0.4,
  Venus: 0.55,
  Mars: 1.3,
  Jupiter: 1.35,
  Saturn: 0.8,
  Uranus: 2.25,
  Neptune: 2.75,
  Pluto: 3.3,
};
/** Degrees per day from the position API (central difference, frame-independent). */
const speed = (body: CelestialBody, jd: number) =>
  wrap(getPosition(body, jd + 0.01).longitude - getPosition(body, jd - 0.01).longitude) / 0.02;
const aspectLimits: Record<string, number> = {
  Moon: 10,
  Sun: 20,
  // Was 100 s while fixed-longitude references used the library's own 4-term nutation;
  // now 54 s (moving) and 29 s (fixed, mean frame via IAU 2000A).
  Mercury: 60,
  Mars: 75,
  Jupiter: 410,
};

test('USNO: one-to-one phases and seasons over every year 1900–2100, compared on UT', () => {
  for (const kind of ['phases', 'seasons']) {
    const years = fixture(`usno-${kind}`) as Record<string, [number, number][]>;
    assert.equal(Object.keys(years).length, 201);
    for (const [year, rows] of Object.entries(years)) {
      const a = Date.UTC(Number(year), 0, 1) / 86400000 + 2440587.5;
      const b = Date.UTC(Number(year) + 1, 0, 1) / 86400000 + 2440587.5;
      const actual = (kind === 'phases' ? findLunarPhases : findSeasons)(toTT(a), toTT(b));
      assert.equal(actual.length, rows.length, `${kind} ${year}: no missing/extra events`);
      rows.forEach(([jdUT, index], i) => {
        const e = actual[i]!;
        const name =
          'phase' in e
            ? ['new-moon', 'first-quarter', 'full-moon', 'last-quarter'][index]
            : ['march-equinox', 'june-solstice', 'september-equinox', 'december-solstice'][index];
        assert.equal('phase' in e ? e.phase : e.type, name);
        const error = Math.abs(e.jdUT - jdUT) * 86400;
        assert.ok(
          error < 60,
          `${kind} ${year} ${name}: ${error.toFixed(3)} s UT (includes ±30 s source rounding)`,
        );
      });
    }
  }
});

// Every reference is compared in its own frame (fixture `frame`, README): `jd` is Horizons'
// native true equinox of date (or frame-free for phases and moving aspects); `jdMean` is the
// same crossing in the mean equinox of date, the library default, derived with IAU 2000A.
type Reference = {
  kind: string;
  frame: 'true' | 'relative';
  body: CelestialBody;
  targetBody?: CelestialBody;
  fixed?: number;
  angle: number;
  phase: LunarPhase;
  predicted: number;
  jd: number;
  jdMean?: number;
  triplePass?: boolean;
  triplePassMoving?: boolean;
  retrograde?: boolean;
};
/** One event in ±0.2 d around a reference: wide for every limit, narrower than any repeat. */
function only<T extends { jd: number }>(events: T[], label: string): T {
  assert.equal(events.length, 1, label);
  return events[0]!;
}

test('Horizons: independent fine-grid crossing times on TT, each in its own frame', () => {
  const rows = fixture('horizons-events') as Reference[];
  const counts = { phase: 0, season: 0, ingress: 0, aspect: 0 };
  const unique = new Set<string>();
  for (const r of rows) {
    unique.add(`${r.kind}/${r.body}/${r.jd}`);
    counts[r.kind as keyof typeof counts]++;
    assert.equal(
      r.frame,
      r.kind === 'season' || r.kind === 'ingress' || 'fixed' in r ? 'true' : 'relative',
    );
    assert.equal(r.jdMean !== undefined, r.frame === 'true');
    const label = `${r.kind} ${r.body} ${r.jd}`;
    const near = (jd: number) => [jd - 0.2, jd + 0.2] as const;
    if (r.kind === 'ingress') {
      for (const [ref, nutation] of [
        [r.jdMean!, false],
        [r.jd, true],
      ] as const) {
        const e = only(findSignIngresses(r.body, ...near(ref), { nutation }), label);
        const arcsec = Math.abs(e.jd - ref) * Math.abs(speed(r.body, ref)) * 3600;
        assert.ok(
          arcsec < ingressLimits[r.body]!,
          `${label} nutation:${nutation}: ${arcsec.toFixed(3)}″ > ${ingressLimits[r.body]}″`,
        );
      }
      continue;
    }
    let error: number;
    let limit: number;
    if (r.kind === 'phase') {
      error = only(findLunarPhases(...near(r.jd), { phases: [r.phase] }), label).jd - r.jd;
      limit = 17;
    } else if (r.kind === 'season') {
      // Seasons are defined on the true equinox (USNO, Meeus ch. 27); the same crossing in
      // the default mean frame is the Sun's cardinal ingress.
      error = only(findSeasons(...near(r.jd)), label).jd - r.jd;
      const mean = only(findSignIngresses('Sun' as CelestialBody, ...near(r.jdMean!)), label);
      assert.ok(Math.abs(mean.jd - r.jdMean!) * 86400 < 11, `${label} mean`);
      limit = 11;
    } else {
      // A fixed longitude is in the default mean frame, so it is compared with jdMean.
      const ref = r.fixed === undefined ? r.jd : r.jdMean!;
      const angles = [Math.min(r.angle, 360 - r.angle)];
      error =
        only(findAspectTimes(r.body, r.targetBody ?? r.fixed!, ...near(ref), { angles }), label)
          .jd - ref;
      limit = aspectLimits[r.body]!;
    }
    error = Math.abs(error) * 86400;
    assert.ok(error < limit, `${label}: ${error.toFixed(3)} s TT > ${limit}`);
  }
  assert.equal(unique.size, rows.length, 'Reference events must be distinct');
  assert.ok(
    counts.phase >= 60 && counts.season >= 40 && counts.ingress >= 120 && counts.aspect >= 40,
  );
  assert.equal(rows.filter((r) => r.triplePass).length, 3);
  assert.equal(rows.filter((r) => r.triplePassMoving).length, 3);
  assert.ok(rows.filter((r) => r.retrograde).length >= 10);
});

test('Horizons: empirical true-equinox confirmation and illuminated fractions', () => {
  for (const r of fixture('frame')) {
    const p = getSunPosition(r.jd).longitude;
    const corrected = p + nutation(r.jd);
    assert.ok(Math.abs(wrap(corrected - r.reference)) * 3600 < 0.3);
    assert.ok(Math.abs(wrap(corrected - r.reference)) < Math.abs(wrap(p - r.reference)));
  }
  const rows = fixture('illumination') as [number, number][];
  assert.ok(rows.length >= 50);
  for (const [jd, fraction] of rows)
    assert.ok(Math.abs(getMoonPhase(jd).illumination - fraction) < 0.000041);
});
