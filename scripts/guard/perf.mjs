import { performance } from 'node:perf_hooks';
import { calculateChart, ephemeris, time, transits } from '../../dist/index.js';
import { budgets, gate, update, updating } from './common.mjs';

// Consume every result to keep calibration and cheap operations observable to the JIT.
let sink = 0;
const birth = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  second: 0,
  timezone: 0,
  latitude: 52,
  longitude: 13,
};
const tenBodies = ephemeris.DEFAULT_BODIES.slice(0, 10);
const benchmarks = {
  calculateChart: (i) => calculateChart({ ...birth, second: i % 60 }).planets[0].longitude,
  'ephemeris.getAllPositions': (i) =>
    ephemeris.getAllPositions(2451545 + (i % 365), tenBodies).get(ephemeris.CelestialBody.Sun)
      .longitude,
  getMercuryPosition: (i) => ephemeris.getMercuryPosition(2451545 + (i % 365)).longitude,
  getPlutoPosition: (i) => ephemeris.getPlutoPosition(2451545 + (i % 365)).longitude,
  getMoonPosition: (i) => ephemeris.getMoonPosition(2451545 + (i % 365)).longitude,
  'time.toJulianDate': (i) => time.toJulianDate({ ...birth, second: i % 60 }),
  'transits.findStationPoints.180days': (i) =>
    transits.findStationPoints(
      ephemeris.CelestialBody.Mercury,
      2451545 + (i % 30),
      2451725 + (i % 30),
    ).length,
};
function calibration(i) {
  const x = i * 0.001 + 0.25;
  return Math.atan2(Math.sin(x), Math.cos(x)) + Math.sqrt(x);
}
function measure(fn, count) {
  let sum = 0;
  const start = performance.now();
  for (let i = 0; i < count; i++) sum += fn(i);
  const ns = ((performance.now() - start) * 1e6) / count;
  sink += sum;
  return ns;
}
function median(values) {
  return values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
}
function run() {
  const results = [];
  measure(calibration, 1000000);
  for (const fn of Object.values(benchmarks)) {
    const start = performance.now();
    while (performance.now() - start < 60) measure(fn, 10);
  }
  for (const [bench, fn] of Object.entries(benchmarks)) {
    const pilot = measure(fn, 3);
    const count = Math.max(1, Math.min(200000, Math.ceil(8e6 / pilot)));
    measure(fn, count);
    const samples = [];
    const times = [];
    for (let round = 0; round < 9; round++) {
      const before = measure(calibration, 200000);
      const ns = measure(fn, count);
      const after = measure(calibration, 200000);
      times.push(ns);
      samples.push(ns / ((before + after) / 2));
    }
    const ratio = median(samples);
    const baseline = budgets.perf.baselines[bench];
    const limit = baseline * budgets.perf.tolerance;
    results.push({
      bench,
      'ns/op': Math.round(median(times)),
      ratio,
      baseline,
      limit,
      status: ratio <= limit ? 'PASS' : 'FAIL',
    });
  }
  return results;
}
let rows = run();
if (updating)
  update('perf', {
    tolerance: 1.3,
    baselines: Object.fromEntries(rows.map((row) => [row.bench, row.ratio])),
  });
else {
  if (rows.some((row) => row.status === 'FAIL')) {
    console.log('Performance limit exceeded; retrying once in the same process.');
    console.table(rows);
    rows = run();
  }
  gate(rows);
}
if (!Number.isFinite(sink)) throw new Error('Invalid benchmark result');
