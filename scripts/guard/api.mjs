import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';
import * as api from '../../dist/index.js';
import { updating } from './common.mjs';

const source = ts.createSourceFile(
  'index.d.ts',
  readFileSync('dist/index.d.ts', 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
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
// tsup emits a self-contained declaration bundle. Keep every named declaration,
// including namespace export aliases and referenced types, to cover output shapes.
function declarations(statements, prefix = 'declaration') {
  for (const statement of statements) {
    if (ts.isModuleDeclaration(statement) && statement.body && ts.isModuleBlock(statement.body)) {
      declarations(statement.body.statements, `${prefix}.${statement.name.getText(source)}`);
      continue;
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        snapshot[`${prefix}.export.${element.name.text}`] = {
          kind: 'export',
          text: printer
            .printNode(ts.EmitHint.Unspecified, element, source)
            .replace(/\s+/g, ' ')
            .trim(),
        };
      }
      continue;
    }
    const text = printer
      .printNode(ts.EmitHint.Unspecified, statement, source)
      .replace(/\s+/g, ' ')
      .trim();
    const name =
      statement.name?.getText(source) ??
      (ts.isVariableStatement(statement)
        ? statement.declarationList.declarations.map((item) => item.name.getText(source)).join(',')
        : undefined);
    if (!name) throw new Error(`Unnamed declaration: ${text.slice(0, 100)}`);
    const key = `${prefix}.${name}`;
    if (snapshot[key]) snapshot[key].text += ` ${text}`;
    else snapshot[key] = { kind: ts.SyntaxKind[statement.kind], text };
  }
}
declarations(source.statements);
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
      `Public API differs; review and run check:api -- --update:\n${changes.join('\n')}`,
    );
  console.log(`API: ${Object.keys(normalized).length} entries match.`);
}
