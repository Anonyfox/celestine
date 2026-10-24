/** Read-only peer comparison. Install peers separately; this script never installs packages. */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { arch, cpus, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as current from 'celestine';
import { build } from 'esbuild';
import { gzipSync } from 'fflate';
import { bundleOptions } from '../guard/entries.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const peerIndex = args.indexOf('--peers');
if (peerIndex >= 0 && (!args[peerIndex + 1] || args[peerIndex + 1].startsWith('--')))
  throw new Error('--peers requires a directory');
const peers = resolve(
  peerIndex >= 0
    ? args[peerIndex + 1]
    : process.env.CELESTINE_COMPARE_DIR || join(root, '../celestine-compare'),
);
const requirePeer = createRequire(join(peers, 'package.json'));
const bodies = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
];
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const wrap = (x) => ((x % 360) + 360) % 360;
const delta = (a, b) => wrap(a - b + 180) - 180;
const notices = [
  'Baseline caveat: celestine-021 outputs are measured as returned; Pluto mixes J2000 planet and date Earth frames internally, so its output cannot be rigorously normalized externally.',
  'Frames: geocentric apparent LT+S reference; IAU76/80 mean ecliptic/equinox of date; TT fixture epochs. Swiss retains default gravitational deflection; Astronomy Engine GeoVector special-cases the Moon as GeoMoon.',
  'Speed omitted. Package byte totals exclude dependencies; browser entries do not provide identical chart features.',
];

