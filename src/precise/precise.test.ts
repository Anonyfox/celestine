/**
 * celestine/precise: held-out JPL Horizons checks for Chiron, Ceres, Pallas, Juno and Vesta.
 *
 * None of these epochs is on the 2-day fitting grid used by scripts/chiron/gen-cheb.py:
 * - random400-<body>.json: VECTORS (heliocentric 500@10, ecliptic J2000, ICRF, TDB, AU),
 *   400 uniform-random epochs 1800–2200 (model check, isolates the Chebyshev fit).
 * - obs400-<body>.json: OBSERVER QUANTITIES 31 (apparent, true ecliptic of date, TT) at the
 *   same epochs; obs100-2000-2050 and obs60-2020-2030 add present-day epochs (end-to-end check).
 */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import * as root from '../ephemeris/index.js';
import { CERES_CHEBYSHEV } from './ceres-data.js';
import { type ChebyshevModel, chebyshevBody, toRectangular } from './chebyshev.js';
import { CHIRON_CHEBYSHEV } from './chiron-data.js';
import * as precise from './index.js';
import { JUNO_CHEBYSHEV } from './juno-data.js';
import { PALLAS_CHEBYSHEV } from './pallas-data.js';
import { VESTA_CHEBYSHEV } from './vesta-data.js';

const D = Math.PI / 180;
type Rows = number[][];
const rows = (file: string): Rows =>
  JSON.parse(
    readFileSync(new URL(`../../scripts/chiron/holdout/${file}.json`, import.meta.url), 'utf8'),
  ).rows;

type Get = typeof root.getChironPosition;
const BODIES: [string, ChebyshevModel, Get, Get][] = [
  ['Chiron', CHIRON_CHEBYSHEV, precise.getChironPosition, root.getChironPosition],
  ['Ceres', CERES_CHEBYSHEV, precise.getCeresPosition, root.getCeresPosition],
  ['Pallas', PALLAS_CHEBYSHEV, precise.getPallasPosition, root.getPallasPosition],
  ['Juno', JUNO_CHEBYSHEV, precise.getJunoPosition, root.getJunoPosition],
  ['Vesta', VESTA_CHEBYSHEV, precise.getVestaPosition, root.getVestaPosition],
];

/**
 * Reference nutation in longitude (degrees): the 18 largest IAU 1980 terms (Meeus Table 22.A),
 * good to about 0.05″. Used only to bring Horizons' true-of-date longitudes to the mean ecliptic
 * of date that the library returns by default.
 */
const NUTATION: [number, number, number, number, number, number, number][] = [
  [0, 0, 0, 0, 1, -171996, -174.2],
  [-2, 0, 0, 2, 2, -13187, -1.6],
  [0, 0, 0, 2, 2, -2274, -0.2],
  [0, 0, 0, 0, 2, 2062, 0.2],
  [0, 1, 0, 0, 0, 1426, -3.4],
  [0, 0, 1, 0, 0, 712, 0.1],
  [-2, 1, 0, 2, 2, -517, 1.2],
  [0, 0, 0, 2, 1, -386, -0.4],
  [0, 0, 1, 2, 2, -301, 0],
  [-2, -1, 0, 2, 2, 217, -0.5],
  [-2, 0, 1, 0, 0, -158, 0],
  [-2, 0, 0, 2, 1, 129, 0.1],
  [0, 0, -1, 2, 2, 123, 0],
  [2, 0, 0, 0, 0, 63, 0],
  [0, 0, 1, 0, 1, 63, 0.1],
  [2, 0, -1, 2, 2, -59, 0],
  [0, 0, -1, 0, 1, -58, -0.1],
  [0, 0, 1, 2, 1, -51, 0],
];
function nutation(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const args = [
    297.85036 + 445267.11148 * T,
    357.52772 + 35999.05034 * T,
    134.96298 + 477198.867398 * T,
    93.27191 + 483202.017538 * T,
    125.04452 - 1934.136261 * T,
  ];
  let sum = 0;
  for (const [a, b, c, d, e, s, st] of NUTATION)
    sum +=
      (s + st * T) *
      Math.sin((a * args[0] + b * args[1] + c * args[2] + d * args[3] + e * args[4]) * D);
  return sum / 1e4 / 3600;
}

/** Max angular error (arcsec) of `get` against Horizons apparent rows [jdTT, lon, lat]. */
function apparentMax(get: (jd: number) => { longitude: number; latitude: number }, set: Rows) {
  let max = 0;
  for (const [jd, lon, lat] of set) {
    const p = get(jd);
    const dl = ((((p.longitude - (lon - nutation(jd))) % 360) + 540) % 360) - 180;
    max = Math.max(max, Math.hypot(dl * Math.cos(lat * D), p.latitude - lat) * 3600);
  }
  return max;
}

