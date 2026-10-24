// node scripts/chiron/compare-events.mjs before.json [--record]
// Record before a change; compare after rebuilding. Every result field is compared.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { findSignIngresses } from '../../dist/events/index.js';

const result = {};
for (const body of [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
])
  result[body] = findSignIngresses(body, 2451544.5, 2462502.5, { includeNutation: true });
const serialized = JSON.stringify(result);
if (process.argv.includes('--record')) await writeFile(process.argv[2], serialized);
else {
  assert.equal(serialized, await readFile(process.argv[2], 'utf8'));
  console.log('Classic-body ingress objects over 2000–2030 are bit-identical.');
}
