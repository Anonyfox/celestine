// Ten classical bodies, including speed; median batch time, microseconds per snapshot.
import { DEFAULT_BODIES, getAllPositions } from '../../dist/ephemeris/index.js';

const times = [];
for (let batch = 0; batch < 21; batch++) {
  const start = performance.now();
  for (let i = 0; i < 100; i++)
    getAllPositions(2451545 + i * 0.731 + batch * 0.001, DEFAULT_BODIES.slice(0, 10));
  times.push((performance.now() - start) * 10);
}
console.log(times.slice(1).sort((a, b) => a - b)[10]);
