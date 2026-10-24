import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nutationInLongitude } from '../ephemeris/nutation.js';
import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import { getSunPosition } from '../ephemeris/sun.js';
import { findAspectTimes, findSeasons, findSignIngresses, findVoidOfCourseMoon } from './index.js';
import { wrap } from './search.js';

// Events and the position API share one frame: by default apparent longitude in the mean
// equinox of date; `nutation: true` (events) is `includeNutation: true` (positions), the
// true equinox of date. At every found instant the position API must sit on the target to
// within the root finder's own tolerance, far below any ephemeris error.
const TOLERANCE = 1e-4; // arcseconds
const arcsec = (degrees: number) => Math.abs(wrap(degrees)) * 3600;
const J2000 = 2451545;
// Long enough for several crossings of every body, including Neptune and Pluto.
const span = (body: CelestialBody) =>
  body === 'Moon' ? 60 : ['Neptune', 'Pluto', 'Chiron'].includes(body) ? 36525 : 4000;

test('every sign ingress lies on its cusp in the position API, in both frames', () => {
  for (const body of Object.values(CelestialBody)) {
    for (const nutation of [false, true]) {
      const events = findSignIngresses(body, J2000, J2000 + span(body), { nutation });
      assert.ok(events.length >= 2, `${body}: ${events.length} ingresses`);
      for (const e of events) {
        const cusp = (e.retrograde ? e.previousSign : e.sign) * 30;
        const p = getPosition(body, e.jd, { includeNutation: nutation });
        const residual = arcsec(p.longitude - cusp);
        assert.ok(residual < TOLERANCE, `${body} ${e.jd} nutation:${nutation}: ${residual}″`);
      }
    }
  }
});

test('frames differ by nutation in longitude for every body, nodes and Lilith included', () => {
  for (const body of Object.values(CelestialBody))
    for (const jd of [2415020.3, J2000, 2488070.7]) {
      const mean = getPosition(body, jd).longitude;
      const apparent = getPosition(body, jd, { includeNutation: true }).longitude;
      const dpsi = nutationInLongitude((jd - J2000) / 36525);
      assert.ok(arcsec(apparent - mean - dpsi) < 1e-6, body);
    }
});

test('seasons are true-equinox Sun ingresses; the default Sun ingress is the mean one', () => {
  const seasons = findSeasons(J2000, J2000 + 3653);
  const ingress = (nutation: boolean) =>
    findSignIngresses(CelestialBody.Sun, J2000, J2000 + 3653, { nutation }).filter(
      (e) => e.sign % 3 === 0,
    );
  const apparent = ingress(true);
  const mean = ingress(false);
  assert.equal(seasons.length, 40);
  assert.equal(apparent.length, 40);
  seasons.forEach((s, i) => {
    assert.ok(Math.abs(s.jd - apparent[i]!.jd) * 86400 < 1e-3);
    assert.ok(
      arcsec(getSunPosition(s.jd, { includeNutation: true }).longitude - i * 90) < TOLERANCE,
    );
    // Mean and true crossings differ by Δψ / speed: up to ~18″ / (0.95–1.02°/day) ≈ 19 min.
    const shift = (mean[i]!.jd - s.jd) * 86400;
    const expected =
      (nutationInLongitude((s.jd - J2000) / 36525) * 86400) / getSunPosition(s.jd).longitudeSpeed;
    assert.ok(Math.abs(shift - expected) < 2, `${shift} vs ${expected}`);
  });
});

test('aspect times and void-of-course boundaries agree with default positions', () => {
  for (const target of [CelestialBody.Saturn, 45]) {
    for (const e of findAspectTimes(CelestialBody.Mars, target, J2000, J2000 + 1500)) {
      const q = typeof target === 'number' ? target : getPosition(target, e.jd).longitude;
      const separation = Math.abs(wrap(getPosition(e.body, e.jd).longitude - q));
      assert.ok(Math.abs(separation - e.angle) * 3600 < TOLERANCE);
    }
  }
  for (const period of findVoidOfCourseMoon(J2000, J2000 + 30)) {
    assert.ok(
      arcsec(getPosition(CelestialBody.Moon, period.end).longitude - period.nextSign * 30) <
        TOLERANCE,
    );
    if (period.lastAspect) {
      const { body, angle, jd } = period.lastAspect;
      const separation = Math.abs(
        wrap(getPosition(CelestialBody.Moon, jd).longitude - getPosition(body, jd).longitude),
      );
      assert.ok(Math.abs(separation - angle) * 3600 < TOLERANCE);
    }
  }
});
