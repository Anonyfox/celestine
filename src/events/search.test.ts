import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crossings, interval, normalize, roots, wrap } from './search.js';

test('angular core: sample roots, wrap jumps, stationary double crossings, tangency and uniqueness', () => {
  assert.deepEqual(
    roots((t) => ({ value: wrap(t * 90), rate: 90 }), 0, 8, 1),
    [0, 4, 8],
  );
  const double = roots((t) => ({ value: (t - 0.5) ** 2 - 0.01, rate: 2 * (t - 0.5) }), 0, 1, 1);
  assert.equal(double.length, 2);
  assert.ok(Math.abs(double[0]! - 0.4) < 1e-6);
  assert.ok(Math.abs(double[1]! - 0.6) < 1e-6);
  assert.equal(roots((t) => ({ value: (t - 0.5) ** 2, rate: 2 * (t - 0.5) }), 0, 1, 1).length, 1);
  assert.deepEqual(
    roots(() => ({ value: 0, rate: 0 }), 0, 2, 1),
    [],
  );
  assert.deepEqual(
    roots((t) => ({ value: t, rate: 1 }), 0, 0, 1),
    [0],
  );
  assert.deepEqual(
    roots((t) => ({ value: t + 1, rate: 1 }), 0, 0, 1),
    [],
  );
  assert.equal(normalize(-30), 330);
  assert.equal(wrap(-180), 180);
  assert.equal(roots((t) => ({ value: (t - 1) ** 2, rate: 2 * (t - 1) }), 0, 2, 1).length, 1);
  assert.throws(() => interval(2, 1), RangeError);
  assert.throws(() => interval(Number.NaN, 1), RangeError);
  assert.throws(() => roots(() => ({ value: 1, rate: 0 }), 0, 1, 0), RangeError);
});

test('safeguarded refinement tolerates approximate/zero derivatives and reuses evaluations', () => {
  for (const rate of [0, 0.0001, 10, Number.NaN]) {
    const result = roots((t) => ({ value: t * t - 0.3, rate }), 0, 1, 1);
    assert.ok(Math.abs(result[0]! - Math.sqrt(0.3)) < 1e-6);
  }
  let calls = 0;
  const result = crossings(
    (t) => {
      calls++;
      return { value: t * 90, rate: 90 };
    },
    [0, 90, 180],
    0,
    4,
    1,
  );
  assert.equal(result.length, 4);
  assert.equal(calls, 5);
});

test('time tolerance holds for very slow angular motion and near tangencies', () => {
  const slow = roots((t) => ({ value: 1e-7 * (t - 0.0003), rate: 1e-7 }), 0, 1, 1);
  assert.equal(slow.length, 1);
  assert.ok(Math.abs(slow[0]! - 0.0003) < 1e-6);
  assert.deepEqual(
    roots((t) => ({ value: (t - 0.5) ** 2 + 1e-10, rate: 2 * (t - 0.5) }), 0, 1, 1),
    [],
  );
});
