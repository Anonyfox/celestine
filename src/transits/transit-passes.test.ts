import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { searchTransits } from './transit-search.js';
import type { TransitSearchParams } from './types.js';

test('default search stays byte-for-byte identical, including merged timings', () => {
  const pinned = readFileSync(
    new URL('__fixtures__/default-search.json', import.meta.url),
    'utf8',
  ).trim();
  const { params } = JSON.parse(pinned) as { params: TransitSearchParams };
  assert.equal(JSON.stringify(searchTransits(params)), JSON.stringify(JSON.parse(pinned)));
});
