import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CelestialBody, getPosition } from '../ephemeris/positions.js';
import { findSignIngresses, findVoidOfCourseMoon } from './index.js';
import { wrap } from './search.js';

test('VOC agrees with independent ten-minute brute-force sampling over three months', () => {
  const start = 2460035.5;
  const end = start + 90;
  const bodies = [
    CelestialBody.Sun,
    CelestialBody.Mercury,
    CelestialBody.Venus,
    CelestialBody.Mars,
    CelestialBody.Jupiter,
    CelestialBody.Saturn,
  ];
  const ingresses = findSignIngresses(CelestialBody.Moon, start - 4, end + 4);
  const brute: { jd: number; body: CelestialBody; angle: number }[] = [];
  const step = 10 / 1440;
  const at = (jd: number) => {
    const m = getPosition(CelestialBody.Moon, jd, { includeSpeed: false }).longitude;
    return bodies.map((b) => wrap(m - getPosition(b, jd, { includeSpeed: false }).longitude));
  };
  let t = start - 4;
  let left = at(t);
  while (t < end + 4) {
    const next = Math.min(t + step, end + 4);
    const right = at(next);
    for (let i = 0; i < bodies.length; i++) {
      for (const angle of [0, 60, 90, 120, 180, 240, 270, 300]) {
        const a = wrap(left[i]! - angle);
        const b = wrap(right[i]! - angle);
        if (a * b < 0 && Math.abs(a) + Math.abs(b) < 180)
          brute.push({
            jd: t - (a * (next - t)) / (b - a),
            body: bodies[i]!,
            angle: Math.min(angle, 360 - angle),
          });
      }
    }
    left = right;
    t = next;
  }
  brute.sort((a, b) => a.jd - b.jd);
  for (const p of findVoidOfCourseMoon(start, end)) {
    const previous = ingresses.find((e) => e.sign === p.sign && e.jd < p.end && p.end - e.jd < 3)!;
    const last = brute.filter((e) => e.jd >= previous.jd && e.jd < p.end).at(-1);
    assert.ok(Math.abs(p.start - (last?.jd ?? previous.jd)) * 86400 < 2);
    assert.equal(p.lastAspect?.body, last?.body);
    assert.equal(p.lastAspect?.angle, last?.angle);
  }
});
