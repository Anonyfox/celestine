// Offline accuracy report. Run npm run build first. No source modules are imported.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import * as events from '../../dist/events/index.js';
import { calculateAngles, obliquityOfEcliptic } from '../../dist/houses/index.js';
import { ephemeris, time } from '../../dist/index.js';
import * as precise from '../../dist/precise/index.js';
import { render } from './accuracy/render.mjs';

// Absolute residual guards, approximately 1.5 times measured maxima, rounded up.
// Counts and matching are checked separately; these are not physical uncertainty bounds.
export const THRESHOLDS = {
  eclipses: {
    solar: 26,
    lunar: 18,
    combined: 26,
    solarMagnitude: 0.0008,
    lunarUmbralMagnitude: 0.0011,
    lunarPenumbralMagnitude: 0.0011,
  },
  positions: {
    Sun: {
      longitude: 0.46,
      latitude: 0.23,
    },
    Moon: {
      longitude: 12,
      latitude: 2.0,
    },
    Mercury: {
      longitude: 1.7,
      latitude: 1.1,
    },
    Venus: {
      longitude: 0.87,
      latitude: 0.66,
    },
    Mars: {
      longitude: 1.8,
      latitude: 1.1,
    },
    Jupiter: {
      longitude: 2.1,
      latitude: 0.96,
    },
    Saturn: {
      longitude: 2.5,
      latitude: 1.6,
    },
    Uranus: {
      longitude: 5.1,
      latitude: 1.0,
    },
    Neptune: {
      longitude: 7.0,
      latitude: 0.54,
    },
    Pluto: {
      longitude: 4.8,
      latitude: 0.53,
    },
    Chiron: {
      longitude: 30000,
      latitude: 3400,
    },
    'Chiron precise': {
      longitude: 0.61,
      latitude: 0.66,
    },
  },
  node: {
    true: 1700,
    mean: 0.19,
  },
  angles: {
    ascendant: 0.01,
    midheaven: 0.01,
  },
  deltaT: {
    '1657–1799': 20,
    '1800–1899': 2.1,
    '1900–1954': 0.49,
    '1955–2026': 0.16,
  },
  timing: {
    'USNO phases': 90,
    'USNO seasons': 64,
    'Horizons stations mean': 95,
    'Horizons stations true': 99,
    'Horizons ingresses mean': 18000,
    'Horizons ingresses true': 17000,
  },
};
const root = new URL('../../', import.meta.url);
const fixtures = [];
const missing = [];
async function json(path) {
  const value = JSON.parse(await readFile(new URL(path, root), 'utf8'));
  if (path.startsWith('src/')) fixtures.push(path);
  return value;
}
async function optional(path) {
  try {
    return await json(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    missing.push(path);
    return null;
  }
}
const wrap = (x) => ((((x + 180) % 360) + 360) % 360) - 180;
const arcsec = (a, b) => Math.abs(wrap(a - b)) * 3600;
const date = (jd) => new Date((jd - 2440587.5) * 86400000).toISOString().slice(0, 10);
function stats(rows, key = 'error') {
  if (!rows.length) throw Error('Empty accuracy sample');
  const sorted = rows.map((r) => Math.abs(r[key])).sort((a, b) => a - b);
  if (!sorted.every(Number.isFinite)) throw Error('Non-finite residual');
  const n = sorted.length;
  return {
    count: n,
    max: sorted[n - 1],
    median: (sorted[Math.floor((n - 1) / 2)] + sorted[Math.floor(n / 2)]) / 2,
    rows,
  };
}
const failures = [];
function guard(name, measured, threshold) {
  if (!Number.isFinite(threshold) || measured > threshold)
    failures.push(`${name}: ${measured} exceeds ${threshold}`);
}
const a = 2458849.5;
const b = 2462867.5; // 2031-01-01, exclusive, TT.
const canon = await json('src/events/__fixtures__/nasa-eclipses.json');
const refs = canon.events.filter((r) => r.jd >= a && r.jd < b);
const found = events.findEclipses(a, b);
const used = new Set();
const eclipseRows = refs.map((r) => {
  const candidates = found
    .map((e, i) => ({ e, i }))
    .filter(({ e, i }) => !used.has(i) && e.kind === r.kind && Math.abs(e.jd - r.jd) < 1)
    .sort((x, y) => Math.abs(x.e.jd - r.jd) - Math.abs(y.e.jd - r.jd));
  const match = candidates[0];
  if (!match) throw Error(`Missing eclipse: ${r.date} ${r.kind}`);
  used.add(match.i);
  return {
    date: r.date,
    jd: r.jd,
    kind: r.kind,
    referenceType: r.type,
    type: match.e.type,
    actualJD: match.e.jd,
    error: (match.e.jd - r.jd) * 86400,
    utError: (match.e.jdUT - (r.jd - r.deltaT / 86400)) * 86400,
    gammaError: match.e.gamma - r.gamma,
    magnitudeError:
      match.e.magnitude -
      (r.kind === 'solar'
        ? r.magnitude
        : r.type === 'penumbral'
          ? r.penumbralMagnitude
          : r.umbralMagnitude),
    umbralMagnitudeError: r.kind === 'lunar' ? match.e.umbralMagnitude - r.umbralMagnitude : null,
    penumbralMagnitudeError:
      r.kind === 'lunar' ? match.e.penumbralMagnitude - r.penumbralMagnitude : null,
  };
});
if (used.size !== found.length)
  failures.push(`Unmatched Celestine eclipses: ${found.length - used.size}`);
const eclipses = Object.fromEntries(
  ['solar', 'lunar', 'combined'].map((kind) => {
    const rows = eclipseRows.filter((r) => kind === 'combined' || r.kind === kind);
    const result = {
      ...stats(rows),
      canonCount: rows.length,
      foundCount: found.filter((e) => kind === 'combined' || e.kind === kind).length,
      maxMagnitudeError: Math.max(0, ...rows.map((r) => Math.abs(r.magnitudeError))),
      maxUmbralMagnitudeError: Math.max(
        0,
        ...rows.map((r) => Math.abs(r.umbralMagnitudeError ?? 0)),
      ),
      maxPenumbralMagnitudeError: Math.max(
        0,
        ...rows.map((r) => Math.abs(r.penumbralMagnitudeError ?? 0)),
      ),
      typeAgreement: rows.filter((r) => r.type === r.referenceType).length,
    };
    guard(`eclipses.${kind} seconds`, result.max, THRESHOLDS.eclipses[kind]);
    if (result.typeAgreement !== result.canonCount)
      failures.push(`Eclipse type disagreements: ${kind}`);
    return [kind, result];
  }),
);
guard(
  'eclipses.solar magnitude',
  eclipses.solar.maxMagnitudeError,
  THRESHOLDS.eclipses.solarMagnitude,
);
guard(
  'eclipses.lunar umbral magnitude',
  eclipses.lunar.maxUmbralMagnitudeError,
  THRESHOLDS.eclipses.lunarUmbralMagnitude,
);
guard(
  'eclipses.lunar penumbral magnitude',
  eclipses.lunar.maxPenumbralMagnitudeError,
  THRESHOLDS.eclipses.lunarPenumbralMagnitude,
);
const recentCanon = await json('src/events/__fixtures__/nasa-eclipses-2026-2028.json');
const eclipses2026To2028 = recentCanon.events.map((r) => {
  const row = eclipseRows.find((e) => e.date === r.date && e.kind === r.kind);
  if (!row) throw Error(`Missing 2026–2028 eclipse ${r.date}`);
  return row;
});
const positions = {};
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
  'Chiron',
];
for (const body of bodies) {
  const fixture = await json(`src/ephemeris/__fixtures__/horizons/${body.toLowerCase()}.json`);
  for (const mode of body === 'Chiron' ? ['default', 'precise'] : ['default']) {
    const name = mode === 'precise' ? 'Chiron precise' : body;
    const rows = fixture.rows
      .filter(
        ([jd]) =>
          mode !== 'precise' ||
          (jd >= precise.PRECISE_RANGE.startJD && jd <= precise.PRECISE_RANGE.endJD),
      )
      .map(([jd, , lon, lat]) => {
        const p =
          mode === 'precise' ? precise.getChironPosition(jd) : ephemeris.getPosition(body, jd);
        return {
          jd,
          date: date(jd),
          error: arcsec(p.longitude, lon),
          latitudeError: arcsec(p.latitude, lat),
        };
      });
    const result = {
      ...stats(rows),
      maxLatitude: stats(rows, 'latitudeError').max,
      start: date(Math.min(...rows.map((r) => r.jd))),
      end: date(Math.max(...rows.map((r) => r.jd))),
    };
    positions[name] = result;
    guard(`positions.${name} longitude arcsec`, result.max, THRESHOLDS.positions[name]?.longitude);
    guard(
      `positions.${name} latitude arcsec`,
      result.maxLatitude,
      THRESHOLDS.positions[name]?.latitude,
    );
  }
}
const rawNode = await optional('src/ephemeris/__fixtures__/horizons-node/moon-node.json');
const nodeFixture = await optional('src/ephemeris/__fixtures__/horizons-node/erfa-node.json');
const node = {};
if (rawNode && nodeFixture) {
  if (
    rawNode.rows.length !== nodeFixture.rows.length ||
    rawNode.rows.some((r, i) => r.jd !== nodeFixture.rows[i].jd)
  )
    throw Error('Node reference epochs differ');
  for (const kind of ['true', 'mean']) {
    const rows = nodeFixture.rows.map((r) => ({
      jd: r.jd,
      error: arcsec(
        kind === 'true'
          ? ephemeris.getNorthNode(r.jd).northNode
          : ephemeris.getMeanNodeLongitude(r.jd),
        kind === 'true' ? r.osculatingNode : r.meanNode,
      ),
    }));
    node[kind] = stats(rows);
    guard(`node.${kind} arcsec`, node[kind].max, THRESHOLDS.node[kind]);
  }
}
const angleFixture = await optional('src/houses/__fixtures__/erfa-angles.json');
const angles = {};
if (angleFixture) {
  const calculated = angleFixture.rows.map((r) => ({
    r,
    p: calculateAngles(
      time.greenwichMeanSiderealTime(r.jd) + r.longitude,
      obliquityOfEcliptic(r.jd),
      r.latitude,
    ),
  }));
  for (const kind of ['ascendant', 'midheaven']) {
    angles[kind] = stats(calculated.map(({ r, p }) => ({ ...r, error: arcsec(p[kind], r[kind]) })));
    guard(`angles.${kind} arcsec`, angles[kind].max, THRESHOLDS.angles[kind]);
  }
}
const deltaRows = [];
for (const file of (await readdir(new URL('src/time/__fixtures__/delta-t/', root)))
  .filter((f) => f.endsWith('.json'))
  .sort()) {
  const fixture = await json(`src/time/__fixtures__/delta-t/${file}`);
  for (const [year, reference] of fixture.rows)
    deltaRows.push({
      year,
      source: file,
      reference,
      error: time.deltaTAt(2451545 + (year - 2000) * 365.25) - reference,
    });
}
const deltaT = {};
for (const [name, start, end] of [
  ['1657–1799', 1657, 1800],
  ['1800–1899', 1800, 1900],
  ['1900–1954', 1900, 1955],
  ['1955–2026', 1955, 2027],
]) {
  deltaT[name] = stats(deltaRows.filter((r) => r.year >= start && r.year < end));
  guard(`deltaT.${name} seconds`, deltaT[name].max, THRESHOLDS.deltaT[name]);
}
const timing = {};
for (const kind of ['phases', 'seasons']) {
  const fixture = await json(`src/events/__fixtures__/usno-${kind}.json`);
  const residuals = [];
  for (const [year, rows] of Object.entries(fixture)) {
    const start = Date.UTC(Number(year), 0, 1) / 86400000 + 2440587.5;
    const end = Date.UTC(Number(year) + 1, 0, 1) / 86400000 + 2440587.5;
    const actual = (kind === 'phases' ? events.findLunarPhases : events.findSeasons)(
      time.toTT(start),
      time.toTT(end),
    );
    if (actual.length !== rows.length)
      throw Error(`USNO ${kind} count ${year}: ${actual.length}/${rows.length}`);
    rows.forEach(([jd], i) => {
      residuals.push({ jd, year: Number(year), error: (actual[i].jdUT - jd) * 86400 });
    });
  }
  timing[`USNO ${kind}`] = { ...stats(residuals), unit: 's' };
}
const stationRefs = await json('src/events/__fixtures__/horizons-stations.json');
for (const frame of ['mean', 'true']) {
  const residuals = stationRefs.map((r) => {
    const jd = frame === 'mean' ? r.jdMean : r.jd;
    const actual = events.findStations(r.body, jd - 10, jd + 10, {
      includeNutation: frame === 'true',
    });
    if (actual.length !== 1 || actual[0].type !== r.type)
      throw Error(`Station mismatch ${r.body} ${jd}`);
    return { jd, body: r.body, error: (actual[0].jd - jd) * 1440 };
  });
  timing[`Horizons stations ${frame}`] = { ...stats(residuals), unit: 'min' };
}
const eventRefs = await json('src/events/__fixtures__/horizons-events.json');
for (const frame of ['mean', 'true']) {
  const rows = eventRefs
    .filter((r) => r.kind === 'ingress')
    .map((r) => {
      const jd = frame === 'mean' ? r.jdMean : r.jd;
      const actual = events.findSignIngresses(r.body, jd - 0.2, jd + 0.2, {
        includeNutation: frame === 'true',
      });
      if (actual.length !== 1) throw Error(`Ingress mismatch ${r.body} ${jd}`);
      return { jd, body: r.body, error: (actual[0].jd - jd) * 86400 };
    });
  timing[`Horizons ingresses ${frame}`] = { ...stats(rows), unit: 's' };
}
for (const [name, result] of Object.entries(timing))
  guard(`timing.${name} ${result.unit}`, result.max, THRESHOLDS.timing[name]);
