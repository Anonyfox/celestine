import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getSignName } from '../zodiac/sign-properties.js';
import {
  findEclipses,
  findNextEclipse,
  findPreviousEclipse,
  getLunarEclipseLocal,
  getSolarEclipseLocal,
} from './index.js';
import type { EclipseKind, EclipseObserver, SolarEclipseEvent } from './types.js';

interface Reference {
  kind: EclipseKind;
  date: string;
  jd: number;
  jdUT: number;
  type: string;
  gamma: number;
  magnitude?: number;
  penumbralMagnitude: number;
  umbralMagnitude: number;
  durations: { penumbral: number; partial: number; total: number };
}
const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`__fixtures__/${name}.json`, import.meta.url), 'utf8'));
const refs: Reference[] = fixture('nasa-eclipses-2026-2028').events;
const events = findEclipses(2461041.5, 2462137.5);
const observer = { latitude: 0, longitude: 0 };
const roundTrip = (value: unknown) => assert.deepEqual(JSON.parse(JSON.stringify(value)), value);

test('all fourteen NASA 2026–2028 eclipses: independent TT, predicted UT, magnitudes and gamma', () => {
  assert.equal(events.length, 14);
  assert.equal(refs.length, events.length);
  for (const [i, r] of refs.entries()) {
    const e = events[i];
    assert.equal(e.kind, r.kind, r.date);
    assert.equal(e.type, r.type, r.date);
    assert.ok(Math.abs(e.jd - r.jd) * 86400 < 11, r.date);
    // NASA forecast ΔT differs from Celestine's model; do not fold this into TT error.
    assert.ok(Math.abs(e.jdUT - r.jdUT) * 86400 < 17, r.date);
    assert.ok(Math.abs(e.gamma - r.gamma) < 0.0003, r.date);
    if (e.kind === 'solar')
      assert.ok(Math.abs(e.magnitude - (r.magnitude ?? 0)) < 0.000025, r.date);
    else {
      assert.ok(Math.abs(e.umbralMagnitude - r.umbralMagnitude) < 0.0006, r.date);
      assert.ok(Math.abs(e.penumbralMagnitude - r.penumbralMagnitude) < 0.00065, r.date);
      const local = getLunarEclipseLocal(e, observer);
      for (const phase of ['penumbral', 'partial', 'total'] as const)
        assert.ok(
          Math.abs(local.durations[phase] - r.durations[phase]) <
            (r.date === '2027-07-18' ? 0.5 : 0.11),
          `${r.date} ${phase}`,
        );
      roundTrip(local);
    }
    assert.equal(e.sunSign, Math.floor(e.sunLongitude / 30));
    assert.equal(e.moonSign, Math.floor(e.moonLongitude / 30));
    assert.equal(e.sunSignName, getSignName(e.sunSign));
    assert.equal(e.moonSignName, getSignName(e.moonSign));
    roundTrip(e);
  }
});

test('next/previous walk, filters, bit-identical instants and strict boundaries', () => {
  let next = findNextEclipse(2461041.5);
  for (const e of events) {
    assert.deepEqual(next, e);
    assert.ok(findNextEclipse(e.jd - 1e-6).jd === e.jd);
    assert.ok(findPreviousEclipse(e.jd + 1e-6).jd === e.jd);
    next = findNextEclipse(e.jd);
    assert.ok(next.jd > e.jd);
  }
  let prev = findPreviousEclipse(2462137.5);
  for (const e of [...events].reverse()) {
    assert.deepEqual(prev, e);
    prev = findPreviousEclipse(e.jd);
    assert.ok(prev.jd < e.jd);
  }
  for (const kind of ['solar', 'lunar'] as const) {
    let jd = 2461041.5;
    for (const e of events.filter((e) => e.kind === kind)) {
      const n = findNextEclipse(jd, { kinds: [kind], includeNutation: true });
      assert.equal(n.jd, e.jd);
      jd = n.jd;
    }
    assert.equal(findPreviousEclipse(2462137.5, { kinds: [kind] }).kind, kind);
  }
  for (const f of [findNextEclipse, findPreviousEclipse]) {
    for (const jd of [NaN, Infinity, -Infinity]) assert.throws(() => f(jd), RangeError);
    assert.throws(() => f(2461041.5, { kinds: ['bad' as EclipseKind] }), RangeError);
    assert.throws(() => f(2461041.5, { kinds: [] }), RangeError);
  }
});

const solar = events.find((e) => e.kind === 'solar' && e.jd > 2461200) as SolarEclipseEvent;
interface City {
  name: string;
  observer: EclipseObserver;
  localType: string;
  utcOffset: number;
  partialBegin: string;
  centralBegin: string | null;
  centralEnd: string | null;
  partialEnd: string;
  maximum: string | null;
  obscuration: number;
  endsAfterSunset: boolean;
}
const cities: City[] = fixture('nasa-solar-local-2026').cities;
const referenceUT = (clock: string, offset: number) =>
  Date.parse(`2026-08-12T${clock}:00Z`) / 86400000 + 2440587.5 - offset / 24;
