// Horizons apparent Moon and Sun longitudes (true ecliptic and equinox of date, quantity 31)
// at every principal lunar phase of 2025-2027. The library's phase instants only choose the
// request times; the reference longitudes come from Horizons. Run after `npm run build`.
import { writeFile } from 'node:fs/promises';
import { findLunarPhases } from '../../dist/events/index.js';
import { query } from './horizons.mjs';

const jd = (y) => Date.UTC(y, 0, 1) / 86400000 + 2440587.5;
const events = findLunarPhases(jd(2025), jd(2028));
const dates = events.map((e) => Number(e.jd.toFixed(9)));
const columns = [];
for (const body of ['301', '10']) {
  const rows = [];
  // Horizons accepts a limited TLIST length per request.
  for (let i = 0; i < dates.length; i += 40)
    rows.push(...(await query(body, dates.slice(i, i + 40))).rows);
  columns.push(rows.map((row) => Number(row[3])));
}
const out = dates.map((d, i) => [d, events[i].phase, columns[0][i], columns[1][i]]);
await writeFile(
  new URL('../../src/events/__fixtures__/horizons-phase-longitudes.json', import.meta.url),
  `${JSON.stringify(out)}\n`,
);
console.log(`${out.length} phases`);