for (const path of missing) failures.push(`Missing required reference fixture: ${path}`);
const chironRecent = positions.Chiron.rows.filter((r) => r.jd >= a && r.jd < b);
const report = {
  version: (await json('package.json')).version,
  runDate: new Date().toISOString(),
  nodeVersion: process.version,
  fixtures: [...new Set(fixtures)].sort(),
  missing,
  thresholds: THRESHOLDS,
  eclipses,
  eclipses2026To2028,
  positions,
  node,
  angles,
  deltaT,
  timing,
  chironRecent: chironRecent.length ? stats(chironRecent) : null,
  failures,
};
await mkdir(new URL('docs/accuracy/', root), { recursive: true });
await writeFile(
  new URL('docs/accuracy/accuracy.json', root),
  `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(new URL('docs/accuracy/index.html', root), render(report));
console.table([
  ...Object.entries(eclipses).map(([name, s]) => ({
    metric: `Eclipses ${name} (${s.count}/${s.canonCount})`,
    max: s.max.toFixed(4),
    median: s.median.toFixed(4),
    unit: 's',
  })),
  ...Object.entries(positions).map(([name, s]) => ({
    metric: `${name} longitude`,
    max: s.max.toFixed(4),
    median: s.median.toFixed(4),
    unit: 'arcsec',
  })),
  ...[...Object.entries(node), ...Object.entries(angles)].map(([name, s]) => ({
    metric: name,
    max: s.max.toFixed(6),
    median: s.median.toFixed(6),
    unit: 'arcsec',
  })),
  ...[...Object.entries(deltaT), ...Object.entries(timing)].map(([name, s]) => ({
    metric: name,
    max: s.max.toFixed(4),
    median: s.median.toFixed(4),
    unit: s.unit ?? 's',
  })),
]);
if (failures.length) console.error(failures.join('\n'));
if (process.argv.includes('--check') && failures.length) process.exitCode = 1;
