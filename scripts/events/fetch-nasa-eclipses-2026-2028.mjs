// Reproducible NASA catalog subset; optional arguments are saved solar/lunar HTML paths.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const events = [],
  sources = [];
for (const [i, kind] of ['solar', 'lunar'].entries()) {
  const code = kind === 'solar' ? 'SE' : 'LE';
  const url = `https://eclipse.gsfc.nasa.gov/${code}cat5/${code}2001-2100.html`;
  const cache = process.argv[i + 2] ?? join(tmpdir(), `celestine-nasa-${kind}-2001-2100.html`);
  let html;
  try {
    html = await readFile(cache, 'utf8');
  } catch {
    html = execFileSync('curl', ['-fsS', '--max-time', '60', url], { encoding: 'utf8' });
    await writeFile(cache, html);
  }
  sources.push({ url, retrieved: new Date().toISOString().slice(0, 10) });
  for (const line of html.replace(/<[^>]*>/g, '').split('\n')) {
    const f = line.trim().split(/\s+/);
    if (!/^\d{5}$/.test(f[0]) || !/^202[678]$/.test(f[1])) continue;
    const [catalogNumber, year, month, day, td, dt, , , rawType, , gamma, mag, umbral] = f;
    const date = `${year}-${String(months.indexOf(month) + 1).padStart(2, '0')}-${day}`;
    const jd = Date.parse(`${date}T${td}Z`) / 86400000 + 2440587.5;
    const deltaT = Number(dt),
      jdUT = jd - deltaT / 86400;
    const type = (
      kind === 'solar'
        ? { A: 'annular', T: 'total', P: 'partial', H: 'hybrid' }
        : { T: 'total', P: 'partial', N: 'penumbral' }
    )[rawType[0]];
    if (!type) throw Error(`Unknown type in ${line}`);
    const duration = (j) => (f[j] === '-' ? 0 : Number(f[j]));
    events.push({
      kind,
      catalogNumber,
      date,
      td,
      jd,
      deltaT,
      ut: new Date(Math.round((jdUT - 2440587.5) * 86400000)).toISOString(),
      jdUT,
      rawType,
      type,
      gamma: Number(gamma),
      ...(kind === 'solar'
        ? { magnitude: Number(mag) }
        : {
            penumbralMagnitude: Number(mag),
            umbralMagnitude: Number(umbral),
            durations: { penumbral: duration(13), partial: duration(14), total: duration(15) },
          }),
    });
  }
}
events.sort((a, b) => a.jd - b.jd);
if (
  events.filter((e) => e.kind === 'solar').length !== 6 ||
  events.filter((e) => e.kind === 'lunar').length !== 8
)
  throw Error('Expected six solar and eight lunar catalog rows');
await writeFile(
  new URL('../../src/events/__fixtures__/nasa-eclipses-2026-2028.json', import.meta.url),
  `${JSON.stringify({ sources, events }, null, 2)}\n`,
);
