import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { deltaT, deltaTAt, toTT, toUT, ttToUT, utToTT } from '../time/delta-t.js';
import { toJulianDate } from '../time/julian-date.js';
import { localDayToUT } from './index.js';

// IANA tzdata2026c (see fixture README and scripts/time/fetch-local-days.py).
// Europe EU: 01:00 UTC, Berlin +01 → +02 (Mar), +02 → +01 (Oct).
// US: 02:00 local, New York −05 → −04 (Mar), −04 → −05 (Nov).
// LH: 02:00 local, Lord Howe +11 → +10:30 (Apr), +10:30 → +11 (Oct).
// Brazil: 2018 Nov 4 00:00, Sao Paulo −03 → −02 (midnight skipped).
// Chile: 2022 Sep 11 00:00, Santiago −04 → −03 (midnight skipped).
// Cuba: Mar 00:00 −05 → −04; Nov 01:00 −04 → −05 (midnight repeated).
// Lebanon: Mar 00:00, Beirut +02 → +03 (midnight skipped).
// Apia: 2011 Dec 30 00:00, −10 → +14 (entire date skipped).
// Kathmandu: 1986 Jan 1 00:00, +05:30 → +05:45; now fixed +05:45.
// Liberia: 1972 Jan 7 00:00, Monrovia −00:44:30 → +00 (44m30s skipped).
// Kolkata +05:30, Eucla +08:45, Kiritimati +14, UTC +00: fixed in 2026.
const fixtures: {
  zone: string;
  date: string;
  start?: number[];
  end?: number[];
  startOffset?: number;
  endOffset?: number;
  hours?: number;
}[] = JSON.parse(
  readFileSync(new URL('./__fixtures__/local-day/iana.json', import.meta.url), 'utf8'),
);
const jd = (fields: number[]) =>
  Date.UTC(fields[0], fields[1] - 1, ...(fields.slice(2) as [number, number, number, number])) /
    86400000 +
  2440587.5;

describe('localDayToUT', () => {
  for (const fixture of fixtures) {
    it(`${fixture.zone} ${fixture.date}`, () => {
      const [year, month, day] = fixture.date.split('-').map(Number);
      const run = () => localDayToUT({ year, month, day }, fixture.zone);
      if (!fixture.start || !fixture.end) {
        assert.throws(run, /Skipped local date/);
        return;
      }
      const result = run();
      assert.equal(result.startJD, jd(fixture.start));
      assert.equal(result.endJD, jd(fixture.end));
      assert.equal(result.startOffset, fixture.startOffset);
      assert.equal(result.endOffset, fixture.endOffset);
      assert.ok(Math.abs(result.hours - fixture.hours!) < 2e-8);
      // Independent UTC civil conversion agrees with the existing Julian helper.
      for (const fields of [fixture.start, fixture.end]) {
        const [year, month, day, hour, minute, second] = fields;
        assert.equal(toJulianDate({ year, month, day, hour, minute, second }), jd(fields));
      }
      assert.deepEqual(run(), result); // cached formatter
    });
  }
  it('rejects invalid dates and zones', () => {
    for (const date of [
      { year: 2026, month: 2, day: 29 },
      { year: 2026, month: 0, day: 1 },
      { year: 2026, month: 1, day: 0 },
      { year: NaN, month: 1, day: 1 },
      { year: 2026, month: 1.5, day: 1 },
      { year: Infinity, month: 1, day: 1 },
    ])
      assert.throws(() => localDayToUT(date, 'UTC'), RangeError);
    assert.throws(() => localDayToUT({ year: 2026, month: 1, day: 1 }, 'Invalid/Zone'), RangeError);
  });
  it('supports astronomical years including 0–99', () => {
    for (const year of [-1, 0, 1, 99, 100]) {
      const date = new Date(0);
      date.setUTCFullYear(year, 0, 1);
      assert.equal(
        localDayToUT({ year, month: 1, day: 1 }, 'UTC').startJD,
        date.getTime() / 86400000 + 2440587.5,
      );
    }
  });
});

it('measures JD-only versus legacy month-centre corrections throughout 2026', () => {
  let max = 0;
  for (let month = 1; month <= 12; month++) {
    const start = Date.UTC(2026, month - 1, 1);
    const end = Date.UTC(2026, month, 1);
    for (let ms = start; ms < end; ms += 3600000) {
      const ut = ms / 86400000 + 2440587.5;
      max = Math.max(max, Math.abs(deltaT(2026, month) - deltaTAt(ut)));
      assert.ok(Math.abs((utToTT(ut, 2026, month) - toTT(ut)) * 86400) < 0.01);
      assert.ok(Math.abs((ttToUT(toTT(ut), 2026, month) - toUT(toTT(ut))) * 86400) < 0.01);
    }
  }
  assert.ok(max > 0.008 && max < 0.01);
  console.log(`2026 month-centre vs JD ΔT max: ${max.toFixed(9)} s (hourly samples)`);
});