test('NASA 2026 Aug 12 local city table: contacts, coverage, sunset and absent eclipse', () => {
  for (const c of cities) {
    const l = getSolarEclipseLocal(solar, c.observer);
    assert.equal(l.localType, c.localType, c.name);
    assert.equal(l.visible, true, c.name);
    assert.ok(Math.abs(l.maximum.obscuration - c.obscuration) < 0.01, c.name);
    for (const k of [
      'partialBegin',
      'centralBegin',
      'centralEnd',
      'partialEnd',
      'maximum',
    ] as const) {
      if (k === 'partialEnd' && c.endsAfterSunset) {
        assert.ok((l.partialEnd?.sunAltitude ?? 1) < 0, c.name);
        continue;
      }
      const clock = c[k];
      if (clock)
        assert.ok(
          Math.abs((l[k]?.jdUT ?? 0) - referenceUT(clock, c.utcOffset)) * 86400 < 90,
          `${c.name} ${k}`,
        );
      else if (k !== 'maximum') assert.equal(l[k], null);
    }
    if (l.duration !== null) {
      assert.ok(l.duration > 0);
      assert.equal(l.duration, ((l.centralEnd?.jd ?? 0) - (l.centralBegin?.jd ?? 0)) * 86400);
    }
    roundTrip(l);
    assert.deepEqual(getSolarEclipseLocal(solar.jd, c.observer), l);
  }
  const none = getSolarEclipseLocal(solar, { latitude: -33.8688, longitude: 151.2093 });
  assert.equal(none.localType, 'none');
  assert.equal(none.visible, false);
  for (const k of ['partialBegin', 'partialEnd', 'centralBegin', 'centralEnd', 'duration'] as const)
    assert.equal(none[k], null);
  roundTrip(none);
});

test('lunar geometry: 2026 March 3 Moon is up in Honolulu, down in Berlin at maximum', () => {
  // NASA catalog sublunar point is 6N,171W at maximum. Honolulu (21N,158W) is
  // ~20° away; Berlin (52N,13E) is >120° away. Both are far from the horizon,
  // independent of small topocentric/parallax differences. Source: LE2001-2100 catalog.
  const e = events[1];
  const honolulu = getLunarEclipseLocal(e.jd, { latitude: 21.3069, longitude: -157.8583 });
  const berlin = getLunarEclipseLocal(e.jd, { latitude: 52.52, longitude: 13.405 });
  assert.ok(honolulu.moonAltitude > 65);
  assert.ok(berlin.moonAltitude < -25);
  assert.equal(honolulu.visibleAtMaximum, true);
  assert.equal(honolulu.visibleDuringUmbral, true);
  assert.equal(honolulu.visibleDuringEclipse, true);
  assert.equal(berlin.visibleAtMaximum, false);
  assert.equal(berlin.visibleDuringUmbral, false);
  assert.equal(berlin.visibleDuringEclipse, false);
  assert.equal(honolulu.P1?.jd, berlin.P1?.jd);
  const ordered = [
    honolulu.P1,
    honolulu.U1,
    honolulu.U2,
    honolulu.maximum,
    honolulu.U3,
    honolulu.U4,
    honolulu.P4,
  ];
  for (let i = 1; i < ordered.length; i++)
    assert.ok((ordered[i]?.jd ?? 0) > (ordered[i - 1]?.jd ?? 0));
  const penumbral = getLunarEclipseLocal(events[5].jd, observer);
  assert.equal(penumbral.visibleDuringUmbral, false);
  assert.equal(penumbral.U1, null);
  assert.equal(penumbral.U2, null);
  roundTrip(honolulu);
});

test('local validation rejects non-finite inputs, invalid observers and wrong families', () => {
  for (const f of [getSolarEclipseLocal, getLunarEclipseLocal]) {
    for (const jd of [NaN, Infinity, -Infinity]) assert.throws(() => f(jd, observer), RangeError);
    for (const o of [
      { latitude: 91, longitude: 0 },
      { latitude: 0, longitude: 181 },
      { latitude: 0, longitude: NaN },
      { latitude: 0, longitude: 0, elevation: Infinity },
    ])
      assert.throws(() => f(solar.jd, o), RangeError);
    assert.throws(() => f(2461041.5, observer), RangeError);
  }
  assert.throws(() => getSolarEclipseLocal(events[1] as SolarEclipseEvent, observer), RangeError);
});

test('annular phase, elevation and invisible below-horizon solar geometry', () => {
  const annular = getSolarEclipseLocal(events[4] as SolarEclipseEvent, {
    latitude: -31,
    longitude: -48,
  });
  assert.equal(annular.localType, 'annular');
  assert.ok(annular.duration !== null && annular.duration > 400);
  assert.ok(annular.maximum.obscuration > 0.8 && annular.maximum.obscuration < 1);
  roundTrip(annular);
  const invisible = getSolarEclipseLocal(solar, { latitude: 60, longitude: 155 });
  assert.equal(invisible.localType, 'partial');
  assert.equal(invisible.visible, false);
  assert.ok(invisible.maximum.sunAltitude < 0);
  const raised = getSolarEclipseLocal(solar, { ...cities[1].observer, elevation: 2000 });
  const ground = getSolarEclipseLocal(solar, cities[1].observer);
  assert.notEqual(raised.partialBegin?.jd, ground.partialBegin?.jd);
  assert.ok(raised.maximum.sunAzimuth >= 0 && raised.maximum.sunAzimuth < 360);
  roundTrip(raised);
});

test('lunar moonrise after umbral phase still counts as penumbral visibility', () => {
  const local = getLunarEclipseLocal(events[1].jd, { latitude: 0, longitude: 60 });
  assert.equal(local.visibleAtMaximum, false);
  assert.equal(local.visibleDuringUmbral, false);
  assert.equal(local.visibleDuringEclipse, true);
  assert.ok((local.P1?.altitude ?? 1) < 0);
  assert.ok((local.P4?.altitude ?? -1) > 0);
  assert.ok((local.U4?.altitude ?? 1) < 0);
});
