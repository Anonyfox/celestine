import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { calculateChart } from './index.js';

const root = resolve(import.meta.dirname, '..');
const distURL = pathToFileURL(join(root, 'dist/index.js')).href;
async function run(file: string) {
  const directory = mkdtempSync(join(tmpdir(), 'celestine-run-'));
  const output = join(directory, 'stdout');
  const errors = join(directory, 'stderr');
  const stdout = openSync(output, 'w');
  const stderr = openSync(errors, 'w');
  try {
    const status = await new Promise<number | null>((resolveStatus, reject) => {
      const child = spawn(process.execPath, [file, '2026-10-24T12:00:00Z'], {
        cwd: root,
        stdio: ['ignore', stdout, stderr],
        timeout: 8000,
      });
      child.once('error', reject);
      child.once('close', resolveStatus);
    });
    assert.equal(status, 0, readFileSync(errors, 'utf8'));
    return readFileSync(output, 'utf8');
  } finally {
    closeSync(stdout);
    closeSync(stderr);
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('runnable examples', () => {
  it('prints future retrograde stations and lunar phase data', async () => {
    const output = await run(join(root, 'examples/node-cli.mjs'));
    assert.match(output, /station-retrograde/);
    assert.match(output, /Mercury: \d{4}-\d{2}-\d{2}T[\d:.]+Z/);
    assert.match(output, /Moon phase: (new-moon|first-quarter|full-moon|last-quarter)/);
    assert.match(output, /Next principal phase: .*\d{4}-\d{2}-\d{2}T/);
    assert.match(output, /UTC/);
  });

  it('runs the browser computation without a DOM and matches the chart API', async () => {
    const html = readFileSync(join(root, 'examples/browser-natal-chart.html'), 'utf8');
    const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(script, 'Browser example must contain a module script');
    const source = script.replace(/https:\/\/esm\.sh\/celestine@[^'"\s]+/, distURL);
    assert.ok(source.includes(distURL), 'Expected CDN import to rewrite');
    const module = await import(
      `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
    );
    const birth = {
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      second: 0,
      timezone: 0,
      latitude: 51.5074,
      longitude: -0.1278,
    };
    const result = module.computeChart(birth);
    assert.equal(
      result.planets.find((planet: { name: string }) => planet.name === 'Sun').signName,
      'Capricorn',
    );
    assert.deepEqual(result, calculateChart(birth, { houseSystem: 'placidus' }));
  });

  it('typechecks the Worker and README quickstart, then executes the quickstart', async () => {
    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    const section = readme.match(/^## Quick[^\n]*\n([\s\S]*?)(?=^## |$(?![\s\S]))/im)?.[1];
    assert.ok(section, 'README must contain a heading starting with "## Quick"');
    const quickstart = section.match(/```(?:ts|typescript)\s*\n([\s\S]*?)```/)?.[1];
    assert.ok(quickstart, 'README Quick section must contain a ts/typescript code block');
    const directory = mkdtempSync(join(tmpdir(), 'celestine-examples-'));
    try {
      const file = join(directory, 'quickstart.mts');
      writeFileSync(file, quickstart);
      const options: ts.CompilerOptions = {
        strict: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
        types: [],
        skipLibCheck: true,
      };
      const host = ts.createCompilerHost(options);
      // Temp files live outside the package: resolve self-references from its root.
      host.resolveModuleNames = (names, containingFile) =>
        names.map(
          (name) =>
            ts.resolveModuleName(
              name,
              name === 'celestine' ? join(root, 'examples/check.mts') : containingFile,
              options,
              ts.sys,
            ).resolvedModule,
        );
      const program = ts.createProgram(
        [file, join(root, 'examples/cloudflare-worker.ts')],
        options,
        host,
      );
      const diagnostics = ts.getPreEmitDiagnostics(program);
      assert.equal(
        diagnostics.length,
        0,
        ts.formatDiagnosticsWithColorAndContext(diagnostics, {
          getCanonicalFileName: (name) => name,
          getCurrentDirectory: () => root,
          getNewLine: () => '\n',
        }),
      );
      const transpile = (source: string) =>
        ts
          .transpileModule(source, {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
          })
          .outputText.replace(/(['"])celestine\1/g, JSON.stringify(distURL));
      const executable = join(directory, 'quickstart.mjs');
      writeFileSync(executable, transpile(quickstart));
      await run(executable);
      const workerFile = join(directory, 'worker.mjs');
      writeFileSync(
        workerFile,
        transpile(readFileSync(join(root, 'examples/cloudflare-worker.ts'), 'utf8')),
      );
      const { default: worker } = await import(pathToFileURL(workerFile).href);
      const valid = await worker.fetch(
        new Request('https://example.test/?date=2000-01-01T12:00&tz=0&lat=51.5074&lon=-0.1278'),
      );
      assert.equal(valid.status, 200);
      assert.equal(
        (await valid.json()).planets.find((p: { name: string }) => p.name === 'Sun').signName,
        'Capricorn',
      );
      for (const query of [
        '',
        '?date=2000-02-30T12:00&tz=0&lat=0&lon=0',
        '?date=2000-01-01T12:00&tz=&lat=0&lon=0',
      ]) {
        assert.equal(
          (await worker.fetch(new Request(`https://example.test/${query}`))).status,
          400,
        );
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
