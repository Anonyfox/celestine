// Audit every retained VSOP87D term against CDS VI/81. Download originals to /tmp;
// no original coefficient files are committed or used at runtime.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

for (const [body, suffix, file, prefix] of [
  ['Earth', 'ear', 'precision', 'earth'],
  ['Mercury', 'mer', 'mercury', ''],
  ['Venus', 'ven', 'venus', ''],
  ['Mars', 'mar', 'mars', ''],
  ['Jupiter', 'jup', 'jupiter', ''],
  ['Saturn', 'sat', 'saturn', ''],
  ['Uranus', 'ura', 'uranus', ''],
  ['Neptune', 'nep', 'neptune', ''],
]) {
  const path = join(tmpdir(), `celestine-VSOP87D.${suffix}`);
  const url = `https://cdsarc.cds.unistra.fr/ftp/VI/81/VSOP87D.${suffix}`;
  execFileSync('curl', ['--fail', '--silent', '--show-error', '--retry', '3', url, '-o', path]);
  const groups = {};
  let group;
  for (const line of readFileSync(path, 'utf8').trimEnd().split('\n')) {
    if (line.startsWith(' VSOP87')) {
      group = 'LBR'[Number(line[41]) - 1] + line.split('*T**')[1][0];
      groups[group] = [];
    } else groups[group].push(line.trim().split(/\s+/).slice(-3).map(Number));
  }
  const source = readFileSync(
    new URL(`../../src/ephemeris/planets/${file}.ts`, import.meta.url),
    'utf8',
  );
  console.log(`${body}: ${url}`);
  const tables = [
    ...source.matchAll(new RegExp(`const ${prefix}([LBR]\\d):.*?= (\\[.*?\\]);`, 'gs')),
  ];
  if (!tables.length) throw Error(`${body}: no tables audited`);
  for (const [, key, table] of tables) {
    const rows = JSON.parse(table.replace(/,\s*]/g, ']'));
    let bound = 0;
    const used = new Set();
    for (const [a, b, c] of rows) {
      const terms = groups[key];
      const ref = terms.reduce((best, r) =>
        Math.abs(r[2] - c) < Math.abs(best[2] - c) ? r : best,
      );
      if (used.has(ref)) throw Error(`${body} ${key}: duplicated term`);
      used.add(ref);
      const error =
        (Math.abs(a - ref[0] * 1e8) + a * (Math.abs(b - ref[1]) + 0.201 * Math.abs(c - ref[2]))) /
        1e8;
      bound += error * 0.201 ** Number(key[1]) * 206264.806;
    }
    console.log(`  ${key}: ${rows.length} terms; rounding bound ${bound.toFixed(4)} arcsec`);
    if (bound > 0.5) throw Error(`${body} ${key}: exceeds coefficient rounding allowance`);
  }
}

// The additive lunar latitude terms are numerical coefficients from the original
// ELP2000-82 main-problem table, not a fitted correction to the fixtures.
const lunarPath = join(tmpdir(), 'celestine-ELP2');
execFileSync('curl', [
  '--fail',
  '--silent',
  '--show-error',
  '--retry',
  '3',
  'https://cdsarc.cds.unistra.fr/ftp/VI/79/ELP2',
  '-o',
  lunarPath,
]);
const lunarOriginal = readFileSync(lunarPath, 'utf8')
  .trimEnd()
  .split('\n')
  .slice(1)
  .map((line) => line.trim().split(/\s+/).map(Number));
const lunarSource = readFileSync(new URL('../../src/ephemeris/moon.ts', import.meta.url), 'utf8');
const added = lunarSource.split('// Additional ELP2000-82')[1].split('];')[0];
const lunarRows = [...added.matchAll(/\[([^\]]+)\]/g)].map((m) => JSON.parse(`[${m[1]}]`));
if (lunarRows.length !== 34) throw Error('Missing additive lunar latitude coefficients');
for (const row of lunarRows) {
  const ref = lunarOriginal.find((r) => row.slice(0, 4).every((v, i) => v === r[i]));
  if (!ref || Math.abs(ref[4] - row[4] * 0.0036) > 0.0018 + 1e-10) {
    throw Error(`Lunar latitude coefficient mismatch: ${row}`);
  }
}
console.log(`Moon: ${lunarRows.length} additive ELP2 terms; rounding <=0.0018 arcsec/term`);
