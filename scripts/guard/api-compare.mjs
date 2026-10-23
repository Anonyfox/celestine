import assert from 'node:assert/strict';
import ts from 'typescript';

// Compare public names independently of the snapshot schema or bundler-private names.
function paths(file) {
  const program = ts.createProgram([file], {
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const result = [];
  function visit(module, prefix, depth) {
    for (let symbol of checker.getExportsOfModule(module)) {
      const name = `${prefix}.${symbol.name}`;
      result.push(name);
      if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
      if (depth === 0 && symbol.flags & ts.SymbolFlags.Module) visit(symbol, name, 1);
    }
  }
  visit(checker.getSymbolAtLocation(program.getSourceFile(file)), 'public', 0);
  return result.sort();
}
const [before, after = 'dist/index.d.ts'] = process.argv.slice(2);
if (!before)
  throw new Error('Usage: node scripts/guard/api-compare.mjs <before.d.ts> [after.d.ts]');
const old = paths(before),
  next = paths(after);
for (const name of new Set([...old, ...next]))
  console.log(
    `${old.includes(name) ? 'before' : '      '} ${next.includes(name) ? 'after' : '     '} ${name}`,
  );
assert.deepEqual(next, old);
console.log(`Identical public export paths: ${next.length}.`);
