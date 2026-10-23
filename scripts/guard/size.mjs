import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { budgets, gate, update, updating } from './common.mjs';

const entries = {
  full: null,
  toJulianDate: 'import {toJulianDate} from "./dist/index.js"; export {toJulianDate};',
  calculateChart: 'import {calculateChart} from "./dist/index.js"; export {calculateChart};',
  getAllPositions:
    'import {ephemeris} from "./dist/index.js"; export const getAllPositions = ephemeris.getAllPositions;',
  eclipticToZodiac: 'import {eclipticToZodiac} from "./dist/index.js"; export {eclipticToZodiac};',
};
// gzip output differs between Node majors (bundled zlib versions), so gzip budgets are
// enforced only on the Node major the budgets were recorded on; minified bytes are exact everywhere.
const gzipComparable = Number(process.versions.node.split('.')[0]) === budgets.perf.nodeMajor;
if (!updating && !gzipComparable)
  console.log(
    `size: Node ${process.versions.node} != recorded major ${budgets.perf.nodeMajor}; gzip budgets skipped, minified bytes enforced.`,
  );
const measured = {};
for (const [name, contents] of Object.entries(entries)) {
  const result = await build({
    ...(contents
      ? { stdin: { contents, resolveDir: process.cwd() } }
      : { entryPoints: ['dist/index.js'] }),
    logOverride: { 'duplicate-case': 'silent' },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'neutral',
    treeShaking: true,
    write: false,
  });
  const bytes = result.outputFiles[0].contents;
  measured[name] = { minBytes: bytes.length };
  if (updating || gzipComparable) measured[name].gzipBytes = gzipSync(bytes, { level: 9 }).length;
}
if (updating)
  update(
    'size',
    Object.fromEntries(
      Object.entries(measured).map(([key, value]) => [
        key,
        Object.fromEntries(
          Object.entries(value).map(([unit, bytes]) => [unit, Math.ceil(bytes / 64) * 64]),
        ),
      ]),
    ),
  );
else
  gate(
    Object.entries(measured).flatMap(([entry, values]) =>
      Object.entries(values).map(([unit, bytes]) => ({
        entry,
        unit,
        bytes,
        limit: budgets.size[entry]?.[unit],
        status: bytes <= budgets.size[entry]?.[unit] ? 'PASS' : 'FAIL',
      })),
    ),
  );
