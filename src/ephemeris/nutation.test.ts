import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { getMoonPosition } from './moon.js';
import { nutationInLongitude } from './nutation.js';

const { rows } = JSON.parse(
  readFileSync(new URL('./__fixtures__/nutation-iau2000a.json', import.meta.url), 'utf8'),
) as { rows: [number, number][] };

describe('nutationInLongitude (IAU 2000B, 13 terms)', () => {
  it('stays within 0.05″ of full IAU 2000A over 1800–2200', () => {
    assert.ok(rows.length >= 400);
    let max = 0;
    for (const [jd, reference] of rows)
      max = Math.max(max, Math.abs(nutationInLongitude((jd - 2451545) / 36525) * 3600 - reference));
    assert.ok(max < 0.05, `max ${max}″`);
  });

  it('applies to the Moon with includeNutation', () => {
    const jd = 2460000.5;
    const mean = getMoonPosition(jd);
    const apparent = getMoonPosition(jd, { includeNutation: true });
    const delta = apparent.longitude - mean.longitude;
    assert.ok(Math.abs(delta - nutationInLongitude((jd - 2451545) / 36525)) < 1e-9);
    assert.ok(Math.abs(apparent.longitudeSpeed - mean.longitudeSpeed) < 1e-5);
    assert.equal(apparent.latitude, mean.latitude);
  });
});
