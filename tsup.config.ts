import { defineConfig } from 'tsup';

export default defineConfig({
  // Subpath-only APIs have separate CJS bundles.
  entry: {
    index: 'src/index.ts',
    'events/index': 'src/events/index.ts',
    'retrograde/index': 'src/retrograde/index.ts',
  },
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
