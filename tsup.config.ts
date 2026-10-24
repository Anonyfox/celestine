import { defineConfig } from 'tsup';

export default defineConfig({
  // celestine/events is subpath-only, so its CJS build is a separate bundle.
  entry: { index: 'src/index.ts', 'events/index': 'src/events/index.ts' },
  format: ['cjs'],
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
});
