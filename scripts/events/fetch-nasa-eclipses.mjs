// Optional local catalog paths: node scripts/events/fetch-nasa-eclipses.mjs /tmp/se.html /tmp/le.html
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { query } from './horizons.mjs';

const dir = new URL('../../src/events/__fixtures__/', import.meta.url);
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const events = [];
const sources = [];
const centuryCounts = {};
for (const [index, kind] of ['solar', 'lunar'].entries()) {
  const url =
    kind === 'solar'
      ? 'https://eclipse.gsfc.nasa.gov/SEcat5/SE2001-2100.html'
      : 'https://eclipse.gsfc.nasa.gov/LEcat5/LE2001-2100.html';
  const cache = join(tmpdir(), `celestine-nasa-${kind}-2001-2100.html`);
  let html;
  if (process.argv[index + 2]) html = await readFile(process.argv[index + 2], 'utf8');
  else {
    try {
      html = await readFile(cache, 'utf8');
    } catch {
      html = execFileSync('curl', ['-fsS', '--max-time', '60', url], { encoding: 'utf8' });
      await writeFile(cache, html);
    }
  }
  sources.push({ url, retrieved: new Date().toISOString().slice(0, 10) });
  const counts = {};
  for (const line of html.replace(/<[^>]*>/g, '').split('\n')) {
    const fields = line.trim().split(/\s+/);
    if (!/^\d{5}$/.test(fields[0]) || !/^20\d\d$|^2100$/.test(fields[1])) continue;
    const [, year, month, day, clock, deltaT, , , rawType, , gamma, mag, umbral] = fields;
    const type = (
      kind === 'solar'
        ? { T: 'total', A: 'annular', H: 'hybrid', P: 'partial' }
        : { T: 'total', P: 'partial', N: 'penumbral' }
    )[rawType[0]];
    if (!type) throw Error(`Unparsed row: ${line}`);
    counts[type] = (counts[type] ?? 0) + 1;
    const date = `${year}-${String(months.indexOf(month) + 1).padStart(2, '0')}-${day}`;
    if (date < '2019-07-01' || date > '2031-06-30') continue;
    const jd = Date.parse(`${date}T${clock}Z`) / 86400000 + 2440587.5;
    events.push({
      kind,
      date,
      td: clock,
      jd,
      deltaT: Number(deltaT),
      rawType,
      type,
      gamma: Number(gamma),
      ...(kind === 'solar'
        ? { magnitude: Number(mag) }
        : { penumbralMagnitude: Number(mag), umbralMagnitude: Number(umbral) }),
    });
  }
  centuryCounts[kind] = counts;
  await new Promise((r) => setTimeout(r, 300));
}
events.sort((a, b) => a.jd - b.jd);
await writeFile(
  new URL('nasa-eclipses.json', dir),
  `${JSON.stringify({ sources, centuryCounts, events }, null, 2)}\n`,
);
const longitudes = events.map((e) => ({ jd: e.jd }));
for (const [body, id] of [
  ['sunLongitude', '10'],
  ['moonLongitude', '301'],
]) {
  for (let i = 0; i < events.length; i += 40) {
    const result = await query(
      id,
      events.slice(i, i + 40).map((e) => e.jd),
    );
    result.rows.forEach((r, j) => {
      longitudes[i + j][body] = Number(r[3]);
    });
  }
}
await writeFile(
  new URL('horizons-eclipses.json', dir),
  `${JSON.stringify({ frame: 'true equinox of date', source: 'https://ssd.jpl.nasa.gov/api/horizons.api', retrieved: new Date().toISOString().slice(0, 10), quantity: 31, timeScale: 'TT', events: longitudes }, null, 2)}\n`,
);
console.log('NASA/Horizons eclipses', events.length, centuryCounts);
