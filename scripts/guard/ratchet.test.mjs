import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  APPROVAL_TAGS,
  approvalTrailerFailures,
  compareApi,
  compareBudgets,
  guardrailChanges,
} from './ratchet.mjs';

const before = {
  precision: { Mercury: { lonArcsec: 7, latArcsec: 1.5, minSamples: 170 } },
  coverage: { lines: 80, branches: 70, functions: 90 },
  size: { full: { minBytes: 128, gzipBytes: 64 } },
  perf: { tolerance: 1.3, baselines: { chart: 20 } },
};
test('each budget direction, removals and invalid replacements', () => {
  assert.deepEqual(compareBudgets(before, structuredClone(before)), []);
  const paths = [
    ['precision', 'Mercury', 'lonArcsec'],
    ['precision', 'Mercury', 'latArcsec'],
    ['precision', 'Mercury', 'minSamples'],
    ['coverage', 'lines'],
    ['coverage', 'branches'],
    ['coverage', 'functions'],
    ['size', 'full', 'minBytes'],
    ['size', 'full', 'gzipBytes'],
    ['perf', 'tolerance'],
    ['perf', 'baselines', 'chart'],
  ];
  for (const path of paths) {
    for (const direction of [-1, 1]) {
      const after = structuredClone(before);
      const parent = path.slice(0, -1).reduce((object, key) => object[key], after);
      parent[path.at(-1)] += direction;
      const higher = path[0] === 'coverage' || path.at(-1) === 'minSamples';
      assert.equal(
        compareBudgets(before, after).length,
        (higher ? direction < 0 : direction > 0) ? 1 : 0,
        path.join('.'),
      );
    }
    const after = structuredClone(before);
    delete path.slice(0, -1).reduce((object, key) => object[key], after)[path.at(-1)];
    assert.equal(compareBudgets(before, after).length, 1);
  }
  for (const path of [
    ['precision', 'Mercury'],
    ['size', 'full'],
    ['perf', 'baselines', 'chart'],
  ]) {
    const after = structuredClone(before);
    delete path.slice(0, -1).reduce((object, key) => object[key], after)[path.at(-1)];
    assert.equal(compareBudgets(before, after).length, 1);
  }
  assert.equal(compareBudgets(before, { ...before, size: null }).length, 1);
  assert.equal(compareBudgets({ x: 1 }, { x: null }).length, 1);
  assert.deepEqual(compareBudgets(before, { ...before, newBudget: 1 }), []);
});
test('API additions allowed; removal, kind, value and signature changes rejected', () => {
  const api = {
    fn: { kind: 'function', text: '(jd: number): number' },
    enum: { kind: 'string', value: 'Sun' },
  };
  assert.deepEqual(compareApi(api, { ...api, extra: {} }), []);
  assert.equal(compareApi(api, { enum: api.enum }).length, 1);
  assert.equal(compareApi(api, { ...api, fn: { kind: 'object' } }).length, 1);
  assert.equal(compareApi(api, { ...api, enum: { kind: 'string', value: 'sun' } }).length, 1);
});

test('actual precision budget rejects loosening, including sample loss', async () => {
  const { readFileSync } = await import('node:fs');
  const current = JSON.parse(readFileSync('budgets.json', 'utf8'));
  const changed = structuredClone(current);
  changed.precision.Mercury.lonArcsec += 1;
  assert.match(compareBudgets(current, changed)[0], /precision.Mercury.lonArcsec/);
  changed.precision.Mercury.lonArcsec -= 1;
  changed.precision.Mercury.minSamples -= 1;
  assert.match(compareBudgets(current, changed)[0], /precision.Mercury.minSamples/);
});

test('gate files, test deletions and check scripts need approval; new tests do not', () => {
  const diff = [
    'M\tscripts/guard/perf.mjs',
    'M\t.github/workflows/ci.yml',
    'D\tsrc/time/julian-date.test.ts',
    'A\tsrc/time/new.test.ts',
    'M\tsrc/time/julian-date.ts',
  ].join('\n');
  const changes = guardrailChanges(diff, { check: 'a', build: 'x' }, { check: 'b', build: 'y' });
  assert.deepEqual(changes, [
    'M\tscripts/guard/perf.mjs',
    'M\t.github/workflows/ci.yml',
    'D\tsrc/time/julian-date.test.ts',
    'package.json scripts.check: a → b',
  ]);
  assert.deepEqual(guardrailChanges('', { test: 't' }, { test: 't' }), []);
});

test('any perf.nodeMajor change counts as loosening', () => {
  assert.deepEqual(compareBudgets({ perf: { nodeMajor: 20 } }, { perf: { nodeMajor: 18 } }), [
    'perf.nodeMajor: 20 → 18',
  ]);
});
test('API symbol-id renumbering is ignored; real member changes are not', () => {
  const at = (id, type = '() => Iterator<string>') => ({
    'public.Name': { kind: 'type', members: { [`__@iterator@${id}`]: { type, optional: false } } },
  });
  assert.deepEqual(compareApi(at(1738), at(1747)), []);
  assert.deepEqual(compareApi(at(1738), at(1747, '() => Iterator<number>')), [
    'public.Name: changed',
  ]);
  const toTag = {
    'public.Name': {
      kind: 'type',
      members: { '__@toStringTag@9': { type: 'string', optional: false } },
    },
  };
  assert.deepEqual(compareApi(at(1738), toTag), ['public.Name: changed']);
});
test('approval tags need an Approved-by trailer with a quoted human statement', () => {
  const ok = [
    "Approved-by: Fox, 2026-10-24: 'please stop asking me for these minor details'",
    'Approved-by: Fox (Maximilian Stroh), 2026-10-24: "Yes, apply ΔT by default"',
    'Approved-by: Fox, 2026-10-24: “typographic quotes”',
  ];
  const bad = [
    '',
    'Approved-by: Fox',
    'Approved-by: Fox, 2026-10-24',
    'Approved-by: Fox, 2026-10-24: unquoted words',
    "Approved-by: Fox, 2026-10-24: ''",
    "Approved-by: , 2026-10-24: 'no human named'",
    "Approved-by: Fox, 24.10.2026: 'wrong date format'",
    "approved-by: Fox, 2026-10-24: 'lowercase key'",
    "Mentions Approved-by: Fox, 2026-10-24: 'only mid-line'",
  ];
  const commit = (message) => ({ sha: '0123456789abcdef', message });
  for (const tag of APPROVAL_TAGS) {
    for (const trailer of ok)
      assert.deepEqual(
        approvalTrailerFailures([commit(`fix: x ${tag}\n\n${trailer}\n`)]),
        [],
        trailer,
      );
    for (const trailer of bad)
      assert.equal(
        approvalTrailerFailures([commit(`fix: x ${tag}\n\n${trailer}\n`)]).length,
        1,
        trailer,
      );
  }
  // Untagged commits need no trailer; each tagged commit is checked on its own.
  assert.deepEqual(approvalTrailerFailures([commit('docs: plain change')]), []);
  assert.equal(
    approvalTrailerFailures([
      commit(`a ${APPROVAL_TAGS[0]}\n\n${ok[0]}`),
      commit(`b ${APPROVAL_TAGS[1]}`),
    ]).length,
    1,
  );
});
