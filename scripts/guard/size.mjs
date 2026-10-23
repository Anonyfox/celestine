import { build } from 'esbuild';
import { gzipSync } from 'fflate';
import { budgets, gate, update, updating } from './common.mjs';

import { bundleOptions, entries } from './entries.mjs';

// gzip via pure-JS fflate (level 9, mtime 0): node:zlib output differs between platforms and
// Node builds (system vs bundled zlib), fflate is byte-identical everywhere.
const measured = {};
for (const [name, contents] of Object.entries(entries)) {
  const result = await build({
    ...bundleOptions,
    stdin: { contents, resolveDir: process.cwd() },
  });
  const bytes = result.outputFiles[0].contents;
  measured[name] = {
    minBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9, mtime: 0 }).length,
  };
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
