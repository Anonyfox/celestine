/**
 * Tests for ChartOptions.aspectTypes: requested minor aspects (and Yods) appear.
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { ALL_ASPECTS } from '../aspects/constants.js';
import { AspectType, PatternType } from '../aspects/types.js';
import { calculateChart } from './chart.js';
import type { BirthData, ChartOptions } from './types.js';

// 2000-11-01 12:00 UT, London: Jupiter is the apex of a Sun/Moon Yod.
const BIRTH: BirthData = {
  year: 2000,
  month: 11,
  day: 1,
  hour: 12,
  minute: 0,
  timezone: 0,
  latitude: 51.5,
  longitude: -0.12,
};
const PLANETS_ONLY: ChartOptions = {
  includeAsteroids: false,
  includeChiron: false,
  includeLilith: false,
  includeNodes: false,
  includeLots: false,
};
const YOD_TYPES = [AspectType.Sextile, AspectType.Quincunx];
const pair = (a: { body1: string; body2: string }) => [a.body1, a.body2].sort().join('-');
const quincunxPairs = (opts: ChartOptions) =>
  calculateChart(BIRTH, { ...PLANETS_ONLY, ...opts })
    .aspects.all.filter((a) => a.type === AspectType.Quincunx)
    .map(pair)
    .sort();

describe('chart aspectTypes', () => {
  it('computes requested quincunxes and finds the Yod', () => {
    const chart = calculateChart(BIRTH, { ...PLANETS_ONLY, aspectTypes: YOD_TYPES });
    const types = new Set(chart.aspects.all.map((a) => a.type));
    assert.deepEqual([...types].sort(), [...YOD_TYPES].sort());
    const qs = chart.aspects.all.filter((a) => a.type === AspectType.Quincunx).map(pair);
    assert.ok(qs.includes('Jupiter-Sun') && qs.includes('Jupiter-Moon'), qs.join());
    assert.equal(chart.aspects.byType[AspectType.Quincunx].length, qs.length);
    const yods = chart.patterns.filter((p) => p.type === PatternType.Yod);
    assert.equal(yods.length, 1);
    assert.deepEqual([...yods[0].bodies].sort(), ['Jupiter', 'Moon', 'Sun']);
    assert.match(yods[0].description, /Jupiter/);
  });

  it('a quincunx-only request returns only quincunxes', () => {
    const chart = calculateChart(BIRTH, { ...PLANETS_ONLY, aspectTypes: [AspectType.Quincunx] });
    assert.ok(chart.aspects.all.length >= 2);
    assert.ok(chart.aspects.all.every((a) => a.type === AspectType.Quincunx));
    assert.equal(chart.patterns.filter((p) => p.type === PatternType.Yod).length, 0);
  });

  it('the default (and an empty array) detect major aspects only, with no Yod', () => {
    const def = calculateChart(BIRTH, PLANETS_ONLY);
    const empty = calculateChart(BIRTH, { ...PLANETS_ONLY, aspectTypes: [] });
    assert.deepEqual(empty.aspects, def.aspects);
    assert.deepEqual(empty.patterns, def.patterns);
    const major = new Set([
      AspectType.Conjunction,
      AspectType.Opposition,
      AspectType.Trine,
      AspectType.Square,
      AspectType.Sextile,
    ]);
    assert.ok(def.aspects.all.every((a) => major.has(a.type)));
    assert.equal(def.patterns.filter((p) => p.type === PatternType.Yod).length, 0);
  });

  it('uses DEFAULT_ORBS for minor aspects (quincunx 3°, quintiles 2°)', () => {
    const chart = calculateChart(BIRTH, { ...PLANETS_ONLY, aspectTypes: ALL_ASPECTS });
    const minor = chart.aspects.all.filter((a) => a.type === AspectType.Quincunx);
    assert.ok(minor.length >= 2);
    assert.ok(minor.every((a) => a.orb === 3 && a.deviation <= 3));
    const quintiles = chart.aspects.all.filter(
      (a) => a.type === AspectType.Quintile || a.type === AspectType.Biquintile,
    );
    assert.ok(quintiles.length >= 2);
    assert.ok(quintiles.every((a) => a.orb === 2 && a.deviation <= 2));
  });

  it('respects aspectOrbs overrides for minor aspects', () => {
    const wide = quincunxPairs({ aspectTypes: YOD_TYPES });
    const tight = quincunxPairs({
      aspectTypes: YOD_TYPES,
      aspectOrbs: { [AspectType.Quincunx]: 0.2 },
    });
    assert.ok(tight.length < wide.length);
    const chart = calculateChart(BIRTH, {
      ...PLANETS_ONLY,
      aspectTypes: YOD_TYPES,
      aspectOrbs: { [AspectType.Quincunx]: 0.2 },
    });
    assert.ok(chart.aspects.all.every((a) => a.type !== AspectType.Quincunx || a.deviation <= 0.2));
    assert.equal(chart.patterns.filter((p) => p.type === PatternType.Yod).length, 0);
  });
});
