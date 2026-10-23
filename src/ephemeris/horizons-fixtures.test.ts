import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { getPosition } from './positions.js';

// Longitude/latitude arcseconds. Controls are pre-shared-pipeline limits;
// their algorithms are deliberately unchanged in this pass.
const limits: Record<string, [number, number, number]> = {
  Mercury: [7, 1.5, 170],
  Pluto: [5, 0.6, 90],
  Sun: [34, 1.3, 60],
  Moon: [8, 2, 20],
  Venus: [35, 4, 20],
  Mars: [42, 2.5, 20],
  Jupiter: [47, 1.2, 20],
  Saturn: [49, 1.6, 20],
  Uranus: [48, 1, 20],
  Neptune: [49, 1.2, 20],
};

describe('NASA/JPL Horizons LT+S, mean ecliptic/equinox of date', () => {
  for (const [body, [lonLimit, latLimit, count]] of Object.entries(limits)) {
    it(`${body}: longitude < ${lonLimit}″; latitude < ${latLimit}″`, () => {
      const fixture = JSON.parse(
        readFileSync(
          new URL(`./__fixtures__/horizons/${body.toLowerCase()}.json`, import.meta.url),
          'utf8',
        ),
      ) as {
        rows: [number, string, number, number, number, number, number][];
        crosscheck_max_arcsec: number;
      };
      assert.ok(fixture.rows.length >= count, 'Fixture coverage must not silently shrink');
      assert.ok(fixture.crosscheck_max_arcsec < 0.5, 'Independent quantity-31 frame check');
      let maxLon = 0;
      let maxLat = 0;
      for (const [jd, , lon, lat] of fixture.rows) {
        const actual = getPosition(body, jd);
        maxLon = Math.max(maxLon, Math.abs(((actual.longitude - lon + 540) % 360) - 180) * 3600);
        maxLat = Math.max(maxLat, Math.abs(actual.latitude - lat) * 3600);
      }
      assert.ok(maxLon < lonLimit, `${body} max longitude error ${maxLon}″`);
      assert.ok(maxLat < latLimit, `${body} max latitude error ${maxLat}″`);
    });
  }
});
