import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { getPosition } from './positions.js';

const limits = JSON.parse(readFileSync(new URL('../../budgets.json', import.meta.url), 'utf8'))
  .precision as Record<string, { lonArcsec: number; latArcsec: number; minSamples: number }>;

describe('NASA/JPL Horizons LT+S, mean ecliptic/equinox of date', () => {
  for (const [
    body,
    { lonArcsec: lonLimit, latArcsec: latLimit, minSamples: count },
  ] of Object.entries(limits)) {
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
