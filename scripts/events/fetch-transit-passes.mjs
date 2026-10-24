// Run with node --import tsx scripts/events/fetch-transit-passes.mjs.
// Predicted TT times select query epochs only; reference longitudes come from Horizons.
import { mkdir, writeFile } from 'node:fs/promises';
import { findTransitPasses } from '../../src/events/transit-passes.ts';
import { query } from '../events/horizons.mjs';

const cases = [
  ['Moon', '301', 280, 90, 2, 2460310.5, 2460400.5],
  ['Mars', '499', 280, 90, 2, 2460310.5, 2461041.5],
  ['Jupiter', '599', 70, 0, 2, 2460310.5, 2461041.5],
  ['Saturn', '699', 345, 0, 1, 2460310.5, 2461041.5],
];
const references = [];
for (const [body, id, natalLongitude, aspectAngle, orb, startJD, endJD] of cases) {
  const passes = findTransitPasses(body, natalLongitude, aspectAngle, orb, startJD, endJD).slice(
    0,
    3,
  );
  const epochs = passes.flatMap((p) => [
    { jd: p.enterOrbJD, boundary: true },
    ...p.exactJDs.map((jd) => ({ jd, boundary: false })),
    { jd: p.leaveOrbJD, boundary: true },
  ]);
  const dates = epochs.map(({ jd }) => jd);
  const { rows } = await query(id, dates);
  if (rows.length !== dates.length) throw Error('Missing Horizons rows');
  references.push({
    body,
    natalLongitude,
    aspectAngle,
    orb,
    startJD,
    endJD,
    samples: rows.map((row, i) => ({
      ...epochs[i],
      longitude: Number(row[3]),
    })),
  });
}
const dir = new URL('../../src/events/__fixtures__/', import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(
  new URL('horizons-transit-passes.json', dir),
  `${JSON.stringify(references, null, 2)}\n`,
);
