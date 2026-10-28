// Network-only fixture acquisition. The accuracy report never calls this script.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const dates = Array.from({ length: 61 }, (_, i) =>
  Number(
    (2415020.5 + (73049 * i) / 60 + (i > 0 && i < 60 ? 19 * Math.sin(i * 2.399963) : 0)).toFixed(7),
  ),
);
const requests = [];
const rows = [];
for (let offset = 0; offset < dates.length; offset += 30) {
  const params = {
    format: 'json',
    COMMAND: '301',
    EPHEM_TYPE: 'ELEMENTS',
    CENTER: '500@399',
    REF_PLANE: 'ECLIPTIC',
    REF_SYSTEM: 'ICRF',
    TIME_TYPE: 'TDB',
    TLIST_TYPE: 'JD',
    TLIST: dates.slice(offset, offset + 30).join('\n'),
    CSV_FORMAT: 'YES',
    OUT_UNITS: 'AU-D',
  };
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, key === 'format' ? value : `'${value}'`);
  const response = JSON.parse(
    execFileSync(
      'curl',
      ['--fail', '--silent', '--show-error', '--retry', '3', '--max-time', '120', url.href],
      { maxBuffer: 5e6 },
    ),
  );
  if (!response.result?.includes('$$SOE')) throw Error(JSON.stringify(response));
  requests.push(params);
  for (const line of response.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n')) {
    const columns = line.split(',').map((s) => s.trim());
    const [jd, , eccentricity, periapsis, inclination, ascendingNode] = columns;
    const row = {
      jd: Number(jd),
      eccentricity: Number(eccentricity),
      periapsis: Number(periapsis),
      inclination: Number(inclination),
      ascendingNode: Number(ascendingNode),
    };
    if (!Object.values(row).every(Number.isFinite)) throw Error(line);
    rows.push(row);
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
}
if (rows.length !== dates.length) throw Error('Incomplete Horizons response');
const dir = new URL('../../src/ephemeris/__fixtures__/horizons-node/', import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(
  new URL('moon-node.json', dir),
  `${JSON.stringify({ source: endpoint, retrieved: '2026-10-28', requests, rows }, null, 2)}\n`,
  { flag: 'wx' },
);
console.log(
  `Wrote ${rows.length} osculating Moon elements; run derive-angles.py for ERFA frame references.`,
);
