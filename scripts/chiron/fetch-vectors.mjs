// Fetch small-body heliocentric geometric J2000-ecliptic (ICRF) vectors from JPL Horizons.
// Sequential, 1.5 s pause, cached per decade. Output: [jdTDB, x, y, z] AU.
// Usage: node fetch-vectors.mjs <outDir> [stepDays=2] [command='2060;']
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'chiron-vectors';
const step = process.argv[3] ?? '2';
const command = process.argv[4] ?? '2060;';
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let y = 1795; y < 2205; y += 10) {
  const file = `${out}/${y}.json`;
  if (existsSync(file)) continue;
  const params = {
    format: 'json',
    COMMAND: `'${command}'`,
    EPHEM_TYPE: "'VECTORS'",
    CENTER: "'500@10'",
    REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'ICRF'",
    VEC_TABLE: "'1'",
    VEC_CORR: "'NONE'",
    CSV_FORMAT: "'YES'",
    OUT_UNITS: "'AU-D'",
    VEC_LABELS: "'NO'",
    START_TIME: `'${y}-01-01'`,
    STOP_TIME: `'${y + 10}-01-01'`,
    STEP_SIZE: `'${step} d'`,
  };
  const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${new URLSearchParams(params)}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url);
      const j = await res.json();
      const body = j.result.split('$$SOE')[1].split('$$EOE')[0];
      const rows = body
        .trim()
        .split('\n')
        .map((l) => {
          const c = l.split(',');
          return [Number(c[0]), Number(c[2]), Number(c[3]), Number(c[4])];
        });
      // Keep the last decade boundary row only in the next file.
      if (rows.length && rows.at(-1)[0] >= 0) rows.pop();
      writeFileSync(file, JSON.stringify({ url, source: j.signature, rows }));
      console.log(y, rows.length);
      break;
    } catch (e) {
      if (attempt > 4) throw e;
      await sleep(5000 * (attempt + 1));
    }
  }
  await sleep(1500);
}
