// Sequential, resumable source retrieval. Existing event fixtures are only rewritten explicitly.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const dir = new URL('../../src/events/__fixtures__/', import.meta.url);
await mkdir(dir, { recursive: true });
const phaseNames = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];
const seasonNames = ['Equinox', 'Solstice'];
for (const kind of ['phases', 'seasons']) {
  const file = new URL(`usno-${kind}.json`, dir);
  let years = {};
  try {
    years = JSON.parse(await readFile(file, 'utf8'));
  } catch {}
  for (let year = 1900; year <= 2100; year++) {
    if (years[year]) continue;
    const url =
      kind === 'phases'
        ? `https://aa.usno.navy.mil/api/moon/phases/year?year=${year}`
        : `https://aa.usno.navy.mil/api/seasons?year=${year}`;
    const data = JSON.parse(
      execFileSync(
        'curl',
        [
          '-fsS',
          '--retry-all-errors',
          '--retry',
          '4',
          '--retry-delay',
          '2',
          '--max-time',
          '60',
          url,
        ],
        { maxBuffer: 2e6 },
      ),
    );
    const names = kind === 'phases' ? phaseNames : seasonNames;
    const rows = (data.phasedata ?? data.data)
      .filter((row) => names.includes(row.phase ?? row.phenom))
      .map((row) => {
        const [hour, minute] = row.time.split(':').map(Number);
        const date = new Date(0);
        date.setUTCFullYear(row.year, row.month - 1, row.day);
        date.setUTCHours(hour, minute, 0, 0);
        return [
          date.getTime() / 86400000 + 2440587.5,
          kind === 'phases' ? names.indexOf(row.phase) : Math.round((row.month - 3) / 3),
        ];
      });
    if (!rows.length) throw Error(JSON.stringify(data));
    years[year] = rows;
    await writeFile(file, `${JSON.stringify(years)}\n`);
    if (year % 10 === 0) console.log(kind, year);
    await new Promise((r) => setTimeout(r, 250));
  }
}
