// Independent apparent OBSERVER holdout plus dense VECTORS through the apparent pipeline.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { geocentricApparent, precessEcliptic } from '../../dist/ephemeris/planets/precision.js';
import { getChironPosition as precise } from '../../dist/precise/chiron.js';

const d = Math.PI / 180,
  wrap = (x) => (((x % 360) + 540) % 360) - 180;
function old(jd, fitted = false) {
  const t = (jd - 2451545) / 36525,
    e = fitted ? 0.380527 : 0.3793438805668402,
    a = fitted ? 13.6566 : 13.607,
    i = (fitted ? 7.039947 : 6.941566489467262) * d;
  const O = (fitted ? 210.04856 - 3.727894 * t : 209.39667025637 + 0.15 * t) * d,
    w = (fitted ? 338.581754 + 4.290147 * t : 339.1420138434362 + 0.25 * t) * d;
  const M =
    ((fitted ? 27.698721 : 27.99722096634838) +
      (fitted ? 0.01953127397 : 2.273207179302781e-7 * 86400) * (jd - 2451545)) *
    d;
  let E = M;
  for (let k = 0; k < 20; k++) {
    const delta = (M + e * Math.sin(E) - E) / (1 - e * Math.cos(E));
    E += delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  const u =
    w + 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  return [
    Math.atan2(Math.cos(i) * Math.sin(u), Math.cos(u)) + O,
    Math.asin(Math.sin(i) * Math.sin(u)),
    a * (1 - e * Math.cos(E)),
  ];
}
const apparent = (fn, jd) =>
  geocentricApparent(
    (time, observation) => {
      const [l, b, r] = fn(time),
        [longitude, latitude] = precessEcliptic(l, b, (observation - 2451545) / 36525);
      return { longitude, latitude, distance: r };
    },
    jd,
    { includeSpeed: false, includeNutation: true },
  ).longitude;
const dir = '/workspace/chiron-data/vectors-2d/';
const all = (
  await Promise.all(
    (
      await readdir(dir)
    )
      .filter((f) => f.endsWith('.json'))
      .map(async (f) => JSON.parse(await readFile(dir + f, 'utf8')).rows),
  )
).flat();
const rows = [...new Map(all.map((r) => [r[0], r])).values()].sort((a, b) => a[0] - b[0]);
function reference(jd) {
  let lo = 0,
    hi = rows.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (rows[m][0] <= jd) lo = m;
    else hi = m;
  }
  const a = rows[lo],
    b = rows[hi],
    f = (jd - a[0]) / (b[0] - a[0]);
  const [x, y, z] = a.slice(1).map((v, i) => v + (b[i + 1] - v) * f),
    r = Math.hypot(x, y, z);
  return [Math.atan2(y, x), Math.asin(z / r), r];
}
const stats = (e) => ({
  samples: e.length,
  max: Math.max(...e.map(Math.abs)),
  rms: Math.sqrt(e.reduce((s, x) => s + x * x, 0) / e.length),
});
const windows = [];
for (let y = 1900; y < 2100; y += 50) {
  const start = Date.UTC(y, 0, 1) / 86400000 + 2440587.5,
    end = Date.UTC(y + 50, 0, 1) / 86400000 + 2440587.5;
  const errors = { current: [], refit: [], precise: [] };
  let pointwiseWorse = 0;
  for (const [jd] of rows.filter((r, i) => i % 2 === 1 && r[0] >= start && r[0] < end)) {
    const target = apparent(reference, jd);
    const before = wrap(apparent(old, jd) - target) * 3600,
      after = wrap(apparent((t) => old(t, true), jd) - target) * 3600;
    errors.current.push(before);
    errors.refit.push(after);
    errors.precise.push(
      wrap(precise(jd, { includeSpeed: false, includeNutation: true }).longitude - target) * 3600,
    );
    if (Math.abs(after) > Math.abs(before)) pointwiseWorse++;
  }
  windows.push({
    window: `${y}–${y + 50}`,
    ...Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, stats(v)])),
    pointwiseWorse,
  });
}
const obs = JSON.parse(
  await readFile('/workspace/chiron-data/holdout/obs400-chiron.json', 'utf8'),
).rows;
const holdout = [];
for (let y = 1900; y < 2100; y += 50) {
  const start = Date.UTC(y, 0, 1) / 86400000 + 2440587.5,
    end = Date.UTC(y + 50, 0, 1) / 86400000 + 2440587.5;
  const subset = obs.filter((r) => r[0] >= start && r[0] < end);
  holdout.push({
    window: `${y}–${y + 50}`,
    current: stats(subset.map(([jd, l]) => wrap(apparent(old, jd) - l) * 3600)),
    refit: stats(subset.map(([jd, l]) => wrap(apparent((t) => old(t, true), jd) - l) * 3600)),
    precise: stats(
      subset.map(
        ([jd, l]) =>
          wrap(precise(jd, { includeSpeed: false, includeNutation: true }).longitude - l) * 3600,
      ),
    ),
  });
}
const result = {
  denseMethod:
    'held-out 4-day grid; linear interpolation of 2-day heliocentric Horizons vectors for light time, common apparent pipeline; observer holdout below is independent and uses no interpolation',
  windows,
  independentObserverHoldout: holdout,
};
await writeFile('/tmp/chiron-validation.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
