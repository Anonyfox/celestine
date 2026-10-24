/**
 * Held-out JPL Horizons checks for the asteroid mean elements (end-to-end apparent positions).
 *
 * @remarks
 * Fixtures: random epochs from Horizons OBSERVER QUANTITIES 31 (apparent, true ecliptic of date),
 * not on the 10-day vector grid the elements were fitted to. The library reports the mean
 * ecliptic of date, so the reference is corrected by the two leading nutation-in-longitude terms
 * (±17.2″ and ±1.3″, far below these limits). Limits are the measured max/RMS (arcminutes,
 * 2026-10-24) plus about 5%; they bound two-body mean-element error, mostly Jupiter perturbations.
 */

import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { getCeresPosition } from './ceres.js';
import { getJunoPosition } from './juno.js';
import { getPallasPosition } from './pallas.js';
import { getVestaPosition } from './vesta.js';

type Row = [jdTT: number, lon: number, lat: number];
const D = Math.PI / 180;

const BODIES = {
  ceres: { fn: getCeresPosition, '2000-2050': [43, 15], '1800-2200': [84, 26] },
  pallas: { fn: getPallasPosition, '2000-2050': [184, 43], '1800-2200': [280, 68] },
  juno: { fn: getJunoPosition, '2000-2050': [108, 24], '1800-2200': [165, 42] },
  vesta: { fn: getVestaPosition, '2000-2050': [41, 10], '1800-2200': [60, 16] },
} as const;

function errors(fn: (jd: number) => { longitude: number; latitude: number }, rows: Row[]) {
  let sum = 0;
  let max = 0;
  for (const [jd, lon, lat] of rows) {
    const T = (jd - 2451545) / 36525;
    const nut =
      (-17.2 / 3600) * Math.sin((125.04452 - 1934.136261 * T) * D) -
      (1.32 / 3600) * Math.sin((560.933 + 72001.5396 * T) * D);
    const p = fn(jd);
    const dLon = ((((p.longitude - (lon - nut)) % 360) + 540) % 360) - 180;
    const e = Math.hypot(dLon * Math.cos(lat * D), p.latitude - lat) * 60;
    sum += e * e;
    max = Math.max(max, e);
  }
  return { max, rms: Math.sqrt(sum / rows.length) };
}

describe('asteroid mean elements vs held-out JPL Horizons apparent positions', () => {
  for (const [body, spec] of Object.entries(BODIES)) {
    const fixture = JSON.parse(
      readFileSync(
        new URL(`../__fixtures__/asteroid-heldout/${body}.json`, import.meta.url),
        'utf8',
      ),
    );
    for (const span of ['2000-2050', '1800-2200'] as const) {
      it(`${body} ${span}`, () => {
        const rows: Row[] = fixture[span];
        assert.ok(rows.length >= 100);
        const { max, rms } = errors(spec.fn, rows);
        const [maxLimit, rmsLimit] = spec[span];
        assert.ok(max <= maxLimit, `${body} ${span} max ${max.toFixed(1)}′ > ${maxLimit}′`);
        assert.ok(rms <= rmsLimit, `${body} ${span} RMS ${rms.toFixed(1)}′ > ${rmsLimit}′`);
      });
    }
  }
});
