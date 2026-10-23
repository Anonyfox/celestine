import { readFileSync, readdirSync } from 'node:fs';
import { getPosition } from '../../src/ephemeris/positions.js';
const dir = new URL('../../src/ephemeris/__fixtures__/horizons/', import.meta.url);
console.log('Body       N    max lon     RMS lon    max lat     RMS lat (arcsec)');
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const f = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
  const errors = f.rows.map((r: number[]) => {
    const p = getPosition(f.body, r[0]);
    return [(((p.longitude - r[2] + 540) % 360) - 180) * 3600, (p.latitude - r[3]) * 3600];
  });
  const stats = [0, 1].flatMap((k) => [
    Math.max(...errors.map((e: number[]) => Math.abs(e[k]))),
    Math.sqrt(errors.reduce((s: number, e: number[]) => s + e[k] ** 2, 0) / errors.length),
  ]);
  console.log(
    f.body.padEnd(10),
    String(errors.length).padStart(3),
    ...stats.map((n) => n.toFixed(3).padStart(11)),
  );
}
