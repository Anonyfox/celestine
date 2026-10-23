// Reproduce with node scripts/horizons/fetch-fixtures.mjs. No dependencies.
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const dir = new URL('../../src/ephemeris/__fixtures__/horizons/', import.meta.url);
await mkdir(dir, { recursive: true });
const rad = Math.PI / 180;
const wrap = (x) => ((x % 360) + 360) % 360;
export function meanEcliptic(jd, [x, y, z]) {
  const t = (jd - 2451545) / 36525,
    a = rad / 3600;
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t ** 3) * a;
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t ** 3) * a;
  const zee = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t ** 3) * a;
  const u = Math.cos(zeta) * x - Math.sin(zeta) * y;
  const v = Math.sin(zeta) * x + Math.cos(zeta) * y;
  const w = Math.cos(theta) * u - Math.sin(theta) * z;
  const zz = Math.sin(theta) * u + Math.cos(theta) * z;
  const xx = Math.cos(zee) * w - Math.sin(zee) * v;
  const yy = Math.sin(zee) * w + Math.cos(zee) * v;
  const e = (84381.448 - 46.815 * t - 0.00059 * t * t + 0.001813 * t ** 3) * a;
  const ey = Math.cos(e) * yy + Math.sin(e) * zz;
  const ez = -Math.sin(e) * yy + Math.cos(e) * zz;
  return [
    wrap(Math.atan2(ey, xx) / rad),
    Math.atan2(ez, Math.hypot(xx, ey)) / rad,
    Math.hypot(x, y, z),
  ];
}
function nutation(jd) {
  const t = (jd - 2451545) / 36525;
  return (
    (-17.2 * Math.sin((125.04452 - 1934.136261 * t) * rad) -
      1.32 * Math.sin(2 * (280.4665 + 36000.7698 * t) * rad) -
      0.23 * Math.sin(2 * (218.3165 + 481267.8813 * t) * rad) +
      0.21 * Math.sin(2 * (125.04452 - 1934.136261 * t) * rad)) /
    3600
  );
}
const jd = (iso) => Date.parse(iso + 'T12:00:00Z') / 86400000 + 2440587.5;
async function query(id, dates, type) {
  if (dates.length > 50) {
    const chunks = [];
    for (let i = 0; i < dates.length; i += 50)
      chunks.push(await query(id, dates.slice(i, i + 50), type));
    return {
      sources: [...new Set(chunks.flatMap((c) => c.sources))],
      rows: chunks.flatMap((c) => c.rows),
    };
  }
  const params = {
    format: 'json',
    COMMAND: id,
    CENTER: '500@399',
    EPHEM_TYPE: type,
    TLIST: dates.join('\n'),
    TLIST_TYPE: 'JD',
    CSV_FORMAT: 'YES',
    REF_SYSTEM: 'ICRF',
    TIME_TYPE: type === 'VECTORS' ? 'TDB' : 'TT',
    ...(type === 'VECTORS'
      ? { REF_PLANE: 'FRAME', VEC_CORR: 'LT+S', OUT_UNITS: 'AU-D', VEC_TABLE: '1' }
      : { QUANTITIES: '31', EXTRA_PREC: 'YES', APPARENT: 'AIRLESS' }),
  };
  const url = new URL('https://ssd.jpl.nasa.gov/api/horizons.api');
  for (const [k, v] of Object.entries(params))
    url.searchParams.set(k, k === 'format' ? v : `'${v}'`);
  const result = JSON.parse(
    execFileSync('curl', ['--fail', '--silent', '--show-error', '--retry', '3', url.href], {
      maxBuffer: 5e6,
    }),
  ).result;
  if (!result?.includes('$$SOE')) throw Error(result);
  await new Promise((r) => setTimeout(r, 250));
  return {
    sources: [...new Set([...result.matchAll(/\{source: ([^}]+)\}/g)].map((m) => m[1]))],
    rows: result
      .split('$$SOE')[1]
      .split('$$EOE')[0]
      .trim()
      .split('\n')
      .map((s) => s.split(',').map((s) => s.trim())),
  };
}
for (const [name, id, count, start, end] of [
  ['Mercury', '199', 101, 1800, 2200],
  ['Pluto', '999', 85, 1885, 2099],
  ['Sun', '10', 61, 1800, 2200],
  ...['Moon', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].map((n, i) => [
    n,
    ['301', '299', '499', '599', '699', '799', '899'][i],
    20,
    1900,
    2100,
  ]),
]) {
  const dates = Array.from({ length: count }, (_, i) =>
    Math.round(
      jd(`${start}-01-01`) + ((jd(`${end}-12-31`) - jd(`${start}-01-01`)) * i) / (count - 1),
    ),
  );
  if (name === 'Mercury')
    for (const center of [
      '1907-11-14',
      '1953-11-14',
      '2006-11-08',
      '2016-05-09',
      '2019-11-11',
      '2095-05-08',
    ])
      for (let d = -8; d <= 8; d += 2) dates.push(jd(center) + d);
  if (name === 'Mercury' || name === 'Pluto')
    dates.push(2451545, 2458850, 2448058, 2448724.5, 2440587.5, 2459580.5);
  if (name === 'Mercury')
    for (const center of ['1900-03-04', '2000-02-15', '2100-01-29'])
      for (let d = -2; d <= 2; d++) dates.push(jd(center) + d);
  dates.sort((a, b) => a - b);
  const v = await query(id, dates, 'VECTORS'),
    o = await query(id, dates, 'OBSERVER');
  let maxCheck = 0;
  const rows = v.rows.map((r, i) => {
    const time = +r[0],
      m = meanEcliptic(time, r.slice(2, 5).map(Number)),
      q = o.rows[i].slice(3, 5).map(Number);
    const delta = wrap(m[0] + nutation(time) - q[0] + 180) - 180;
    maxCheck = Math.max(maxCheck, Math.abs(delta) * 3600);
    return [
      time,
      new Date((time - 2440587.5) * 86400000).toISOString().replace('Z', ''),
      ...m.map((x, j) => +x.toFixed(j === 2 ? 7 : 6)),
      ...q,
    ];
  });
  if (
    rows.length !== dates.length ||
    maxCheck >= 0.5 ||
    rows.some((r) => r.slice(2).some((x) => !Number.isFinite(x)))
  ) {
    throw Error(`${name}: incomplete or inconsistent Horizons output`);
  }
  await writeFile(
    new URL(`${name.toLowerCase()}.json`, dir),
    JSON.stringify(
      {
        body: name,
        target: id,
        retrieved: '2026-10-23',
        sources: v.sources,
        columns: [
          'jd_tt',
          'iso_tt',
          'lon_mean_deg',
          'lat_mean_deg',
          'distance_au',
          'lon_q31_deg',
          'lat_q31_deg',
        ],
        crosscheck_max_arcsec: maxCheck,
        rows,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(name, rows.length, 'cross-check arcsec', maxCheck);
}