/** Geocentric angular size (arcsec) of a heliocentric position error, crude circular Earth. */
function geocentricArcsec(jd: number, model: number[], truth: number[]): number {
  const el = (100.46 + 0.9856474 * (jd - 2451545)) * D;
  const v = [truth[0] - Math.cos(el), truth[1] - Math.sin(el), truth[2]];
  const dist = Math.hypot(v[0], v[1], v[2]);
  const d = [model[0] - truth[0], model[1] - truth[1], model[2] - truth[2]];
  const along = (d[0] * v[0] + d[1] * v[1] + d[2] * v[2]) / dist;
  const perp = Math.sqrt(Math.max(0, d[0] ** 2 + d[1] ** 2 + d[2] ** 2 - along ** 2));
  return (perp / dist) * 206264.806;
}

describe('celestine/precise', () => {
  for (const [name, model, get, base] of BODIES) {
    const file = name.toLowerCase();
    describe(name, () => {
      it('Chebyshev model matches 400 held-out Horizons vectors to < 1″ (1800–2200)', () => {
        const f = chebyshevBody(model);
        for (const [jd, x, y, z] of rows(`random400-${file}`)) {
          const p = f(jd);
          assert.ok(p, `${name} covered at JD ${jd}`);
          const r = toRectangular(p);
          const err = geocentricArcsec(jd, [r.x, r.y, r.z], [x, y, z]);
          assert.ok(err < 1, `${name} JD ${jd}: ${err.toFixed(3)}″`);
        }
      });

      it('apparent position matches Horizons to < 1″ (1800–2200, 2000–2050, 2020–2030)', () => {
        for (const set of [
          `obs400-${file}`,
          `obs100-2000-2050-${file}`,
          `obs60-2020-2030-${file}`,
        ]) {
          const max = apparentMax(get, rows(set));
          assert.ok(max < 1, `${name} ${set}: max ${max.toFixed(3)}″`);
        }
      });

      it('mirrors the root signature and return shape', () => {
        const jd = 2460676.5;
        const a = get(jd);
        const b = base(jd);
        assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort());
        assert.equal(get.length, 2);
        const slow = get(jd, { includeSpeed: false });
        assert.equal(slow.longitudeSpeed, 0);
        assert.equal(slow.isRetrograde, false);
        assert.ok(Math.abs(slow.longitude - a.longitude) < 1e-6);
        // Speed agrees with a finite difference of the positions.
        const ahead = get(jd + 0.5, { includeSpeed: false }).longitude;
        const behind = get(jd - 0.5, { includeSpeed: false }).longitude;
        const fd = ((((ahead - behind) % 360) + 540) % 360) - 180;
        assert.ok(Math.abs(fd - a.longitudeSpeed) < 1e-4);
        assert.equal(a.isRetrograde, a.longitudeSpeed < 0);
        const nutated = get(jd, { includeNutation: true });
        assert.ok(Math.abs(nutated.longitude - a.longitude) * 3600 < 20);
      });

      it('covers the documented range and throws RangeError outside it', () => {
        const { startJD, endJD } = precise.PRECISE_RANGE;
        for (const jd of [startJD, endJD]) assert.ok(Number.isFinite(get(jd).longitude));
        for (const jd of [startJD - 1e-6, endJD + 1e-6, 2300000, 2600000, Number.NaN])
          assert.throws(() => get(jd), RangeError);
        assert.throws(() => get(Number.NaN), /celestine\/precise: .*\(1800–2200\)/);
      });

      it('is continuous across segment boundaries', () => {
        const f = chebyshevBody(model);
        let boundaries = 0;
        for (let t = model.start + model.grain; t < 2524593.5; t += model.grain) {
          const a = f(t - 1e-6);
          const b = f(t + 1e-6);
          if (!a || !b) continue;
          const pa = toRectangular(a);
          const pb = toRectangular(b);
          if (pa.x !== pb.x) boundaries++;
          const arcsec = geocentricArcsec(t, [pa.x, pa.y, pa.z], [pb.x, pb.y, pb.z]);
          assert.ok(arcsec < 2.5, `${name} step ${arcsec.toFixed(3)}″ at JD ${t}`);
        }
        assert.ok(boundaries > 0);
      });

      it('evaluator returns undefined outside the fitted span', () => {
        const f = chebyshevBody(model);
        assert.equal(f(model.start - 1), undefined);
        assert.equal(f(2600000), undefined);
        assert.equal(f(Number.NaN), undefined);
      });
    });
  }

  it('fixes the 0.3.0–0.4.0 present-day Pallas regression (2020–2030)', () => {
    const set = rows('obs60-2020-2030-pallas');
    const old = apparentMax(root.getPallasPosition, set);
    const now = apparentMax(precise.getPallasPosition, set);
    assert.ok(old > 3600 && now < 1, `root ${old.toFixed(0)}″, precise ${now.toFixed(3)}″`);
  });
});
