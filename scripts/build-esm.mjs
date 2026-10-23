import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { transform } from 'esbuild';
import { rollup } from 'rollup';
import ts from 'typescript';

const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.', {
  emitDeclarationOnly: true,
  sourceMap: false,
  declarationMap: false,
});
const files = parsed.fileNames.filter(
  (file) => !file.endsWith('.test.ts') && !file.includes('__fixtures__'),
);
const program = ts.createProgram(files, parsed.options);
const result = program.emit();
const diagnostics = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics];
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getNewLine: () => '\n',
    }),
  );
  process.exit(1);
}

// Match the bundled build's enum constant folding across module boundaries while
// retaining real ESM imports/exports. The checker only folds known enum members.
const checker = program.getTypeChecker();
const printer = ts.createPrinter();
for (const file of files) {
  const source = program.getSourceFile(file);
  const transformed = ts.transform(source, [
    (context) => {
      function visit(node) {
        if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
          const member = checker.getSymbolAtLocation(
            ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression,
          );
          const declaration = member?.valueDeclaration;
          const value =
            declaration && ts.isEnumMember(declaration)
              ? checker.getConstantValue(declaration)
              : undefined;
          if (typeof value === 'string') return ts.factory.createStringLiteral(value);
          if (typeof value === 'number')
            return value < 0
              ? ts.factory.createPrefixUnaryExpression(
                  ts.SyntaxKind.MinusToken,
                  ts.factory.createNumericLiteral(-value),
                )
              : ts.factory.createNumericLiteral(value);
        }
        if (ts.isCaseBlock(node)) {
          const clauses = node.clauses.filter((clause, index, clauses) => {
            const following = clauses[index + 1];
            if (
              !ts.isCaseClause(clause) ||
              clause.statements.length ||
              !following ||
              !ts.isCaseClause(following)
            )
              return true;
            const a = ts.visitNode(clause.expression, visit);
            const b = ts.visitNode(following.expression, visit);
            return !(ts.isStringLiteral(a) && ts.isStringLiteral(b) && a.text === b.text);
          });
          return ts.factory.updateCaseBlock(
            node,
            clauses.map((clause) => ts.visitEachChild(clause, visit, context)),
          );
        }
        return ts.visitEachChild(node, visit, context);
      }
      return (node) => ts.visitNode(node, visit);
    },
  ]);
  const result = await transform(printer.printFile(transformed.transformed[0]), {
    loader: 'ts',
    format: 'esm',
    target: 'es2022',
  });
  const output = file.replace(/^src\//, 'dist/').replace(/\.ts$/, '.js');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, result.code);
  transformed.dispose();
}

// Remove unused private declarations without collapsing the module graph.
const graph = await rollup({
  input: 'dist/index.js',
  onwarn(warning, warn) {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') warn(warning);
  },
});
await graph.write({ dir: 'dist', format: 'esm', preserveModules: true });
await graph.close();
// Visit the numerical core first; stable module ordering also improves full-bundle gzip.
const priority = [
  'ephemeris',
  'chart',
  'progressions',
  'transits',
  'aspects',
  'houses',
  'time',
  'zodiac',
];
const root = ts.sys.readFile('dist/index.js').split('\n');
const namespaces = root.filter((line) => line.startsWith('import * as '));
namespaces.sort(
  (a, b) =>
    priority.findIndex((name) => a.includes(`'./${name}/`)) -
    priority.findIndex((name) => b.includes(`'./${name}/`)),
);
writeFileSync(
  'dist/index.js',
  [...namespaces, ...root.filter((line) => !line.startsWith('import * as '))].join('\n'),
);

// CJS subpaths share the single runtime bundle and its declaration namespace.
for (const name of priority) {
  writeFileSync(`dist/${name}/index.cjs`, `module.exports = require('../index.cjs').${name};\n`);
  writeFileSync(
    `dist/${name}/index.d.cts`,
    `import { ${name} } from '../index.cjs';\nexport = ${name};\n`,
  );
}
