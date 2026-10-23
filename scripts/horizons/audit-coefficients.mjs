// Check EVERY retained Mercury term against the original IMCCE VSOP87D file.
// No coefficient tables are vendored or used at runtime by this audit.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const original = execFileSync(
  'curl',
  [
    '--fail',
    '--silent',
    '--show-error',
    '--retry',
    '3',
    'https://ftp.imcce.fr/pub/ephem/planets/vsop87/VSOP87D.mer',
  ],
  { maxBuffer: 5e6 },
).toString();
const groups = {};
let group;
for (const line of original.trimEnd().split('\n')) {
  if (line.startsWith(' VSOP87')) {
    group = 'LBR'[Number(line[41]) - 1] + line.split('*T**')[1][0];
    groups[group] = [];
  } else groups[group].push(line.trim().split(/\s+/).slice(-3).map(Number));
}
const source = readFileSync(
  new URL('../../src/ephemeris/planets/mercury.ts', import.meta.url),
  'utf8',
);
for (const [key, terms] of Object.entries(groups)) {
  const match = source.match(new RegExp(`const ${key}:.*?= (\\[.*?\\]);`, 's'));
  if (!match) continue;
  const rows = JSON.parse(match[1].replace(/,\s*]/g, ']'));
  let bound = 0;
  for (const [a, b, c] of rows) {
    const ref = terms.reduce((best, r) => (Math.abs(r[2] - c) < Math.abs(best[2] - c) ? r : best));
    // Conservative positional error due solely to coefficient rounding, |tau|<=0.201.
    const error =
      (Math.abs(a - ref[0] * 1e8) + a * (Math.abs(b - ref[1]) + 0.201 * Math.abs(c - ref[2]))) /
      1e8;
    bound += error * 0.201 ** Number(key[1]) * 206264.806;
  }
  console.log(`${key}: ${rows.length} retained terms; rounding bound ${bound.toFixed(4)} arcsec`);
  if (bound > 0.5) throw Error(`${key}: coefficients exceed rounding allowance`);
}
