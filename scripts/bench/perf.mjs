import { calculateChart, ephemeris } from '../../dist/index.js';

const b = {
  year: 1990,
  month: 6,
  day: 15,
  hour: 14,
  minute: 30,
  second: 0,
  timezone: -5,
  latitude: 40.7,
  longitude: -74,
};
const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
for (let i = 0; i < 200; i++) calculateChart(b);
const c = [],
  p = [],
  m = [],
  pl = [];
for (let r = 0; r < 7; r++) {
  let t = performance.now();
  for (let i = 0; i < 500; i++) calculateChart({ ...b, day: 1 + (i % 28) });
  c.push((performance.now() - t) / 500);
  t = performance.now();
  for (let i = 0; i < 5000; i++) ephemeris.getAllPositions(2451545 + i);
  p.push((performance.now() - t) / 5000);
  t = performance.now();
  for (let i = 0; i < 20000; i++) ephemeris.getMercuryPosition(2451545 + i * 0.7);
  m.push((performance.now() - t) / 20000);
  t = performance.now();
  for (let i = 0; i < 20000; i++) ephemeris.getPlutoPosition(2451545 + i * 0.7);
  pl.push((performance.now() - t) / 20000);
}
console.log(
  `calculateChart ${(med(c) * 1000).toFixed(0)} us | getAllPositions ${(med(p) * 1000).toFixed(0)} us | mercury ${(med(m) * 1000).toFixed(2)} us | pluto ${(med(pl) * 1000).toFixed(2)} us (median of 7)`,
);
