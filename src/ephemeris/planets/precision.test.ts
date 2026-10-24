import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCeresPosition } from '../asteroids/ceres.js';
import { getJunoPosition } from '../asteroids/juno.js';
import { getPallasPosition } from '../asteroids/pallas.js';
import { getVestaPosition } from '../asteroids/vesta.js';
import { getChironPosition } from '../chiron.js';
import { getSunPosition, nutationInLongitude } from '../sun.js';
import { getJupiterPosition } from './jupiter.js';
import { getMarsPosition } from './mars.js';
import { getMercuryPosition } from './mercury.js';
import { getNeptunePosition } from './neptune.js';
import { getPlutoPosition } from './pluto.js';
import {
  aberration,
  earthHeliocentricPosition,
  geocentricApparent,
  heliocentricVelocity,
  helioToGeo,
  precessEcliptic,
} from './precision.js';
import { getSaturnPosition } from './saturn.js';
import { getUranusPosition } from './uranus.js';
import { getVenusPosition } from './venus.js';

const delta = (a: number, b: number) => ((a - b + 540) % 360) - 180;

describe('shared apparent ephemeris pipeline', () => {
  it('honors opt-in nutation while preserving mean default positions and speed units', () => {
    for (const get of [
      getSunPosition,
      getMercuryPosition,
      getVenusPosition,
      getMarsPosition,
      getJupiterPosition,
      getSaturnPosition,
      getUranusPosition,
      getNeptunePosition,
      getPlutoPosition,
      getChironPosition,
    ]) {
      for (const jd of [2415020, 2451545, 2488070]) {
        const mean = get(jd);
        const explicit = get(jd, { includeNutation: false });
        assert.deepEqual(mean, explicit);
        const apparent = get(jd, { includeNutation: true });
        assert.ok(
          Math.abs(
            delta(apparent.longitude, mean.longitude) - nutationInLongitude((jd - 2451545) / 36525),
          ) < 1e-10,
        );
        assert.equal(apparent.latitude, mean.latitude);
        assert.equal(apparent.distance, mean.distance);
        assert.equal(apparent.isRetrograde, apparent.longitudeSpeed < 0);
        const stopped = get(jd, { includeSpeed: false, includeNutation: true });
        assert.equal(stopped.longitudeSpeed, 0);
        assert.equal(stopped.isRetrograde, false);
        // With speed, the position is the midpoint of the ±0.001 d evaluations (< 0.001″ apart).
        assert.ok(Math.abs(delta(stopped.longitude, apparent.longitude)) < 3e-7);
      }
    }
  });

  it('matches independent centered speeds, including wraparound', () => {
    const step = 0.001;
    for (const get of [getMercuryPosition, getMarsPosition, getSaturnPosition, getPlutoPosition]) {
      for (const jd of [2451545, 2458928, 2460000]) {
        const p = get(jd);
        const after = get(jd + step, { includeSpeed: false });
        const before = get(jd - step, { includeSpeed: false });
        const speed = delta(after.longitude, before.longitude) / (2 * step);
        // Full analytic Earth velocity linearizes the centered endpoints.
        assert.ok(Math.abs(p.longitudeSpeed - speed) < 1e-7);
      }
    }
  });

  it('agrees with full independent 0.001-day derivatives over 240 dates per body', () => {
    for (const get of [
      getSunPosition,
      getMercuryPosition,
      getVenusPosition,
      getMarsPosition,
      getJupiterPosition,
      getSaturnPosition,
      getUranusPosition,
      getNeptunePosition,
      getPlutoPosition,
      getChironPosition,
      getCeresPosition,
      getPallasPosition,
      getJunoPosition,
      getVestaPosition,
    ]) {
      for (let i = 0; i < 240; i++) {
        const jd = 2415020 + i * (73050 / 239);
        const before = get(jd - 0.001, { includeSpeed: false });
        const after = get(jd + 0.001, { includeSpeed: false });
        const reference = delta(after.longitude, before.longitude) / 0.002;
        assert.ok(Math.abs(get(jd).longitudeSpeed - reference) < 1.1e-6);
      }
    }
  });

  it('matches the full official Earth series across four centuries', () => {
    // Full CDS VI/81 VSOP87D.ear sums (rad, AU), without runtime truncation.
    for (const [tau, l, b, r] of [
      [-0.2, -1254.910797544277, 2.0827145139122643e-7, 0.9832274321198359],
      [0, 1.7519238681145628, -3.9655715721671785e-6, 0.983327681910549],
      [0.2, 1258.4147869531241, 4.26989426713728e-6, 0.9833896303149919],
    ]) {
      const actual = earthHeliocentricPosition(tau);
      assert.ok(Math.abs(actual.longitude - l) * 206264.806 < 0.5);
      assert.ok(Math.abs(actual.latitude - b) * 206264.806 < 0.5);
      assert.ok(Math.abs(actual.distance - r) < 2e-6);
    }
  });

  it('derives the Sun from the shared Earth vector', () => {
    const p = earthHeliocentricPosition(0);
    const sun = getSunPosition(2451545, { includeSpeed: false });
    assert.ok(Math.abs(sun.distance - p.distance) < 1e-14);
    assert.ok(Math.abs(sun.latitude + (p.latitude * 180) / Math.PI) < 0.00001);
    assert.ok(Math.abs(delta(sun.longitude, (p.longitude * 180) / Math.PI + 180)) < 0.006);
    // Repeated calls share the same deterministic Earth result.
    assert.deepEqual(earthHeliocentricPosition(0), p);
  });

  it('subtracts all three Earth components before applying directional aberration', () => {
    const geo = helioToGeo(
      { longitude: Math.PI / 2, latitude: 0, distance: 2 },
      { longitude: 0, latitude: 0, distance: 1 },
    );
    assert.ok(Math.abs(geo.distance - Math.sqrt(5)) < 1e-14);
    assert.ok(Math.abs(geo.longitude - Math.atan2(2, -1)) < 1e-14);
    assert.equal(geo.latitude, 0);
    const [l, b] = aberration(1, 0.2, 2, 0);
    assert.notEqual(l, 1);
    assert.notEqual(b, 0.2);
    const [lp, bp] = precessEcliptic(1, 0.2, 0);
    assert.ok(Math.abs(lp - 1) < 1e-14);
    assert.ok(Math.abs(bp - 0.2) < 1e-14);
  });

  it('retards a callback by the measured initial light travel time', () => {
    const calls: number[] = [];
    geocentricApparent(
      (jd) => {
        calls.push(jd);
        return { longitude: 1, latitude: 0.1, distance: 2 };
      },
      2451545,
      { includeSpeed: false },
    );
    const earth = earthHeliocentricPosition(0);
    const distance = helioToGeo({ longitude: 1, latitude: 0.1, distance: 2 }, earth).distance;
    assert.equal(calls.length, 2);
    assert.ok(Math.abs(calls[1] - (2451545 - distance * 0.0057755183)) < 1e-9);
  });

  it('computes dominant harmonic velocities in radians/AU per day', () => {
    const terms = [[2e8, 0, 1]] as const;
    const v = heliocentricVelocity(terms, terms, terms, 1e8, Math.PI / 2);
    assert.ok(Math.abs(v[0] + 1 / 365250) < 1e-15);
    assert.ok(Math.abs(v[1] + 2 / 365250) < 1e-15);
    assert.equal(v[1], v[2]);
    assert.deepEqual(heliocentricVelocity([], [], [], 0, 0), [0, 0, 0]);
  });
});
