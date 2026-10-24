import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import { getChironPosition } from '../precise/chiron.js';
import { PRECISE_RANGE } from '../precise/position.js';
import { eventPosition, position } from './bodies.js';
import { findSignIngresses, findTransitPasses } from './index.js';
import { wrap } from './search.js';

const fixture = new URL('./__fixtures__/horizons-chiron-events.json', import.meta.url);

test('Chiron events use shared precise positions, with root fallback outside the speed margin', () => {
  for (const jd of [PRECISE_RANGE.startJD + 0.001, 2451545, PRECISE_RANGE.endJD - 0.001])
    assert.deepEqual(eventPosition(CelestialBody.Chiron, jd), getChironPosition(jd));
  for (const jd of [PRECISE_RANGE.startJD, PRECISE_RANGE.endJD, 2300000, 2600000])
    assert.deepEqual(
      eventPosition(CelestialBody.Chiron, jd),
      getPosition(CelestialBody.Chiron, jd),
    );
});

test('Chiron event positions match independent Horizons OBSERVER holdout within 0.60 arcsecond', async () => {
  const data = JSON.parse(
    await readFile(new URL('./__fixtures__/chiron-observer-holdout.json', import.meta.url), 'utf8'),
  ) as { rows: number[][] };
  assert.equal(data.rows.length, 189);
  for (const [jd, longitude] of data.rows)
    assert.ok(
      Math.abs(wrap(position(CelestialBody.Chiron, jd, true).value - longitude)) * 3600 < 0.6,
      `${jd}`,
    );
});

test('Chiron ingress times match independently interpolated Horizons crossings', async () => {
  const data: {
    ingresses: { jd: number; speed: number; sign: number; retrograde: boolean }[];
    ingressLimitArcsec: number;
  } = JSON.parse(await readFile(fixture, 'utf8'));
  assert.ok(data.ingresses.length >= 4);
  assert.ok(data.ingressLimitArcsec > 0 && data.ingressLimitArcsec <= 1);
  const events = findSignIngresses(CelestialBody.Chiron, 2458849.51, 2464693.51, {
    includeNutation: true,
  });
  assert.equal(events.length, data.ingresses.length);
  for (const [i, reference] of data.ingresses.entries()) {
    const actual = events[i];
    assert.equal(actual.sign, reference.sign);
    assert.equal(actual.retrograde, reference.retrograde);
    assert.ok(
      Math.abs(actual.jd - reference.jd) * Math.abs(reference.speed) * 3600 <=
        data.ingressLimitArcsec,
    );
  }
});

test('Chiron orb boundaries and exact hits use the same precise model', () => {
  const passes = findTransitPasses(CelestialBody.Chiron, 30, 0, 0.2, 2461041, 2461407);
  assert.ok(passes.length >= 2);
  for (const pass of passes) {
    for (const jd of pass.exactJDs)
      assert.ok(Math.abs(wrap(getChironPosition(jd).longitude - 30)) * 3600 < 1e-4);
    for (const jd of [pass.enterOrbJD, pass.leaveOrbJD])
      assert.ok(Math.abs(Math.abs(wrap(getChironPosition(jd).longitude - 30)) - 0.2) * 3600 < 1e-4);
  }
});
