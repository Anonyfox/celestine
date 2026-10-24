import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { CelestialBody } from '../ephemeris/positions.js';
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

// Limits follow measured maxima (README), with a small explicit rounding margin.
const ingressLimits: Record<string, number> = {
  Sun: 12,
  Moon: 12,
  Mercury: 12,
  Venus: 150,
  Mars: 100,
  Jupiter: 300,
  Saturn: 620,
  Uranus: 1450,
  Neptune: 2600,
  Pluto: 11500,
};
const aspectLimits: Record<string, number> = {
  Moon: 10,
  Sun: 20,
  Mercury: 100,
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

test('Horizons: independent fine-grid crossing times on TT, including retrograde passes', () => {
  const rows = fixture('horizons-events') as {
    kind: string;
    body: CelestialBody;
    targetBody?: CelestialBody;
    fixed?: number;
    angle: number;
    phase: LunarPhase;
    predicted: number;
    jd: number;
    triplePass?: boolean;
    triplePassMoving?: boolean;
    retrograde?: boolean;
  }[];
  const counts = { phase: 0, season: 0, ingress: 0, aspect: 0 };
  const unique = new Set<string>();
  for (const r of rows) {
    unique.add(`${r.kind}/${r.body}/${r.jd}`);
    counts[r.kind as keyof typeof counts]++;
    // Search ±0.2 d around the independent reference, not the old prediction:
    // wide enough for every limit, far narrower than any repeat crossing.
    const a = r.jd - 0.2,
      b = r.jd + 0.2;
    let actual: { jd: number }[];
    let limit: number;
    if (r.kind === 'phase') {
      actual = findLunarPhases(a, b, { phases: [r.phase] });
      limit = 17;
    } else if (r.kind === 'season') {
      actual = findSeasons(a, b);
      limit = 11;
    } else if (r.kind === 'ingress') {
      actual = findSignIngresses(r.body, a, b, { nutation: true });
      limit = ingressLimits[r.body]!;
    } else {
      actual = findAspectTimes(r.body, r.targetBody ?? r.fixed!, a, b, {
        angles: [Math.min(r.angle, 360 - r.angle)],
      });
      limit = aspectLimits[r.body]!;
    }
    assert.equal(actual.length, 1);
    const error = Math.abs(actual[0]!.jd - r.jd) * 86400;
    assert.ok(error < limit, `${r.kind} ${r.body}: ${error.toFixed(3)} s TT > ${limit}`);
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
