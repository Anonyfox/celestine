import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { AspectType } from '../aspects/types.js';
import { calculateChart } from '../chart/chart.js';
import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import { chartToNatalPoints, findTransitPasses, searchTransitPasses } from './index.js';

const refs = (
  JSON.parse(
    readFileSync(new URL('./__fixtures__/horizons-events.json', import.meta.url), 'utf8'),
  ) as { kind: string; body: CelestialBody; angle: number; jd: number; jdMean: number }[]
).filter((r) => r.kind === 'ingress' && r.body !== 'Moon');
// Implied longitude error limits (arcsec) of the ingress references in references.test.ts.
const limits: Record<string, number> = {
  Sun: 0.32,
  Mercury: 0.4,
  Venus: 0.55,
  Mars: 1.3,
  Jupiter: 1.35,
  Saturn: 0.8,
  Uranus: 2.25,
  Neptune: 2.75,
  Pluto: 3.3,
};

test('findTransitPasses hits Horizons cusp crossings in both frames', () => {
  let checked = 0;
  for (const r of refs) {
    const speed = Math.abs(getPosition(r.body, r.jd).longitudeSpeed);
    for (const includeNutation of [false, true]) {
      const target = includeNutation ? r.jd : r.jdMean;
      const passes = findTransitPasses(r.body, r.angle, 0, 0.5, target - 3, target + 3, {
        includeNutation,
      });
      const nearest = Math.min(
        ...passes.flatMap((p) => p.exactJDs).map((jd) => Math.abs(jd - target)),
      );
      const arcsec = nearest * speed * 3600;
      assert.ok(arcsec < limits[r.body]!, `${r.body} ${r.jd} ${includeNutation}: ${arcsec}″`);
      checked++;
    }
  }
  assert.ok(checked >= 200, `${checked}`);
});

const params = {
  startJD: 2461041.5,
  endJD: 2461406.5,
  natalPoints: [
    { name: 'Sun', longitude: 5, type: 'luminary' as const },
    { name: 'ASC', longitude: 115, type: 'angle' as const },
  ],
  config: {
    transitingBodies: [CelestialBody.Mars, CelestialBody.Saturn, CelestialBody.Jupiter],
  },
};

test('searchTransitPasses: default frame is unchanged; includeNutation shifts natal frame', () => {
  const plain = searchTransitPasses(params);
  assert.deepEqual(searchTransitPasses(params, { includeNutation: false }), plain);
  const truth = searchTransitPasses(params, { includeNutation: true });
  assert.equal(truth.transits.length, plain.transits.length);
  for (const [i, t] of truth.transits.entries()) {
    const jd = t.exactJDs[0]!;
    const lon = getPosition(t.transit.transitingBodyEnum, jd, { includeNutation: true }).longitude;
    const natal = params.natalPoints.find((p) => p.name === t.transit.natalPoint)!.longitude;
    const sep = Math.abs(((lon - natal + 540) % 360) - 180);
    assert.ok(Math.abs(sep - t.transit.aspectAngle) * 3600 < 1e-3);
    assert.ok(Math.abs(jd - plain.transits[i]!.exactJDs[0]!) < 1);
  }
});

test('searchTransitPasses bodyOrbs override the computed orb per body and aspect', () => {
  const result = searchTransitPasses(params, {
    bodyOrbs: { Mars: 1, Saturn: { [AspectType.Conjunction]: 1.5, [AspectType.Square]: 0.5 } },
  });
  const plain = searchTransitPasses(params);
  const orbOf = (r: typeof plain, body: string, aspect: string) =>
    r.transits.find((t) => t.transit.transitingBody === body && t.transit.aspectType === aspect)
      ?.transit.orb;
  for (const t of result.transits) {
    const { transitingBody: body, aspectType, orb } = t.transit;
    if (body === 'Mars') assert.equal(orb, 1);
    else if (body === 'Saturn' && aspectType === AspectType.Square) assert.equal(orb, 0.5);
    else if (body === 'Saturn' && aspectType === AspectType.Conjunction) assert.equal(orb, 1.5);
    else assert.equal(orb, orbOf(plain, body, aspectType));
  }
  assert.ok(result.transits.some((t) => t.transit.transitingBody === 'Mars'));
  assert.ok(result.transits.some((t) => t.transit.transitingBody === 'Jupiter'));
  assert.ok(result.transits.some((t) => t.transit.orb === 1.5));
});

test('chartToNatalPoints turns a chart into typed natal points', () => {
  const chart = calculateChart({
    year: 2000,
    month: 11,
    day: 1,
    hour: 12,
    minute: 0,
    timezone: 0,
    latitude: 51.5,
    longitude: -0.12,
  });
  const points = chartToNatalPoints(chart);
  assert.equal(points.length, chart.planets.length + chart.nodes.length + 2);
  const by = (name: string) => points.find((p) => p.name === name)!;
  assert.equal(by('Sun').type, 'luminary');
  assert.equal(by('Moon').type, 'luminary');
  assert.equal(by('Mars').type, 'planet');
  assert.equal(by('Chiron').type, 'asteroid');
  assert.equal(by('ASC').type, 'angle');
  assert.equal(by('ASC').longitude, chart.angles.ascendant.longitude);
  assert.equal(by('MC').longitude, chart.angles.midheaven.longitude);
  assert.equal(by('Sun').longitude, chart.planets[0]!.longitude);
  assert.equal(by('Sun').house, chart.planets[0]!.house);
  assert.equal(by('Sun').signIndex, chart.planets[0]!.sign);
  assert.ok(points.some((p) => p.type === 'node'));
  const result = searchTransitPasses({ startJD: 2461041.5, endJD: 2461200, natalPoints: points });
  assert.ok(result.transits.length > 0);
});
