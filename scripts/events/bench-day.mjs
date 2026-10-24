// Run after npm run build. Warm median elapsed milliseconds for both day reports.
import { performance } from 'node:perf_hooks';
import { findAscendantSigns, getSignsDuring } from '../../dist/events/index.js';

const samples = [];
for (let i = 0; i < 120; i++) {
  const start = performance.now();
  findAscendantSigns(2461128.5, 2461129.5, 52.52, 13.405);
  getSignsDuring(2461128.5, 2461129.5);
  if (i >= 20) samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);
console.log(`Both day reports: ${samples[50].toFixed(3)} ms warm median (100 samples)`);
