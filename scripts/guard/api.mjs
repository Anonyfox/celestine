import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import * as api from '../../dist/index.js';
import { updating } from './common.mjs';

const program = ts.createProgram(['dist/index.d.ts'], {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const source = program.getSourceFile('dist/index.d.ts');
const flags =
  ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
const snapshot = {};
function runtime(value, path, depth = 0) {
  for (const key of Object.keys(value).sort()) {
    const entry = value[key];
    const name = `${path}.${key}`;
    snapshot[name] = { kind: typeof entry };
    if (entry && typeof entry === 'object' && depth < 2) runtime(entry, name, depth + 1);
    else if (typeof entry === 'string' || typeof entry === 'number') snapshot[name].value = entry;
  }
}
runtime(api, 'exports');
function resolve(symbol) {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}
function print(type) {
  return checker.typeToString(type, source, flags);
}
const paths = new Map();
function register(module, prefix) {
  for (const exported of checker.getExportsOfModule(module)) {
    const symbol = resolve(exported);
    const path = `${prefix}.${exported.name}`;
    if (!paths.has(symbol)) paths.set(symbol, path);
    if (symbol.flags & ts.SymbolFlags.Module) register(symbol, path);
  }
}
register(checker.getSymbolAtLocation(source), 'public');
function describe(symbol, path, ancestors = new Set()) {
  symbol = resolve(symbol);
  if (symbol.flags & ts.SymbolFlags.Module) {
    snapshot[path] = { kind: 'namespace' };
    for (const child of checker.getExportsOfModule(symbol))
      describe(child, `${path}.${child.name}`, ancestors);
    return;
  }
  const node = symbol.valueDeclaration ?? symbol.declarations?.[0] ?? source;
  const isType = Boolean(symbol.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias));
  const type = isType
    ? checker.getDeclaredTypeOfSymbol(symbol)
    : checker.getTypeOfSymbolAtLocation(symbol, node);
  const entry = {
    kind: isType
      ? 'type'
      : symbol.flags & ts.SymbolFlags.Class
        ? 'class'
        : symbol.flags & ts.SymbolFlags.Enum
          ? 'enum'
          : 'value',
    type: print(type),
  };
  snapshot[path] = entry;
  if (isType || symbol.flags & ts.SymbolFlags.Class) {
    const instance = checker.getDeclaredTypeOfSymbol(symbol);
    entry.members = Object.fromEntries(
      checker
        .getPropertiesOfType(instance)
        .map((member) => {
          const declaration = member.valueDeclaration ?? member.declarations?.[0] ?? node;
          return [
            member.name,
            {
              type: print(checker.getTypeOfSymbolAtLocation(member, declaration)),
              optional: Boolean(member.flags & ts.SymbolFlags.Optional),
            },
          ];
        })
        .sort(([a], [b]) => a.localeCompare(b, 'en')),
    );
    entry.definition = symbol.declarations
      .map((declaration) =>
        ts
          .createPrinter({ removeComments: true })
          .printNode(ts.EmitHint.Unspecified, declaration, declaration.getSourceFile())
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .join(' ');
  }
  // Follow referenced local types, using the public path that exposes them, never emit-file names.
  if (ancestors.has(symbol)) return;
  const next = new Set(ancestors).add(symbol);
  const references = new Map();
  function visit(node) {
    if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node)) {
      const target = resolve(
        checker.getSymbolAtLocation(node.typeName ?? node.expression) ?? symbol,
      );
      if (
        target !== symbol &&
        target.declarations?.some(
          (d) =>
            d.getSourceFile().fileName.includes('/dist/') ||
            d.getSourceFile().fileName.startsWith('dist/'),
        )
      )
        references.set(target.name, target);
    }
    ts.forEachChild(node, visit);
  }
  for (const declaration of symbol.declarations ?? []) visit(declaration);
  entry.references = {};
  for (const [name, target] of [...references].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const targetPath = paths.get(target) ?? `${path}.types.${name}`;
    entry.references[name] = targetPath;
    if (!paths.has(target)) {
      paths.set(target, targetPath);
      describe(target, targetPath, next);
    }
  }
  if (!references.size) delete entry.references;
}
for (const symbol of checker.getExportsOfModule(checker.getSymbolAtLocation(source)))
  describe(symbol, `public.${symbol.name}`);
const normalized = Object.fromEntries(
  Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b, 'en')),
);
if (updating) writeFileSync('api-surface.json', `${JSON.stringify(normalized, null, 2)}\n`);
else {
  const expected = JSON.parse(readFileSync('api-surface.json', 'utf8'));
  const changes = [...new Set([...Object.keys(expected), ...Object.keys(normalized)])].filter(
    (key) => JSON.stringify(expected[key]) !== JSON.stringify(normalized[key]),
  );
  if (changes.length)
    throw new Error(
      `Public API differs; review and run check:api -- --update:\n${changes.map((key) => `${key}: ${key in expected ? (key in normalized ? 'changed' : 'removed') : 'added'}`).join('\n')}`,
    );
  console.log(`API: ${Object.keys(normalized).length} entries match.`);
}
