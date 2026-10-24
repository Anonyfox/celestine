// Local Horizons vectors are research inputs, not generated test expectations.
// Run after build; then python3 scripts/chiron/refit.py.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import {
  earthHeliocentricPosition,
  precessEcliptic,
} from '../../dist/ephemeris/planets/precision.js';

const dir = '/workspace/chiron-data/vectors-2d/';
const rows = (
  await Promise.all(
    (
      await readdir(dir)
    )
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map(async (f) => JSON.parse(await readFile(dir + f, 'utf8')).rows),
  )
).flat();
const unique = [...new Map(rows.map((r) => [r[0], r])).values()]
  .sort((a, b) => a[0] - b[0])
  .filter((r) => r[0] >= 2415020.5 && r[0] < 2488434.5);
const earth = unique.map(([jd]) => {
  const p = earthHeliocentricPosition((jd - 2451545) / 365250);
  const [l, b] = precessEcliptic(p.longitude, p.latitude, -(jd - 2451545) / 36525);
  return [
    p.distance * Math.cos(b) * Math.cos(l),
    p.distance * Math.cos(b) * Math.sin(l),
    p.distance * Math.sin(b),
  ];
});
await writeFile('/tmp/chiron-earth.json', JSON.stringify(earth));
