/** Gregorian local date with astronomical year numbering; no time scale or frame applies.
 * @example const date: LocalDayDate = { year: 2026, month: 3, day: 29 };
 */
export interface LocalDayDate {
  /** Integer astronomical year. */
  year: number;
  /** Month, 1–12. */
  month: number;
  /** Day of the month, starting at 1. */
  day: number;
}

/** Half-open UT day bounds; no coordinate frame applies.
 * @example const day: LocalDayUT = localDayToUT({ year: 2026, month: 3, day: 29 }, 'Europe/Berlin');
 */
export interface LocalDayUT {
  /** Inclusive UT Julian Date. */
  startJD: number;
  /** Exclusive UT Julian Date. */
  endJD: number;
  /** Elapsed hours. */
  hours: number;
  /** Offset at startJD, in minutes east of UTC. */
  startOffset: number;
  /** Offset at endJD, in minutes east of UTC. */
  endOffset: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
const daySeconds = 86400;

/**
 * UT bounds of an IANA-zone Gregorian calendar day, using host Intl timezone data.
 * The interval is half-open; skipped midnights start at the first existing instant.
 * Entirely skipped dates and invalid dates/zones throw RangeError. No coordinate frame applies.
 * @param date - Integer Gregorian year, month (1–12), and day; astronomical year numbering
 * @param timeZone - IANA zone name, or UTC
 * @returns UT startJD/endJD, elapsed hours, and boundary offsets in minutes east of UTC
 * @example localDayToUT({ year: 2026, month: 3, day: 29 }, 'Europe/Berlin') // 23 hours
 */
export function localDayToUT(date: LocalDayDate, timeZone: string): LocalDayUT {
  const { year, month, day } = date;
  const stamp = new Date(0);
  stamp.setUTCFullYear(year, month - 1, day);
  if (
    ![year, month, day].every(Number.isInteger) ||
    stamp.getUTCFullYear() !== year ||
    stamp.getUTCMonth() !== month - 1 ||
    stamp.getUTCDate() !== day
  )
    throw new RangeError('Invalid date');
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
      timeZone,
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, formatter);
  }
  const offset = (second: number) => {
    const parts = Object.fromEntries(
      formatter.formatToParts(second * 1000).map((p) => [p.type, p.value]),
    );
    const local = new Date(0);
    local.setUTCFullYear(
      parts.era === 'BC' ? 1 - +parts.year : +parts.year,
      +parts.month - 1,
      +parts.day,
    );
    local.setUTCHours(+parts.hour, +parts.minute, +parts.second);
    return local.getTime() / 1000 - second;
  };
  const midnight = stamp.getTime() / 1000;
  // Walk constant-offset segments, bisecting transitions to an integer second.
  // IANA transitions are separated by more than an hour; no local transition time is assumed.
  const boundary = (target: number) => {
    let left = target - 2 * daySeconds;
    let previous = offset(left);
    while (left < target + 2 * daySeconds) {
      let right = left + 3600;
      const next = offset(right);
      if (next !== previous) {
        let lo = left;
        let hi = right;
        while (hi - lo > 1) {
          const mid = Math.floor((lo + hi) / 2);
          if (offset(mid) === previous) lo = mid;
          else hi = mid;
        }
        right = hi;
      }
      const candidate = Math.max(left, target - previous);
      if (candidate < right) return candidate;
      left = right;
      previous = offset(left);
    }
    throw new RangeError('Invalid date');
  };
  const start = boundary(midnight);
  if (start + offset(start) >= midnight + daySeconds) throw new RangeError('Skipped local date');
  const end = boundary(midnight + daySeconds);
  const startJD = start / daySeconds + 2440587.5;
  const endJD = end / daySeconds + 2440587.5;
  return {
    startJD,
    endJD,
    hours: (endJD - startJD) * 24,
    startOffset: offset(start) / 60,
    endOffset: offset(end) / 60,
  };
}
