// Independent full-position derivative, with separately evaluated Earth at each date.
import { getPosition } from '../../src/ephemeris/positions.js';
import { Planet } from '../../src/ephemeris/types.js';

const delta = (a: number, b: number) => ((a - b + 540) % 360) - 180;
console.log('Body       dates stations max speed error (deg/day)');
for (const body of Object.values(Planet).filter(
  (b) => !['Moon', 'NorthNode', 'SouthNode', 'Lilith'].includes(b),
)) {
  const dates = Array.from({ length: 240 }, (_, i) => 2415020 + i * (73050 / 239));
  const longitude = (jd: number) => getPosition(body, jd, { includeSpeed: false }).longitude;
  const derivative = (jd: number) => delta(longitude(jd + 0.001), longitude(jd - 0.001)) / 0.002;
  // Locate stations independently of the implementation's reported speed.
  let stations = 0;
  for (let jd = 2451545; jd < 2451545 + 3653; jd += 5) {
    if (derivative(jd) * derivative(jd + 5) >= 0) continue;
    let lo = jd;
    let hi = jd + 5;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (derivative(lo) * derivative(mid) <= 0) hi = mid;
      else lo = mid;
    }
    dates.push(lo - 0.5, lo, lo + 0.5);
    stations++;
  }
  const error = Math.max(
    ...dates.map((jd) => Math.abs(getPosition(body, jd).longitudeSpeed - derivative(jd))),
  );
  console.log(body.padEnd(10), dates.length, stations, error.toExponential(8));
}
