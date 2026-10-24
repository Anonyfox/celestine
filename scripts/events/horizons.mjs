import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const cache = new URL('../../src/events/__fixtures__/requests/', import.meta.url);
export async function query(body, dates, quantities = '31') {
  const params = {
    format: 'json',
    COMMAND: body,
    CENTER: '500@399',
    EPHEM_TYPE: 'OBSERVER',
    QUANTITIES: quantities,
    TIME_TYPE: 'TT',
    TLIST: dates.map((d) => d.toFixed(9)).join('\n'),
    TLIST_TYPE: 'JD',
    CSV_FORMAT: 'YES',
    REF_SYSTEM: 'ICRF',
    EXTRA_PREC: 'YES',
    APPARENT: 'AIRLESS',
  };
  const url = new URL('https://ssd.jpl.nasa.gov/api/horizons.api');
  for (const [k, v] of Object.entries(params))
    url.searchParams.set(k, k === 'format' ? v : `'${v}'`);
  const hash = createHash('sha256').update(url.href).digest('hex').slice(0, 20);
  await mkdir(cache, { recursive: true });
  const file = new URL(`${hash}.json`, cache);
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {}
  const response = JSON.parse(
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
        '90',
        url.href,
      ],
      { maxBuffer: 5e6 },
    ),
  );
  if (!response.result?.includes('$$SOE')) throw Error(JSON.stringify(response));
  const rows = response.result
    .split('$$SOE')[1]
    .split('$$EOE')[0]
    .trim()
    .split('\n')
    .map((s) => s.split(',').map((v) => v.trim()));
  const result = { params, rows };
  await writeFile(file, `${JSON.stringify(result)}\n`);
  await new Promise((r) => setTimeout(r, 300));
  return result;
}
