import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const common = new URL('./common.mjs', import.meta.url).href;
test('update refuses every looser direction atomically; tightening is allowed', () => {
  const temp = mkdtempSync(join(tmpdir(), 'celestine-update-'));
  const initial = {
    size: { full: { minBytes: 128 } },
    perf: { tolerance: 1.3, baselines: { chart: 10 } },
    coverage: { lines: 90 },
  };
  const file = join(temp, 'budgets.json');
  try {
    for (const [section, values, higher, fails] of [
      ['size', { full: { minBytes: 192 } }, false, true],
      ['size', {}, false, true],
      ['perf', { tolerance: 1.4, baselines: { chart: 10 } }, false, true],
      ['perf', { tolerance: 1.3, baselines: { chart: 11 } }, false, true],
      ['coverage', { lines: 89 }, true, true],
      ['size', { full: { minBytes: 64 } }, false, false],
      ['coverage', { lines: 91 }, true, false],
    ]) {
      writeFileSync(file, JSON.stringify(initial));
      const result = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import {update} from ${JSON.stringify(common)}; update(${JSON.stringify(section)},${JSON.stringify(values)},${higher});`,
        ],
        { cwd: temp, encoding: 'utf8', env: { ...process.env, BUDGET_INCREASE_APPROVED: '' } },
      );
      assert.equal(result.status !== 0, fails, result.stderr);
      if (fails) {
        assert.match(result.stderr, /Refusing looser budgets/);
        assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), initial);
      } else assert.deepEqual(JSON.parse(readFileSync(file, 'utf8'))[section], values);
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
