import { defineConfig } from 'tsup';

// celestine/precise is opt-in and outside the root bundle. It gets its own CJS build (run after
// the root build) so the root bundle and its declarations stay untouched.
export default defineConfig({
  entry: { index: 'src/precise/index.ts' },
  format: ['cjs'],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: false,
  treeshake: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist/precise',
});
