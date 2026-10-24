/**
 * celestine/precise tree-shaking: a single-body import bundles only that body's model. Sizes
 * are gated by scripts/guard/size.mjs (`precise.*` entries). Skipped when dist/ is not built.
 */
import { strict as assert } from 'node:assert';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import { build } from 'esbuild';

const built = existsSync(new URL('../../dist/precise/index.js', import.meta.url));
const BODIES = ['Chiron', 'Ceres', 'Pallas', 'Juno', 'Vesta'];

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
  return new TextDecoder().decode(result.outputFiles[0].contents);
}

describe('celestine/precise bundles', { skip: !built && 'dist/ not built' }, () => {
  it('one body bundles only its own data', async () => {
    for (const body of BODIES) {
      const code = await bundle(`export {get${body}Position} from 'celestine/precise';`);
      assert.equal(code.match(/scale:/g)?.length, 1, `${body} bundle holds one model`);
    }
    const all = await bundle(`export * from 'celestine/precise';`);
    assert.equal(all.match(/scale:/g)?.length, BODIES.length, 'full subpath holds every model');
  });
});
