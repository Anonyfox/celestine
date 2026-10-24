import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { CelestialBody } from '../ephemeris/positions.js';
import { getPosition } from '../ephemeris/positions.js';
import { toTT, toUT } from '../time/delta-t.js';
import { findStations } from './index.js';
import { wrap } from './search.js';

type Reference = { body: CelestialBody; type: string; jd: number; longitude: number };
const references = JSON.parse(
  readFileSync(new URL('__fixtures__/horizons-stations.json', import.meta.url), 'utf8'),
) as Reference[];

// Seconds; measured maxima with nutation:true (README) plus a small rounding margin.
const timeLimits: Record<string, number> = {
  Mercury: 60,
  Venus: 40,
  Mars: 180,
  Jupiter: 420,
  Saturn: 1080,
  Uranus: 1500,
  Neptune: 2400,
  Pluto: 4800,
};
const BODIES = Object.keys(timeLimits) as CelestialBody[];
const jd = (year: number, month = 1, day = 1) =>
  Date.UTC(year, month - 1, day) / 86400000 + 2440587.5;

test('Horizons: true-of-date stations 1900–2100 within per-body time and 4″ longitude limits', () => {
  assert.equal(references.length, 7 * 16 + 48);
  for (const ref of references) {
    const found = findStations(ref.body, ref.jd - 10, ref.jd + 10, { nutation: true });
    assert.equal(found.length, 1, `${ref.body} ${ref.jd}: exactly one station nearby`);
    const s = found[0]!;
    assert.equal(s.type, ref.type);
    const dt = Math.abs(s.jd - ref.jd) * 86400;
    assert.ok(dt < timeLimits[ref.body]!, `${ref.body} ${ref.jd}: ${dt.toFixed(0)} s`);
    const dl = Math.abs(wrap(s.longitude - ref.longitude)) * 3600;
    assert.ok(dl < 4, `${ref.body} ${ref.jd}: ${dl.toFixed(2)}″`);
  }
});

test('Mercury 2026–2030: one-to-one with every Horizons station', () => {
  const refs = references.filter(
    (r) => r.body === 'Mercury' && r.jd >= jd(2026) && r.jd < jd(2031),
  );
  const found = findStations('Mercury' as CelestialBody, jd(2026), jd(2031));
  assert.equal(found.length, refs.length);
  assert.ok(refs.length >= 28);
  found.forEach((s, i) => {
    assert.equal(s.type, refs[i]!.type);
    // Default (mean equinox) frame: stations barely depend on it.
    assert.ok(Math.abs(s.jd - refs[i]!.jd) * 86400 < 90);
  });
});

test('cross-check: getPosition longitudeSpeed changes sign at each default-frame station', () => {
  const d = 0.01; // 14.4 min
  for (const body of BODIES) {
    const span = body === 'Mercury' ? 4 : body === 'Venus' || body === 'Mars' ? 10 : 25;
    const stations = findStations(body, jd(2020), jd(2020 + span));
    assert.ok(stations.length >= 2, `${body}: stations found`);
    for (const s of stations) {
      const before = getPosition(body, s.jd - d).longitudeSpeed;
      const after = getPosition(body, s.jd + d).longitudeSpeed;
      assert.ok(before * after < 0, `${body} ${s.jd}: sign change`);
      assert.equal(s.type, before > 0 ? 'retrograde' : 'direct');
      assert.ok(Math.abs(getPosition(body, s.jd).longitude - s.longitude) < 1e-9);
    }
  }
});

test('stations alternate, are chronological, unique, in bounds, with UT and sign', () => {
  for (const body of BODIES) {
    const a = jd(1990);
    const b = jd(body === 'Mercury' ? 2000 : 2040);
    const found = findStations(body, a, b);
    for (const [i, s] of found.entries()) {
      assert.ok(s.jd >= a && s.jd <= b);
      assert.equal(s.body, body);
      assert.ok(Math.abs(s.jdUT - toUT(s.jd)) < 1e-12);
      assert.equal(s.sign, Math.floor(s.longitude / 30));
      assert.ok(s.longitude >= 0 && s.longitude < 360);
      if (i > 0) {
        assert.ok(s.jd - found[i - 1]!.jd > 5, `${body}: distinct stations`);
        assert.notEqual(s.type, found[i - 1]!.type, `${body}: alternation`);
      }
    }
  }
});

test('2026-10 Mercury retrograde: degree label and UT near the lab feed', () => {
  const [s] = findStations(
    'Mercury' as CelestialBody,
    toTT(jd(2026, 10, 20)),
    toTT(jd(2026, 10, 28)),
  );
  assert.equal(s!.type, 'retrograde');
  assert.equal(s!.signName, 'Scorpio');
  assert.equal(Math.floor(s!.longitude % 30), 20);
  // Lab feed: 2026-10-24 07:09:14 UTC.
  assert.ok(Math.abs(s!.jdUT - (jd(2026, 10, 24) + (7 * 3600 + 9 * 60 + 14) / 86400)) * 1440 < 10);
});

test('rejects unsupported bodies and invalid intervals; empty when no station', () => {
  for (const body of ['Sun', 'Moon', 'Chiron', 'TrueNode']) {
    assert.throws(() => findStations(body as CelestialBody, jd(2026), jd(2027)), RangeError);
  }
  assert.throws(() => findStations('Mars' as CelestialBody, jd(2027), jd(2026)), RangeError);
  assert.throws(() => findStations('Mars' as CelestialBody, Number.NaN, jd(2026)), RangeError);
  assert.deepEqual(findStations('Mercury' as CelestialBody, jd(2026, 1, 1), jd(2026, 1, 2)), []);
});
