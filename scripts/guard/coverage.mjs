import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { budgets, gate, update, updating } from './common.mjs';

function tests(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? tests(join(dir, entry.name))
      : entry.name.endsWith('.test.ts')
        ? [join(dir, entry.name)]
        : [],
  );
}
const temp = mkdtempSync(join(tmpdir(), 'celestine-coverage-'));
try {
  const output = join(temp, 'lcov.info');
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--test',
      '--experimental-test-coverage',
      '--test-reporter=dot',
      '--test-reporter-destination=stdout',
      '--test-reporter=lcov',
      `--test-reporter-destination=${output}`,
      ...tests('src'),
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) throw new Error(`Tests failed: ${result.status} ${result.error ?? ''}`);
  const totals = { lines: [0, 0], branches: [0, 0], functions: [0, 0] };
  for (const record of readFileSync(output, 'utf8').split('end_of_record')) {
    const file = record.match(/^SF:(.*)$/m)?.[1]?.replaceAll('\\', '/');
    if (
      !file ||
      !/(^|\/)src\//.test(file) ||
      /\.test\.ts$|__fixtures__|reference[-_]data/.test(file)
    )
      continue;
    for (const [name, prefix] of Object.entries({ lines: 'L', branches: 'BR', functions: 'FN' })) {
      totals[name][0] += Number(record.match(new RegExp(`^${prefix}H:(\\d+)`, 'm'))?.[1] ?? 0);
      totals[name][1] += Number(record.match(new RegExp(`^${prefix}F:(\\d+)`, 'm'))?.[1] ?? 0);
    }
  }
  if (Object.values(totals).some(([, total]) => total === 0))
    throw new Error('Missing coverage totals');
  const measured = Object.fromEntries(
    Object.entries(totals).map(([name, [hit, total]]) => [name, (hit / total) * 100]),
  );
  if (updating)
    update(
      'coverage',
      Object.fromEntries(
        Object.entries(measured).map(([name, value]) => [name, Math.floor(value * 10) / 10]),
      ),
      true,
    );
  else
    gate(
      Object.entries(measured).map(([metric, percent]) => ({
        metric,
        percent,
        limit: budgets.coverage[metric],
        status: percent >= budgets.coverage[metric] ? 'PASS' : 'FAIL',
      })),
    );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
