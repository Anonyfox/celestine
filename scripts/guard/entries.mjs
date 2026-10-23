export const realistic = `import {toJulianDate, time, eclipticToZodiac, ephemeris, transits, aspects, calculateChart} from 'celestine';
export {toJulianDate, eclipticToZodiac, calculateChart};
export const fromJulianDate = time.fromJulianDate;
export const positions = [${['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].map((n) => `ephemeris.get${n}Position`).join(',')}];
export const findStationPoints = transits.findStationPoints;
export const findAllAspects = aspects.findAllAspects;`;
export const entries = {
  full: `export * from 'celestine';`,
  toJulianDate: `export {toJulianDate} from 'celestine';`,
  eclipticToZodiac: `export {eclipticToZodiac} from 'celestine';`,
  getMercuryPosition: `import {ephemeris} from 'celestine'; export const getMercuryPosition = ephemeris.getMercuryPosition;`,
  calculateChart: `export {calculateChart} from 'celestine';`,
  getAllPositions: `import {ephemeris} from 'celestine'; export const getAllPositions = ephemeris.getAllPositions;`,
  realistic,
  // esbuild cannot shake member access on re-exported namespaces (rollup/Vite can), so the
  // subpath form is the minimal-bundle path for namespace-only functions.
  'subpath.getMercuryPosition': `export {getMercuryPosition} from 'celestine/ephemeris';`,
  'subpath.realistic': `import {toJulianDate, fromJulianDate} from 'celestine/time';
import {eclipticToZodiac} from 'celestine/zodiac';
import {findStationPoints} from 'celestine/transits';
import {findAllAspects} from 'celestine/aspects';
import {calculateChart} from 'celestine/chart';
export * from 'celestine/ephemeris';
export {toJulianDate, fromJulianDate, eclipticToZodiac, findStationPoints, findAllAspects, calculateChart};`,
};
export const bundleOptions = {
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'neutral',
  treeShaking: true,
  write: false,
  logOverride: { 'duplicate-case': 'silent' },
};
