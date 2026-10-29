// Reproduce local validation residuals after npm run build. No network access required.
import { readFile } from 'node:fs/promises';
import {
  findEclipses,
  getLunarEclipseLocal,
  getSolarEclipseLocal,
} from '../../dist/events/index.js';

const fixture = async (name) =>
  JSON.parse(
    await readFile(new URL(`../../src/events/__fixtures__/${name}.json`, import.meta.url), 'utf8'),
  );
const reference = await fixture('nasa-eclipses-2026-2028');
const found = findEclipses(2461041.5, 2462137.5);
const rows = reference.events.map((r, i) => {
  const e = found[i];
  if (!e || e.kind !== r.kind || e.type !== r.type) throw Error(`Mismatch: ${r.date}`);
  const local = e.kind === 'lunar' ? getLunarEclipseLocal(e, { latitude: 0, longitude: 0 }) : null;
  return {
    date: r.date,
    kind: e.kind,
    type: e.type,
    ttSeconds: (e.jd - r.jd) * 86400,
    utSeconds: (e.jdUT - r.jdUT) * 86400,
    gamma: e.gamma - r.gamma,
    magnitude:
      e.magnitude -
      (r.magnitude ?? (e.type === 'penumbral' ? r.penumbralMagnitude : r.umbralMagnitude)),
    umbralMagnitude: e.kind === 'lunar' ? e.umbralMagnitude - r.umbralMagnitude : null,
    penumbralMagnitude: e.kind === 'lunar' ? e.penumbralMagnitude - r.penumbralMagnitude : null,
    durations: local
      ? Object.fromEntries(Object.entries(local.durations).map(([k, v]) => [k, v - r.durations[k]]))
      : null,
  };
});
const solar = found.find((e) => e.kind === 'solar' && e.jd > 2461200);
const cities = await fixture('nasa-solar-local-2026');
const cityRows = cities.cities.map((c) => {
  const local = getSolarEclipseLocal(solar, c.observer);
  const residual = (key) => {
    if (!c[key] || (key === 'partialEnd' && c.endsAfterSunset)) return null;
    const ref =
      Date.parse(`${cities.date}T${c[key]}:00Z`) / 86400000 + 2440587.5 - c.utcOffset / 24;
    return (local[key].jdUT - ref) * 86400;
  };
  return {
    city: c.name,
    type: local.localType,
    coveragePercentagePoints: (local.maximum.obscuration - c.obscuration) * 100,
    partialBeginSeconds: residual('partialBegin'),
    centralBeginSeconds: residual('centralBegin'),
    maximumSeconds: residual('maximum'),
    centralEndSeconds: residual('centralEnd'),
    partialEndSeconds: residual('partialEnd'),
    c4Altitude: local.partialEnd?.sunAltitude ?? null,
  };
});
console.log(JSON.stringify({ global: rows, localSolar: cityRows }, null, 2));
