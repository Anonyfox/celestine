import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { CelestialBody } from '../ephemeris/positions.js';
import { getPosition } from '../ephemeris/positions.js';
import { toTT, toUT } from '../time/delta-t.js';
import {
  findNextStation,
  findRetrogradePeriods,
  findStationPoints,
  getCurrentRetrogradePeriod,
} from '../transits/index.js';
import { findStations } from './index.js';
import { wrap } from './search.js';

type Reference = {
  body: CelestialBody;
  type: string;
  jd: number;
  longitude: number;
  jdMean: number;
  longitudeMean: number;
};
const references = JSON.parse(
  readFileSync(new URL('__fixtures__/horizons-stations.json', import.meta.url), 'utf8'),
) as Reference[];

// Seconds; measured maxima with includeNutation (README) plus a margin.
const timeLimits: Record<string, number> = {
  Mercury: 60,
  Venus: 30,
  Mars: 150,
  Jupiter: 400,
  Saturn: 480,
  Uranus: 360,
  Neptune: 600,
  Pluto: 4200,
};
const BODIES = Object.keys(timeLimits) as CelestialBody[];
const jd = (year: number, month = 1, day = 1) =>
  Date.UTC(year, month - 1, day) / 86400000 + 2440587.5;

test('Horizons: true-of-date stations 1900–2100 within per-body time and 4″ longitude limits', () => {
  assert.equal(references.length, 7 * 16 + 48);
  for (const ref of references) {
    const found = findStations(ref.body, ref.jd - 10, ref.jd + 10, { includeNutation: true });
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

test('cross-check: getPosition longitudeSpeed changes sign at each station, both frames', () => {
  const d = 0.01; // 14.4 min
  for (const includeNutation of [false, true]) {
    for (const body of BODIES) {
      const span = body === 'Mercury' ? 4 : body === 'Venus' || body === 'Mars' ? 10 : 25;
      const stations = findStations(body, jd(2020), jd(2020 + span), { includeNutation });
      assert.ok(stations.length >= 2, `${body}: stations found`);
      for (const s of stations) {
        const at = (t: number) => getPosition(body, t, { includeNutation });
        const before = at(s.jd - d).longitudeSpeed;
        const after = at(s.jd + d).longitudeSpeed;
        assert.ok(before * after < 0, `${body} ${s.jd}: sign change`);
        assert.equal(s.type, before > 0 ? 'retrograde' : 'direct');
        // Solved to 1e-7 d: the rate there is below 1e-4″/day for every body.
        assert.ok(Math.abs(at(s.jd).longitudeSpeed) * 3600 < 1e-4, `${body} ${s.jd}: rate`);
        assert.ok(Math.abs(wrap(at(s.jd).longitude - s.longitude)) < 1e-9);
      }
    }
  }
});

test('one station solver: transits findStationPoints equals default-frame findStations', () => {
  for (const body of BODIES) {
    const a = jd(2000);
    const b = jd(body === 'Mercury' ? 2004 : 2030);
    const points = findStationPoints(body, a, b);
    const stations = findStations(body, a, b);
    assert.equal(points.length, stations.length, body);
    points.forEach((p, i) => {
      const s = stations[i]!;
      assert.equal(p.jd, s.jd);
      assert.equal(p.longitude, s.longitude);
      assert.equal(p.type, s.type === 'retrograde' ? 'station-retrograde' : 'station-direct');
    });
  }
  // Chiron stays supported by transits; invalid or empty ranges still return [] there.
  const chiron = findStationPoints('Chiron' as CelestialBody, jd(2020), jd(2030));
  assert.ok(chiron.length >= 18);
  for (const s of chiron)
    assert.ok(Math.abs(getPosition('Chiron' as CelestialBody, s.jd).longitudeSpeed) * 3600 < 1e-4);
  assert.deepEqual(findStationPoints('Mars' as CelestialBody, jd(2027), jd(2026)), []);
  assert.deepEqual(findStationPoints('Mars' as CelestialBody, Number.NaN, jd(2026)), []);
  assert.deepEqual(findStationPoints('Sun' as CelestialBody, jd(2020), jd(2030)), []);
  // A station in the final partial step is found (0.4.0 skipped it): Uranus, 2100-12-26.
  const tail = findStationPoints('Uranus' as CelestialBody, 2488060, 2488070);
  assert.equal(tail.length, 1);
  assert.equal(tail[0]!.type, 'station-direct');
});

test('`nutation` is a deprecated alias of includeNutation on findStations', () => {
  const body = 'Saturn' as CelestialBody;
  const canonical = findStations(body, jd(2020), jd(2030), { includeNutation: true });
  assert.deepEqual(findStations(body, jd(2020), jd(2030), { nutation: true }), canonical);
  assert.notDeepEqual(findStations(body, jd(2020), jd(2030)), canonical);
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

// Retrograde periods: the same shared solver, so the same instants, in either frame.
const periodStations = (body: CelestialBody, a: number, b: number, includeNutation = false) =>
  findRetrogradePeriods(body, a, b, { includeNutation }).flatMap((p) => [
    { type: 'retrograde', jd: p.stationRetroJD, longitude: p.stationRetroLongitude },
    { type: 'direct', jd: p.stationDirectJD, longitude: p.stationDirectLongitude },
  ]);
const nearest = (list: { type: string; jd: number }[], type: string, at: number) =>
  Math.min(...list.filter((s) => s.type === type).map((s) => Math.abs(s.jd - at)));

// Seconds; measured maxima of the mean-frame references (jdMean, README) plus a margin.
const meanLimits: Record<string, number> = {
  Mercury: 60,
  Venus: 40,
  Mars: 150,
  Jupiter: 360,
  Saturn: 360,
  Uranus: 150,
  Neptune: 330,
  Pluto: 4200,
};

test('Horizons, both frames: findStations and findRetrogradePeriods within per-body limits', () => {
  for (const ref of references) {
    const [a, b] = [ref.jd - 200, ref.jd + 200];
    const [mean] = findStations(ref.body, ref.jdMean - 10, ref.jdMean + 10);
    assert.equal(mean!.type, ref.type);
    assert.ok(Math.abs(mean!.jd - ref.jdMean) * 86400 < meanLimits[ref.body]!, `${ref.body} mean`);
    assert.ok(Math.abs(wrap(mean!.longitude - ref.longitudeMean)) * 3600 < 4);
    const dm = nearest(periodStations(ref.body, a, b), ref.type, ref.jdMean) * 86400;
    assert.ok(
      dm < meanLimits[ref.body]!,
      `${ref.body} ${ref.jdMean}: mean period ${dm.toFixed(0)} s`,
    );
    const dt = nearest(periodStations(ref.body, a, b, true), ref.type, ref.jd) * 86400;
    assert.ok(dt < timeLimits[ref.body]!, `${ref.body} ${ref.jd}: true period ${dt.toFixed(0)} s`);
  }
});

test('findRetrogradePeriods, findNextStation and getCurrentRetrogradePeriod use the station solver in both frames', () => {
  const [a, b] = [jd(2026), jd(2031)];
  for (const body of BODIES)
    for (const includeNutation of [false, true]) {
      const solved = findStations(body, a, b, { includeNutation });
      const periods = findRetrogradePeriods(body, a, b, { includeNutation });
      assert.ok(periods.length >= 2, body);
      for (const p of periods) {
        // Exact in the default frame; with nutation the rate samples come from getPosition
        // rather than the events' position(), so equal to within 1e-6 day (0.09 s).
        const tol = includeNutation ? 1e-6 : 0;
        const at = (type: string, t: number) =>
          solved.find((s) => s.type === type && Math.abs(s.jd - t) <= tol);
        const retro = at('retrograde', p.stationRetroJD);
        const direct = at('direct', p.stationDirectJD);
        // A period that began before the range comes from the 180-day look-back.
        assert.ok(retro || p.stationRetroJD < a, `${body} ${includeNutation}`);
        assert.ok(direct, `${body} ${includeNutation}`);
        assert.equal(p.durationDays, p.stationDirectJD - p.stationRetroJD);
        const mid = (p.stationRetroJD + p.stationDirectJD) / 2;
        // Its own search window and scan grid: the same stations to within 1e-6 day (0.09 s).
        const current = getCurrentRetrogradePeriod(body, mid, { includeNutation })!;
        assert.ok(Math.abs(current.stationRetroJD - p.stationRetroJD) < 1e-6);
        assert.ok(Math.abs(current.stationDirectJD - p.stationDirectJD) < 1e-6);
      }
      const next = findNextStation(body, a, 400, { includeNutation })!;
      assert.ok(Math.abs(next.jd - solved[0]!.jd) <= (includeNutation ? 1e-6 : 0));
    }
  // Default and deprecated alias.
  const m = findRetrogradePeriods('Saturn' as CelestialBody, a, b);
  assert.deepEqual(m, findRetrogradePeriods('Saturn' as CelestialBody, a, b, {}));
  assert.deepEqual(
    findRetrogradePeriods('Saturn' as CelestialBody, a, b, { nutation: true }),
    findRetrogradePeriods('Saturn' as CelestialBody, a, b, { includeNutation: true }),
  );
});

test('consumer reference: 17 Horizons stations 2026–2027 (true of date, UT to the minute)', () => {
  const consumer = JSON.parse(
    readFileSync(new URL('__fixtures__/consumer-stations-2026-2027.json', import.meta.url), 'utf8'),
  ) as { stations: { body: CelestialBody; type: string; utc: string }[] };
  assert.equal(consumer.stations.length, 17);
  const [a, b] = [jd(2026, 6), jd(2028, 6)];
  // Measured maxima (minutes): Mercury 0.67, Venus 0.86, Mars 0.41, Jupiter 2.45, Saturn
  // 4.27, including ±0.5 min reference rounding. The consumer's symmetric-difference method
  // on mean-equinox longitudes: Jupiter 12.3, Saturn 32.9.
  for (const s of consumer.stations) {
    const ut = Date.parse(s.utc) / 86400000 + 2440587.5;
    const minutes = nearest(
      periodStations(s.body, a, b, true).map((p) => ({ ...p, jd: toUT(p.jd) })),
      s.type,
      ut,
    );
    assert.ok(minutes * 1440 < 5, `${s.body} ${s.utc}: ${(minutes * 1440).toFixed(2)} min`);
    const [event] = findStations(s.body, toTT(ut) - 5, toTT(ut) + 5, { includeNutation: true });
    assert.ok(Math.abs(event!.jdUT - ut) * 1440 < 5);
  }
});
