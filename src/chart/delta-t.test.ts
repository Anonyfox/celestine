import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import { deltaTAt, toTT } from '../time/delta-t.js';
import { calculateChart, calculatePlanets } from './chart.js';
import { calculatePlanetPositions } from './planet-positions.js';

// Since 0.5.0 the birth time is civil UT and body ephemerides use TT = UT + ΔT (deltaTAt);
// `deltaT: 0` reproduces the pre-0.5.0 output (UT used as the ephemeris time).
describe('chart ΔT: civil UT input, TT body ephemerides', () => {
  const birth = {
    year: 2026,
    month: 10,
    day: 24,
    hour: 12,
    minute: 0,
    second: 0,
    timezone: 0,
    latitude: 51.5,
    longitude: 0,
  };
  const all = { includeNodes: 'both', includeLilith: 'both' } as const;

  it('defaults to deltaTAt; a number or function override and the 0 opt-out are honoured', () => {
    const chart = calculateChart(birth, all);
    const jd = chart.calculated.julianDate;
    const strip = (c: ReturnType<typeof calculateChart>) => ({ ...c, options: undefined });
    assert.deepEqual(strip(calculateChart(birth, { ...all, deltaT: deltaTAt })), strip(chart));
    assert.deepEqual(strip(calculateChart(birth, { ...all, deltaT: deltaTAt(jd) })), strip(chart));
    assert.deepEqual(calculatePlanets(birth), calculatePlanets(birth, { deltaT: deltaTAt }));
    // Opt-out: UT as ephemeris time, identical for 0 and a zero function.
    assert.deepEqual(
      strip(calculateChart(birth, { ...all, deltaT: () => 0 })),
      strip(calculateChart(birth, { ...all, deltaT: 0 })),
    );
    // The default is TT exactly: the same as UT input + ΔT with the opt-out.
    assert.deepEqual(
      calculatePlanetPositions(jd, chart.options),
      calculatePlanetPositions(toTT(jd), { ...chart.options, deltaT: 0 }),
    );
    // The custom function receives the UT Julian Date once.
    let calls = 0;
    calculateChart(birth, {
      deltaT: (ut) => {
        calls++;
        assert.equal(ut, jd);
        return 0;
      },
    });
    assert.equal(calls, 1);
  });

  it('only bodies shift, each by its speed × ΔT; houses, angles and time data are unchanged', () => {
    for (const year of [1700, 1900, 1950, 2000, 2026, 2050]) {
      const at = { ...birth, year };
      const now = calculateChart(at, all);
      const old = calculateChart(at, { ...all, deltaT: 0 });
      assert.deepEqual(now.houses, old.houses);
      assert.deepEqual(now.angles, old.angles);
      assert.deepEqual(now.calculated, old.calculated);
      const jd = now.calculated.julianDate;
      const dt = deltaTAt(jd) / 86400;
      assert.ok(Math.abs(dt) > 1 / 86400); // ΔT ≈ −2.7 s in 1900, +69 s in 2026
      for (const p of now.planets) {
        const body = p.name as CelestialBody;
        assert.ok(Object.values(CelestialBody).includes(body), p.name);
        const before = old.planets.find((q) => q.name === p.name)!;
        assert.equal(before.longitude, getPosition(body, jd).longitude);
        assert.equal(p.longitude, getPosition(body, toTT(jd)).longitude);
        // Centred rate over ±0.01 d: the shift is linear to <0.002″ for every body.
        const h = 0.01;
        const rate =
          ((((getPosition(body, jd + h).longitude - getPosition(body, jd - h).longitude + 540) %
            360) -
            180) /
            (2 * h)) *
          dt;
        const shift = ((p.longitude - before.longitude + 540) % 360) - 180;
        assert.ok(Math.abs(shift - rate) * 3600 < 0.002, `${year} ${p.name}`);
      }
    }
  });
});
