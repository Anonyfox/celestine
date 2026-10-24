import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { calculateChart } from '../chart/index.js';
import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import { fromJulianDate, toUT } from '../time/index.js';
import { findAscendantSigns, findSignIngresses, getSignsDuring } from './index.js';

const reference = JSON.parse(
  readFileSync(new URL('__fixtures__/ascendant-signs.json', import.meta.url), 'utf8'),
);
test('ERFA ascendant boundaries match one-to-one; charts bracket each cusp', () => {
  let max = 0;
  for (const c of reference.cases) {
    const spans = findAscendantSigns(c.start, c.end, c.latitude, c.longitude);
    assert.equal(spans.length, c.boundaries.length + 1);
    assert.equal(spans[0]!.start, c.start);
    assert.equal(spans.at(-1)!.end, c.end);
    for (let i = 0; i < c.boundaries.length; i++) {
      const b = c.boundaries[i];
      const span = spans[i + 1]!;
      const error = Math.abs(span.start - b.jd) * 86400;
      max = Math.max(max, error);
      assert.ok(error < 1, `${c.name}: ${error} s`);
      assert.equal(span.sign, b.sign);
      assert.equal(span.start, spans[i]!.end);
      assert.equal(span.startUT, toUT(span.start));
      for (const offset of [-1, 1]) {
        const civil = fromJulianDate(toUT(span.start + offset / 86400));
        const chart = calculateChart(
          { ...civil, timezone: 0, latitude: c.latitude, longitude: c.longitude },
          { houseSystem: 'placidus' },
        );
        assert.equal(
          chart.angles.ascendant.signName,
          offset < 0 ? spans[i]!.signName : span.signName,
        );
      }
    }
    const tiny = findAscendantSigns(c.start, c.start + 1 / 86400, c.latitude, c.longitude);
    assert.equal(tiny.length, 1);
    const boundary = spans[1]!.start;
    const exact = findAscendantSigns(boundary, boundary + 10 / 86400, c.latitude, c.longitude);
    assert.equal(exact.length, 1);
    assert.equal(exact[0]!.sign, spans[1]!.sign);
  }
  console.log(`Ascendant max ERFA error: ${max.toFixed(6)} s`);
});

test('day signs reuse Horizons-verified ingress searches in both frames', () => {
  const rows = JSON.parse(
    readFileSync(new URL('__fixtures__/horizons-events.json', import.meta.url), 'utf8'),
  );
  for (const body of [CelestialBody.Moon, CelestialBody.Mercury]) {
    const r = rows.find(
      (r: { kind: string; body: string }) => r.kind === 'ingress' && r.body === body,
    );
    for (const includeNutation of [false, true]) {
      const start = Math.floor(r.jd - 0.5) + 0.5;
      const options = { bodies: [body], includeNutation };
      const report = getSignsDuring(start, start + 1, options)[0]!;
      assert.deepEqual(report.ingresses, findSignIngresses(body, start, start + 1, options));
      assert.equal(report.ingresses.length, 1);
      assert.equal(report.changesSign, true);
      assert.equal(report.startSign, report.ingresses[0]!.previousSign);
      assert.equal(report.endSign, report.ingresses[0]!.sign);
    }
  }
  assert.equal(getSignsDuring(2451545, 2451545).length, 10);
  assert.deepEqual(getSignsDuring(2451545, 2451546, { bodies: [] }), []);
  assert.equal(getSignsDuring(2451545, 2451545)[0]!.changesSign, false);
});

test('day report validation and true frame', () => {
  for (const args of [
    [NaN, 1, 0, 0],
    [2, 1, 0, 0],
    [1, 2, 70, 0],
    [1, 2, -66, 0],
    [1, 2, 0, Infinity],
    [1, 2, 0, 181],
  ]) {
    assert.throws(() => findAscendantSigns(args[0]!, args[1]!, args[2]!, args[3]!), RangeError);
  }
  assert.throws(() => getSignsDuring(2, 1), RangeError);
  assert.throws(() => getSignsDuring(1, NaN), RangeError);
  assert.throws(() => getSignsDuring(1, 2, { bodies: ['bad' as CelestialBody] }), RangeError);
  const a = findAscendantSigns(2461128.5, 2461129.5, 52.52, 13.405, { includeNutation: true });
  const b = findAscendantSigns(2461128.5, 2461129.5, 52.52, 13.405, { nutation: true });
  assert.deepEqual(a, b);
  const instant = findAscendantSigns(2461128.5, 2461128.5, 0, 0);
  assert.equal(instant.length, 1);
  assert.equal(instant[0]!.start, instant[0]!.end);
});

test('cached Horizons longitudes bracket the Moon and planet day ingresses', () => {
  const directory = new URL('__fixtures__/requests/', import.meta.url);
  const requests = readdirSync(directory).map((name) =>
    JSON.parse(readFileSync(new URL(name, directory), 'utf8')),
  );
  const references = JSON.parse(
    readFileSync(new URL('__fixtures__/horizons-events.json', import.meta.url), 'utf8'),
  );
  for (const [body, id, limit] of [
    [CelestialBody.Moon, '301', 7],
    [CelestialBody.Mercury, '199', 0.4],
  ] as const) {
    const ref = references.find(
      (r: { kind: string; body: string }) => r.kind === 'ingress' && r.body === body,
    );
    const points: { jd: number; longitude: number }[] = [];
    for (const request of requests) {
      if (request.params.COMMAND !== id || request.params.QUANTITIES !== '31') continue;
      const dates = request.params.TLIST.split('\n').map(Number);
      dates.forEach((jd: number, i: number) => {
        if (Math.abs(jd - ref.jd) < 0.02 && Math.abs(jd - ref.jd) > 0.001)
          points.push({ jd, longitude: Number(request.rows[i][3]) });
      });
    }
    let max = 0;
    for (const side of [-1, 1]) {
      const point = points.find((p) => (p.jd - ref.jd) * side > 0);
      assert.ok(point, `${body} cached side ${side}`);
      const actual = getPosition(body, point.jd, { includeNutation: true }).longitude;
      const error = Math.abs(actual - point.longitude) * 3600;
      max = Math.max(max, error);
      assert.ok(error < limit, `${body}: ${error} arcsec`);
      assert.equal(Math.floor(actual / 30), Math.floor(point.longitude / 30));
    }
    console.log(`${body} day sides max Horizons error: ${max.toFixed(6)} arcsec`);
  }
});