// Same IAU76 precession and IAU80 mean obliquity as the fixture generator.
// Do not import that generator: its module body performs network requests/writes.
function meanEcliptic(jd, { x, y, z }) {
  const t = (jd - 2451545) / 36525;
  const rad = Math.PI / 180;
  const a = rad / 3600;
  const zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t ** 3) * a;
  const theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t ** 3) * a;
  const zee = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t ** 3) * a;
  const u = Math.cos(zeta) * x - Math.sin(zeta) * y;
  const v = Math.sin(zeta) * x + Math.cos(zeta) * y;
  const w = Math.cos(theta) * u - Math.sin(theta) * z;
  const zz = Math.sin(theta) * u + Math.cos(theta) * z;
  const xx = Math.cos(zee) * w - Math.sin(zee) * v;
  const yy = Math.sin(zee) * w + Math.cos(zee) * v;
  const e = (84381.448 - 46.815 * t - 0.00059 * t * t + 0.001813 * t ** 3) * a;
  const ey = Math.cos(e) * yy + Math.sin(e) * zz;
  const ez = -Math.sin(e) * yy + Math.cos(e) * zz;
  return {
    longitude: wrap(Math.atan2(ey, xx) / rad),
    latitude: Math.atan2(ez, Math.hypot(xx, ey)) / rad,
  };
}
function inventory(dir, exclude = new Set()) {
  let bytes = 0;
  let native = false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (exclude.has(entry.name) || entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const child = inventory(path);
      bytes += child.bytes;
      native ||= child.native;
    } else if (entry.isFile()) {
      bytes += statSync(path).size;
      native ||= entry.name === 'binding.gyp' || entry.name.endsWith('.node');
    }
  }
  return { bytes, native };
}
function packageDir(name) {
  let dir = dirname(requirePeer.resolve(name));
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Cannot locate package.json for ${name}`);
    dir = parent;
  }
  return dir;
}
function load(name) {
  try {
    requirePeer.resolve(name);
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    notices.push(`SKIP ${name}: not installed in ${peers}`);
    return null;
  }
  // Installed but broken packages must fail visibly, rather than masquerade as absent.
  return { name, module: requirePeer(name), dir: packageDir(name) };
}
const libraries = [{ name: 'celestine current', module: current, dir: root }];
for (const name of ['astronomy-engine', 'celestine-021']) {
  const lib = load(name);
  if (lib) libraries.push(lib);
}
const swiss = load('sweph') || load('swisseph');
if (swiss?.name === 'sweph')
  notices.push('Only sweph measured; swisseph was not loaded or measured.');
if (swiss) libraries.push(swiss);
for (const lib of libraries) {
  const p = json(join(lib.dir, 'package.json'));
  lib.metadata = {
    version: p.version,
    license: p.license ?? null,
    runtimeDependencies: Object.keys(p.dependencies || {}).length,
  };
  if (lib.dir === root) {
    // Match package files, not the checkout, build tooling, fixtures or node_modules.
    lib.inventory = inventory(join(root, 'dist'));
    for (const name of ['package.json', 'README.md', 'LICENSE'])
      lib.inventory.bytes += statSync(join(root, name)).size;
  } else lib.inventory = inventory(lib.dir, new Set(['node_modules']));
  if (lib.name === 'astronomy-engine') {
    // GeoVector is EQJ (J2000 equatorial), so rotate directly to the fixture's
    // mean frame. This avoids true-of-date nutation and model differences entirely.
    lib.position = (body, jd) =>
      meanEcliptic(
        jd,
        lib.module.GeoVector(body, lib.module.AstroTime.FromTerrestrialTime(jd - 2451545), true),
      );
  } else if (lib === swiss) {
    const s = lib.module;
    const flags = s.constants || s;
    lib.position = (body, jd) => {
      const id = flags[`SE_${body.toUpperCase()}`];
      const mask = flags.SEFLG_MOSEPH | flags.SEFLG_NONUT;
      if (lib.name === 'sweph') {
        const result = s.calc(jd, id, mask);
        if (result.flag < 0 || !(result.flag & flags.SEFLG_MOSEPH))
          throw new Error(JSON.stringify(result));
        // NONUT uses Swiss's modern mean-of-date precession. Re-rotate its
        // mean J2000 equatorial vector using the fixture's exact IAU76/80 frame.
        const vector = s.calc(
          jd,
          id,
          mask | flags.SEFLG_J2000 | flags.SEFLG_EQUATORIAL | flags.SEFLG_XYZ,
        );
        if (vector.flag < 0 || !(vector.flag & flags.SEFLG_MOSEPH))
          throw new Error(JSON.stringify(vector));
        return meanEcliptic(jd, { x: vector.data[0], y: vector.data[1], z: vector.data[2] });
      }
      let result;
      s.swe_calc(jd, id, mask, (value) => {
        result = value;
      });
      if (!result || result.error)
        throw new Error(`swisseph synchronous swe_calc unavailable: ${JSON.stringify(result)}`);
      return { longitude: result.longitude, latitude: result.latitude };
    };
  } else {
    const ephemeris = lib.module.ephemeris || lib.module;
    lib.position = (body, jd) => ephemeris[`get${body}Position`](jd, { includeSpeed: false });
  }
}
const fixtures = bodies.map((body) =>
  json(join(root, `src/ephemeris/__fixtures__/horizons/${body.toLowerCase()}.json`)),
);
const errors = [];
function stats(values) {
  if (!values.every(Number.isFinite)) throw new Error('Non-finite error');
  return {
    max: Math.max(...values.map(Math.abs)),
    rms: Math.sqrt(values.reduce((sum, x) => sum + x * x, 0) / values.length),
  };
}
for (const lib of libraries) {
  for (const fixture of fixtures) {
    const lon = [],
      lat = [];
    for (const [jd, , longitude, latitude] of fixture.rows) {
      const p = lib.position(fixture.body, jd);
      lon.push(delta(p.longitude, longitude) * 3600);
      lat.push((p.latitude - latitude) * 3600);
    }
    errors.push({
      library: lib.name,
      body: fixture.body,
      samples: fixture.rows.length,
      fromTT: fixture.rows[0][1],
      toTT: fixture.rows.at(-1)[1],
      longitudeArcsec: stats(lon),
      latitudeArcsec: stats(lat),
    });
  }
}
const bundles = [];
async function bundle(library, entry, contents, resolveDir) {
  const result = await build({ ...bundleOptions, stdin: { contents, resolveDir } });
  const bytes = result.outputFiles[0].contents;
  bundles.push({
    library,
    entry,
    minBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9, mtime: 0 }).length,
  });
}
await bundle(
  'celestine current',
  'root chart',
  "export { calculateChart } from 'celestine';",
  root,
);
await bundle(
  'celestine current',
  'subpath chart',
  "export { calculateChart } from 'celestine/chart';",
  root,
);
for (const lib of libraries.slice(1)) {
  if (lib === swiss)
    bundles.push({ library: lib.name, entry: 'not bundleable for browsers (native addon)' });
  else if (lib.name === 'astronomy-engine')
    await bundle(
      lib.name,
      'positions + sidereal time',
      `import { GeoVector, AstroTime, SiderealTime } from 'astronomy-engine';
export { SiderealTime };
const wrap = ${wrap.toString()};
${meanEcliptic.toString()}
export function positions(jd) {
  return ${JSON.stringify(bodies)}.map(body => meanEcliptic(jd,
    GeoVector(body, AstroTime.FromTerrestrialTime(jd - 2451545), true)));
}`,
      peers,
    );
  else
    await bundle(
      lib.name,
      'root chart',
      "import * as c from 'celestine-021'; export const calculateChart = c.calculateChart || c.chart.calculateChart;",
      peers,
    );
}
const anchors = [];
for (const [body, ut] of [
  ['Pluto', '2026-08-05T00:00:00Z'],
  ['Pluto', '1955-07-23T00:00:00Z'],
  ['Pluto', '1947-01-13T03:00:00Z'],
  ['Mercury', '1969-02-04T03:00:00Z'],
]) {
  const ae = libraries.find((lib) => lib.name === 'astronomy-engine');
  if (!ae) {
    notices.push(
      `SKIP anchor ${body}: astronomy-engine required for UT-to-TT conversion and comparison`,
    );
    continue;
  }
  const jdTT = new ae.module.AstroTime(new Date(ut)).tt + 2451545;
  const reference = ae.position(body, jdTT).longitude;
  for (const lib of libraries) {
    const longitude = lib.position(body, jdTT).longitude;
    anchors.push({
      body,
      ut,
      jdTT,
      library: lib.name,
      deltaTSeconds: (jdTT - (Date.parse(ut) / 86400000 + 2440587.5)) * 86400,
      longitudeArcmin: longitude * 60,
      minusAstronomyEngineArcmin: delta(longitude, reference) * 60,
    });
  }
}
// Independent native mean-of-date paths expose nutation/precession mistakes.
// No empirical offsets are subtracted from any measurement.
const frameChecks = [];
for (const lib of libraries) {
  if (lib.name !== 'astronomy-engine' && lib !== swiss) continue;
  for (const fixture of fixtures) {
    const residuals = [];
    for (const [jd] of fixture.rows) {
      let other;
      if (lib.name === 'astronomy-engine') {
        const a = lib.module;
        const t = a.AstroTime.FromTerrestrialTime(jd - 2451545);
        const vector = a.GeoVector(fixture.body, t, true);
        other = a.Ecliptic(vector).elon - a.e_tilt(t).dpsi / 3600;
      } else {
        const a = lib.module;
        const c = a.constants || a;
        const flags = c.SEFLG_MOSEPH | c.SEFLG_NONUT;
        // sweph only: swisseph's alternate callback API is not assumed here.
        if (lib.name !== 'sweph') continue;
        const r = a.calc(jd, c[`SE_${fixture.body.toUpperCase()}`], flags);
        if (r.flag < 0 || !(r.flag & c.SEFLG_MOSEPH)) throw new Error(JSON.stringify(r));
        other = r.data[0];
      }
      residuals.push(delta(lib.position(fixture.body, jd).longitude, other) * 3600);
    }
    if (residuals.length)
      frameChecks.push({
        library: lib.name,
        body: fixture.body,
        comparison:
          lib === swiss
            ? 'native mean date vs J2000 rotated IAU76/80'
            : 'IAU76/80 vs Ecliptic minus full dpsi',
        maxArcsec: stats(residuals).max,
        rmsArcsec: stats(residuals).rms,
      });
  }
}
const result = {
  date: '2026-10-24',
  node: process.version,
  machine: `${platform()} ${arch()} ${cpus()[0]?.model}`,
  peers,
  notices,
  packages: libraries.map((l) => ({
    library: l.name,
    ...l.metadata,
    installedBytes: l.inventory.bytes,
    native: l.inventory.native,
  })),
  errors,
  bundles,
  anchors,
  frameChecks,
};
function table(rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  console.log(`| ${keys.join(' | ')} |\n| ${keys.map(() => '---').join(' | ')} |`);
  for (const row of rows)
    console.log(
      `| ${keys.map((key) => (typeof row[key] === 'object' ? JSON.stringify(row[key]) : typeof row[key] === 'number' && !Number.isInteger(row[key]) && !key.startsWith('jd') ? row[key].toFixed(3) : String(row[key] ?? 'unavailable'))).join(' | ')} |`,
    );
}
if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
else {
  console.log(
    `Date: ${result.date}\nNode: ${result.node}\nMachine: ${result.machine}\nPeers: ${peers}`,
  );
  for (const notice of notices) console.log(notice);
  table(result.packages);
  table(
    errors.map((e) => ({
      library: e.library,
      body: e.body,
      samples: e.samples,
      fromTT: e.fromTT,
      toTT: e.toTT,
      lonMaxArcsec: e.longitudeArcsec.max,
      lonRmsArcsec: e.longitudeArcsec.rms,
      latMaxArcsec: e.latitudeArcsec.max,
      latRmsArcsec: e.latitudeArcsec.rms,
    })),
  );
  table(bundles);
  table(anchors);
  table(frameChecks);
}
