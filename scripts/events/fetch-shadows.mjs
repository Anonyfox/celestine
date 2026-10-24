// Run after npm run build. Predictions choose windows only; all references are Horizons TT.
import { writeFile } from 'node:fs/promises';
import { ephemeris, transits } from '../../dist/index.js';
import { query } from './horizons.mjs';
import { derive, evaluate, fit } from './shadow-fit.mjs';

const wrap = (x) => (((x % 360) + 540) % 360) - 180;
const jd = (y) => Date.UTC(y, 0, 1) / 86400000 + 2440587.5;
const cases = {
  Mercury: ['199', 2026, 2027, 1],
  Venus: ['299', 2026, 2027, 1.5],
  Mars: ['499', 2026, 2028, 2],
  Jupiter: ['599', 2026, 2028, 2],
  Saturn: ['699', 2025, 2026, 2],
  Uranus: ['799', 2026, 2028, 2],
  Neptune: ['899', 2025, 2026, 2],
  Pluto: ['999', 2026, 2027, 2],
};
async function station(id, center, half) {
  for (let pass = 0; pass < 10; pass++) {
    const xs = Array.from({ length: 17 }, (_, k) => (k - 8) / 8);
    const { rows } = await query(
      id,
      xs.map((x) => center + x * half),
    );
    const first = Number(rows[0][3]);
    const ys = rows.map((r) => first + wrap(Number(r[3]) - first));
    const c = fit(xs, ys, 4),
      d = derive(c),
      dd = derive(d);
    let x = 0;
    for (let k = 0; k < 50; k++) x -= evaluate(d, x) / evaluate(dd, x);
    if (!Number.isFinite(x)) throw Error('No station extremum');
    if (Math.abs(x) >= 0.25) {
      center += Math.max(-1, Math.min(1, x)) * half;
      continue;
    }
    return {
      jd: center + x * half,
      longitude: (evaluate(c, x) + 360) % 360,
      fitResidualArcsec: Math.max(...xs.map((v, i) => Math.abs(evaluate(c, v) - ys[i]))) * 3600,
    };
  }
  throw Error('Station did not converge');
}
async function crossing(body, id, predicted, target) {
  const speed = Math.abs(ephemeris.getPosition(body, predicted).longitudeSpeed);
  const step = Math.min(0.1, 3 / 3600 / speed);
  let center = predicted;
  for (let pass = 0; pass < 10; pass++) {
    const dates = Array.from({ length: 17 }, (_, k) => center + (k - 8) * step);
    const { rows } = await query(id, dates);
    const values = rows.map((r) => wrap(Number(r[3]) - target));
    for (let i = 0; i < 16; i++) {
      if (values[i] <= 0 && values[i + 1] >= 0 && values[i + 1] - values[i] < 180) {
        const [a, b, u, v] = [dates[i], dates[i + 1], values[i], values[i + 1]];
        return { jd: a - (u * (b - a)) / (v - u), speed: (v - u) / (b - a), bracket: [a, b, u, v] };
      }
    }
    // Recenter from source residuals, never substitute a library reference.
    const slope = (values[16] - values[0]) / (16 * step);
    center -= values[8] / slope;
  }
  throw Error(`${body}: no crossing bracket`);
}
const result = [];
for (const [body, [id, a, b, half]] of Object.entries(cases)) {
  let periods = transits.findRetrogradePeriods(body, jd(a), jd(b), { includeNutation: true });
  if (body !== 'Mercury') periods = periods.filter((p) => p.stationRetroJD >= jd(a)).slice(0, 1);
  for (const p of periods) {
    const shadow = transits.getRetrogradeShadow(p, { includeNutation: true });
    const retro = await station(id, p.stationRetroJD, half);
    const direct = await station(id, p.stationDirectJD, half);
    const pre = await crossing(body, id, shadow.preShadowStartJD, direct.longitude);
    const post = await crossing(body, id, shadow.postShadowEndJD, retro.longitude);
    const row = { body, frame: 'true', retro, direct, pre, post };
    result.push(row);
    console.log(
      body,
      new Date((retro.jd - 2440587.5) * 86400000).toISOString().slice(0, 10),
      ...[
        [shadow.preShadowStartJD, pre],
        [shadow.postShadowEndJD, post],
      ].map(
        ([t, r]) =>
          `${((t - r.jd) * 1440).toFixed(4)} min / ${(Math.abs(t - r.jd) * r.speed * 3600).toFixed(5)} arcsec`,
      ),
    );
  }
}
await writeFile(
  new URL('../../src/events/__fixtures__/horizons-shadows.json', import.meta.url),
  `${JSON.stringify(result, null, 2)}\n`,
);
