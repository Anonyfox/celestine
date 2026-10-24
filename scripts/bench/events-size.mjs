import { build } from 'esbuild';
import { gzipSync } from 'fflate';

const names = [
  '*',
  'findLunarPhases',
  'getMoonPhase',
  'findSeasons',
  'findSignIngresses',
  'findAspectTimes',
  'findVoidOfCourseMoon',
];
for (const name of names) {
  const contents =
    name === '*' ? "export * from 'celestine/events'" : `export {${name}} from 'celestine/events'`;
  const result = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true,
    minify: true,
    platform: 'neutral',
    format: 'esm',
    write: false,
    target: 'es2022',
  });
  const bytes = result.outputFiles[0].contents;
  console.log(name, bytes.length, gzipSync(bytes, { level: 9, mtime: 0 }).length);
  if (['findLunarPhases', 'getMoonPhase', 'findSeasons'].includes(name)) {
    const graph = await build({
      stdin: { contents, resolveDir: process.cwd() },
      bundle: true,
      platform: 'neutral',
      format: 'esm',
      write: false,
      metafile: true,
    });
    const unwanted = Object.entries(Object.values(graph.metafile.outputs)[0].inputs)
      .filter(([, info]) => info.bytesInOutput > 0)
      .map(([path]) => path)
      .filter((p) =>
        /asteroids|planets\/(mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)\./.test(p),
      );
    if (unwanted.length) throw Error(`Unexpected dependencies: ${unwanted}`);
  }
}
