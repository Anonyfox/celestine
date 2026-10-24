/**
 * celestine/precise bundle budgets and tree-shaking. Measures the built package (`dist/`) the
 * same way as scripts/guard/size.mjs (esbuild, neutral platform, fflate gzip level 9) against
 * the `precise.*` entries in budgets.json. Skipped when the package has not been built.
 */
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { build } from 'esbuild';
import { gzipSync } from 'fflate';

const built = existsSync(new URL('../../dist/precise/index.js', import.meta.url));
const budgets = JSON.parse(readFileSync(new URL('../../budgets.json', import.meta.url), 'utf8'));
const BODIES = ['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta'];
const entries: Record<string, string> = {
  'precise.all': `export * from 'celestine/precise';`,
};
for (const body of BODIES)
  entries[`precise.get${body}Position`] = `export {get${body}Position} from 'celestine/precise';`;

async function bundle(contents: string) {
  const result = await build({
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'neutral',
    treeShaking: true,
    write: false,
    stdin: { contents, resolveDir: process.cwd() },
  });
  return result.outputFiles[0].contents;
}

describe('celestine/precise bundles', { skip: !built && 'dist/ not built' }, () => {
  for (const [entry, contents] of Object.entries(entries)) {
    it(`${entry} stays within budgets.json size.${entry}`, async () => {
      const bytes = await bundle(contents);
      const limit = budgets.size[entry];
      assert.ok(limit, `budgets.json size.${entry} exists`);
      assert.ok(bytes.length <= limit.minBytes, `${entry} min ${bytes.length} > ${limit.minBytes}`);
      const gzip = gzipSync(bytes, { level: 9, mtime: 0 }).length;
      assert.ok(gzip <= limit.gzipBytes, `${entry} gzip ${gzip} > ${limit.gzipBytes}`);
    });
  }

  it('one body bundles only its own data', async () => {
    for (const body of BODIES) {
      const code = new TextDecoder().decode(await bundle(entries[`precise.get${body}Position`]));
      assert.equal(code.match(/scale:/g)?.length, 1, `${body} bundle holds one model`);
    }
  });
});
