/** Regenerate reference-only USNO fixtures; no runtime data is imported from here. */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

const destination = new URL('../../src/time/__fixtures__/delta-t/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ['deltat.data', 'historic_deltat.data']) {
  const source = `https://maia.usno.navy.mil/ser7/${name}`;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`${source}: ${response.status}`);
  const raw = Buffer.from(await response.arrayBuffer());
  const rows = raw
    .toString()
    .trim()
    .split('\n')
    .filter((line) => /^\s*\d/.test(line))
    .map((line) => {
      const values = line.trim().split(/\s+/).map(Number);
      if (name.startsWith('historic')) return values.slice(0, 2);
      const [year, month, day, seconds] = values;
      const jd = Date.UTC(year, month - 1, day) / 86400000 + 2440587.5;
      return [2000 + (jd - 2451545) / 365.25, seconds];
    });
  await writeFile(
    new URL(`${name}.json`, destination),
    `${JSON.stringify({ source, retrieved: process.argv[2] ?? new Date().toISOString().slice(0, 10), sha256: createHash('sha256').update(raw).digest('hex'), rows }, null, 2)}\n`,
  );
}
