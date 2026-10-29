# Module guide

Use the [README](../README.md) for measured precision, bundle sizes, and time-scale
caveats. The examples below are independent programs. They intentionally avoid
fixed numeric outputs; run them for the inputs you need.

## Time and ephemeris

Civil dates produce UT Julian Dates. Convert to TT before calling position
getters. Longitudes and latitudes are degrees; longitude speed is degrees/day.
Negative longitude speed indicates retrograde motion.

`toJulianDate` returns UT. Ephemeris position getters and event searches take TT;
point events carry TT `jd` and UT `jdUT` computed with `toUT`. `calculateChart`
takes civil birth time and applies ΔT itself by default (its `deltaT` option can
override this). Sidereal time uses UT; house angles use the resulting local
sidereal time, location and obliquity.

`toTT(jdUT)` evaluates ΔT at that UT JD. `toUT(jdTT)` iterates the inverse,
evaluating ΔT at the recovered UT JD. The legacy forms
`utToTT(jdUT, year, month)` and `ttToUT(jdTT, year, month)` instead use one
ΔT value for the middle of the supplied month: decimal year
`year + (month - 0.5) / 12`. This is an equal-month model coordinate, not an
exact civil timestamp. If the month contains the instant, the difference is
the ΔT change over roughly half a month. Hourly samples throughout 2026 give
a maximum correction difference of 0.009292 seconds (about 9 milliseconds);
see `src/events/local-day.test.ts`. This is a convention difference, separate
from the physical uncertainty of ΔT. Converting time scales does not change frames.

```ts
import { toJulianDate, toTT, fromJulianDate } from 'celestine/time';
import { getSunPosition, getMercuryPosition, getAllPositions } from 'celestine/ephemeris';

const jdUT = toJulianDate({
  year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0,
});
const jdTT = toTT(jdUT);
console.log(fromJulianDate(jdUT));
console.log(getSunPosition(jdTT));
console.log(getMercuryPosition(jdTT, { includeSpeed: false }));
console.log(getAllPositions(jdTT));
```

Default coordinates use mean ecliptic/equinox of date. Position getters accept
`includeNutation: true` for true equinox of date. Disabling speed avoids the speed
calculation; its returned speed is zero and `isRetrograde` is false.

### Pitfalls

**UT versus TT.** `toJulianDate` returns UT. Position getters and every event search
take TT, so wrap search bounds in `toTT(toJulianDate(...))`. In 2026 the two differ by
about 69 seconds. Passing UT where TT is expected shifts a search window by that much
and evaluates positions 69 seconds early, which moves the Moon by about 0.6′. Results
carry both: `jd` is TT and `jdUT` is UT for display. `calculateChart` takes civil time
and converts it itself.

**Mean versus true equinox.** The default frame is the mean equinox of date, the same
frame as `calculateChart`. Swiss Ephemeris, astro.com and almanacs use the true
equinox, which differs by nutation in longitude (at most about 17″). An event time
shifts by that angle divided by the body's speed. For the Sun's 2026 cardinal ingresses,
`findSignIngresses` in the default frame lands 2.5–3.8 minutes from `findSeasons`
(true equinox); with `{ includeNutation: true }` they agree. For slow planets near a
station the shift can reach hours. Pick one frame for a project and pass natal
longitudes from the same frame.

**Void-of-course Moon.** `findVoidOfCourseMoon` uses the traditional partners (Sun,
Mercury, Venus, Mars, Jupiter, Saturn) by default. Many apps use the modern set; pass
it explicitly, because the void can start hours apart:

```ts
import { findVoidOfCourseMoon } from 'celestine/events';
import { CelestialBody, toJulianDate, toTT } from 'celestine';

const start = toTT(toJulianDate({
  year: 2026, month: 1, day: 1, hour: 0, minute: 0, second: 0,
}));
const modern = findVoidOfCourseMoon(start, start + 30, {
  bodies: [
    CelestialBody.Sun, CelestialBody.Mercury, CelestialBody.Venus, CelestialBody.Mars,
    CelestialBody.Jupiter, CelestialBody.Saturn, CelestialBody.Uranus,
    CelestialBody.Neptune, CelestialBody.Pluto,
  ],
});
```

**True node ingresses.** The true node oscillates around the mean node, so near a cusp
it can cross back and forth. Over 2000–2030 `findSignIngresses` finds 26 true-node
ingresses against 20 for the mean node; six of them come back within 60 days of the
previous crossing (at most 17 days apart). The library reports every real crossing
and does not smooth them. Use `CelestialBody.NorthNode` (mean node) when you want one
ingress per sign, or group crossings that are close together yourself.

**Lunar phase names.** `findLunarPhases` accepts `'new'`, `'first'`, `'full'` and
`'last'` as input, but results always use `'new-moon'`, `'first-quarter'`,
`'full-moon'` and `'last-quarter'`.

## Local calendar days

`localDayToUT` from `celestine/events` returns the half-open UT interval `[startJD, endJD)` of an IANA local date.
`hours` is the elapsed duration; `startOffset` and `endOffset` are minutes east
of UTC at those exact instants. The end offset includes a transition at the
boundary. A skipped midnight begins at the first existing instant; an entirely
skipped date, invalid Gregorian date or invalid zone throws `RangeError`.
The calendar is proleptic Gregorian with astronomical year numbering.
Results use the host's `Intl.DateTimeFormat` timezone data, cached per zone;
keep that data current. No timezone database is bundled. The helper lives in
`celestine/events` rather than `celestine/time` so the root bundle does not grow.

```ts
import { localDayToUT } from 'celestine/events';
import { toTT } from 'celestine/time';

const day = localDayToUT({ year: 2026, month: 3, day: 29 }, 'Europe/Berlin');
console.log(day.hours); // approximately 23 (JD subtraction rounds)
const eventStartTT = toTT(day.startJD);
const eventEndTT = toTT(day.endJD);
```

## Precise small bodies

Import these getters explicitly to opt into the separate Chebyshev models.
Their supported date span and sampled accuracy checks are described in the
[README](../README.md#precise-small-bodies) and
[tests](../src/precise/precise.test.ts). Default small-body models have much larger
errors; do not apply planetary precision figures to them. Root Chiron's measured
maximum longitude error is 19,805.700″ (5.50°) on the 1950–2050 fixture; root
asteroids likewise have degree-level errors. Use `celestine/precise` for arcsecond
work. Chiron searches in `celestine/events` use the shared precise model within
1800–2200, with a 0.001-day margin at each end for speed evaluation, and root
Chiron outside. Events Chiron has a measured 0.60″ maximum on 189 independent
Horizons observer samples in 1900–2100. The root getter remains unchanged.

```ts
import { getChironPosition, getPallasPosition, PRECISE_RANGE } from 'celestine/precise';
import { toJulianDate, toTT } from 'celestine/time';

const jd = toTT(toJulianDate({
  year: 2026, month: 10, day: 24, hour: 12, minute: 0, second: 0,
}));
console.log(PRECISE_RANGE);
console.log(getChironPosition(jd));
console.log(getPallasPosition(jd));
```

## Birth charts

Timezone is a numeric offset from UTC in hours; longitude is east-positive.
Birth time is civil time. Charts apply ΔT to body ephemerides while houses and
angles use UT. Supply `deltaT` in seconds, or a function of UT JD, to override the
built-in model. Setting it to zero opts out of the conversion.

```ts
import { calculateChart, getAvailableHouseSystems } from 'celestine/chart';

const birth = {
  year: 1990, month: 6, day: 15, hour: 14, minute: 30, second: 0,
  timezone: -5, latitude: 40.7128, longitude: -74.006,
};
const chart = calculateChart(birth, { houseSystem: 'placidus' });
console.log(getAvailableHouseSystems(birth.latitude));
console.log(chart.angles.ascendant.formatted);
for (const planet of chart.planets) {
  console.log(planet.name, planet.formatted, planet.isRetrograde);
}
```

## Houses

For a complete chart, prefer `calculateChart`. For direct house calculations,
supply location, local sidereal time, and obliquity in degrees. These are distinct
inputs; a Julian Date cannot substitute for sidereal time.

```ts
import { calculateHouses } from 'celestine/houses';
import { greenwichMeanSiderealTime, localSiderealTime, toJulianDate } from 'celestine/time';
import { obliquityOfEcliptic } from 'celestine/houses';

const jdUT = toJulianDate({
  year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0,
});
const location = { latitude: 51.5074, longitude: -0.1278 };
const lst = localSiderealTime(greenwichMeanSiderealTime(jdUT), location.longitude);
console.log(calculateHouses(location, lst, obliquityOfEcliptic(jdUT), 'placidus'));
```

## Zodiac and aspects

Zodiac formatting consumes an ecliptic longitude. Aspect detection can operate
on your own named bodies; optional longitude speeds support applying/separating
classification. Orb choices are astrological conventions, not precision bounds.

```ts
import { eclipticToZodiac } from 'celestine/zodiac';
import { AspectType, findAllAspects, detectGrandTrine } from 'celestine/aspects';

console.log(eclipticToZodiac(45));
const bodies = [
  { name: 'A', longitude: 0 },
  { name: 'B', longitude: 120 },
  { name: 'C', longitude: 240 },
];
const aspects = findAllAspects(bodies, { aspectTypes: [AspectType.Trine] });
console.log(aspects);
console.log(detectGrandTrine(aspects));
```

## Transits and stations

Transit functions compare moving bodies with named natal points. Station searches
locate changes in longitude speed. Use TT for the underlying ephemeris searches.

```ts
import { calculateTransits, findStationPoints } from 'celestine/transits';
import { CelestialBody } from 'celestine/ephemeris';
import { toJulianDate, toTT } from 'celestine/time';

const start = toTT(toJulianDate({
  year: 2026, month: 1, day: 1, hour: 0, minute: 0, second: 0,
}));
console.log(calculateTransits([{ name: 'Natal Sun', longitude: 280, type: 'planet' }], start));
console.log(findStationPoints(CelestialBody.Mercury, start, start + 180));
```

`getRetrogradeShadow(period, options?)` in `celestine/transits` solves the last crossing
of the station-direct longitude before retrograde and the first crossing of the
station-retrograde longitude after direct motion resumes. Pass the same frame options
used by `findRetrogradePeriods`: mean equinox of date by default, or
`{ includeNutation: true }` for the true equinox (`nutation` is a deprecated alias).
All input and returned JDs are TT. The zone runs forward from `shadowZoneStart`
(station direct) to `shadowZoneEnd` (station retrograde); start greater than end means
it crosses 0° Aries. A missing crossing within 800 days throws `RangeError`.

`findStations(body, startJD, endJD, options?)` in `celestine/events` covers Mercury
through Pluto and Chiron. Chiron stations come from the `celestine/precise` model
within 1800–2200 and match JPL Horizons within 8 minutes (0.4″) over 2020–2035.
`findStationPoints` and the retrograde-period functions in `celestine/transits` still
use root Chiron, which can be off by days.

Stations have two spellings. `findStations` (`celestine/events`) uses
`type: 'retrograde' | 'direct'`, the vocabulary of the events API; `findStationPoints`
(`celestine/transits`) reports the same instants as `'station-retrograde' |
'station-direct'`. Both carry TT `jd` and UT `jdUT`; retrograde periods carry
`stationRetroJDUT` and `stationDirectJDUT` next to their TT values. Prefer
`findStations` in new code.

`getAllRetrogradePeriods(bodies, startJD, endJD)` returns a `Map` from body name to
periods. `JSON.stringify` on it gives a plain object keyed by body name; use
`Object.fromEntries(map)` when you need that object in code.

For separate orb passes over a long window, use `searchTransitPasses` from
`celestine/events`. It takes the same parameters as `searchTransits` and returns one
timing per continuous interval within orb, so a retrograde triple appears as one
entry only while the planet stays in orb between hits. Boundaries are clipped to the
search window. JDs and the transit calendar fields are TT; longitudes use the mean
ecliptic/equinox of date. `searchTransits` itself is unchanged. For a single aspect,
`findTransitPasses(body, natalLongitude, aspectAngle, orb, startJD, endJD)` returns
the pass timings directly.

```ts
import { searchTransitPasses } from 'celestine/events';

const passes = searchTransitPasses({
  startJD: start, endJD: start + 730,
  natalPoints: [{ name: 'Natal Sun', longitude: 345, type: 'luminary' }],
  config: { transitingBodies: [CelestialBody.Saturn] },
});
console.log(passes.transits);
```

A second argument takes the frame and per-body orbs. Natal longitudes from
`calculateChart` are mean-equinox values and need no option. Pass
`{ includeNutation: true }` when natal points come from a true-equinox source such as
Swiss Ephemeris or astro.com; exact hits then match `getPosition(body, jd,
{ includeNutation: true })`. `bodyOrbs` sets the orb for a transiting body, either one
number for every aspect or a map per aspect type. An override replaces the computed
orb, including the luminary, angle and outer-planet extensions; aspects without one keep
the computed orb. `findTransitPasses` takes the same frame option as its last argument.

`chartToNatalPoints(chart)` builds the natal points from a `calculateChart` result: all
chart bodies (Sun and Moon as luminaries, Chiron and the asteroids as asteroids), the
lunar nodes, and the Ascendant and Midheaven as `'ASC'` and `'MC'`, with house and sign.

```ts
import { calculateChart } from 'celestine';
import { chartToNatalPoints, searchTransitPasses } from 'celestine/events';

const chart = calculateChart({
  year: 1990, month: 4, day: 26, hour: 11, minute: 50,
  timezone: 2, latitude: 52.52, longitude: 13.405,
});
const scan = searchTransitPasses(
  { startJD: start, endJD: start + 365, natalPoints: chartToNatalPoints(chart) },
  { bodyOrbs: { [CelestialBody.Mars]: 1, [CelestialBody.Saturn]: 1.5 } },
);
```

## Progressions

Progressions implement astrological time mappings. Their interpretation is
separate from astronomical position precision.

```ts
import { calculateProgression, formatProgressedChart } from 'celestine/progressions';

const birth = {
  year: 1990, month: 6, day: 15, hour: 14, minute: 30, second: 0,
  timezone: -5, latitude: 40.7128, longitude: -74.006,
};
const result = calculateProgression(birth, { year: 2026, month: 1, day: 1 });
console.log(formatProgressedChart(result));
```

## Events

Event searches live in `celestine/events`. Inputs are TT; results include `jd`
(TT) and `jdUT` (converted UT). Use matching frame options when checking a result
against a position getter. Consult the API documentation for aspect-time,
void-of-course Moon, ingress, and station search options.

```ts
import { findLunarPhases, findSeasons, findSignIngresses } from 'celestine/events';
import { CelestialBody, toJulianDate, toTT } from 'celestine';

const start = toTT(toJulianDate({
  year: 2026, month: 1, day: 1, hour: 0, minute: 0, second: 0,
}));
const end = start + 365;
console.log(findLunarPhases(start, end, { phases: ['full-moon'] }));
console.log(findSeasons(start, end));
console.log(findSignIngresses(CelestialBody.Mercury, start, end));
```

### Day reports

`findAscendantSigns` lists the rising sign intervals for a location across a TT
interval, and `getSignsDuring` tells which bodies keep one sign and when the others
change. For a local civil day, take the UT bounds from `localDayToUT` and convert
them with `toTT`; DST days then keep their real length of 23 or 25 hours.

```ts
import { findAscendantSigns, getSignsDuring, localDayToUT } from 'celestine/events';
import { toTT } from 'celestine/time';

const day = localDayToUT({ year: 2026, month: 3, day: 29 }, 'Europe/Berlin');
const rising = findAscendantSigns(toTT(day.startJD), toTT(day.endJD), 52.52, 13.405);
const planets = getSignsDuring(toTT(day.startJD), toTT(day.endJD));
```

Latitude is degrees north; longitude is degrees east (west is negative).
Ascendant intervals cover the inclusive TT bounds, with `startUT` and `endUT`
computed using `toUT`. Interior boundaries belong to the following sign;
a boundary at the final instant can produce a zero-duration final interval.
A zero-length request returns one interval. Latitudes with absolute value at
least 66 degrees are rejected with `RangeError`, excluding polar ascendant jumps.
The ascendant uses the chart's mean sidereal time and mean obliquity on UT.
Its boundaries are solved analytically and refined with the library ascendant.
All 60 sign boundaries in five reference days agree with ERFA (`gmst82`, `obl80`)
within 0.0001 seconds.

`getSignsDuring` defaults to Sun through Pluto in `CelestialBody` order. Pass
`{ bodies: [CelestialBody.Moon] }` to select bodies. Each report includes
`startSign`, `endSign`, their names, `changesSign`, and all `ingresses` within
the inclusive bounds. A return to the starting sign still sets `changesSign`.
The default frame is mean ecliptic/equinox of date; `{ includeNutation: true }`
selects true equinox for both functions. Ingress instants carry TT `jd` and UT `jdUT`.

### Lunations on natal points

Every lunar phase event carries `moonLongitude` and `sunLongitude`: apparent geocentric
ecliptic longitudes at the exact instant, in degrees, mean equinox of date by default (the
same frame as `calculateChart` and the position getters) or true equinox with
`includeNutation: true`. Phase names also accept the short forms `'new'`, `'first'`,
`'full'` and `'last'`; an unknown name throws a `RangeError` that lists the valid ones.

```ts
const natalSun = 280.37;
const hits = findLunarPhases(start, end, { phases: ['new', 'full'] }).filter(
  (e) => Math.abs(((e.moonLongitude - natalSun + 540) % 360) - 180) <= 3,
);
```

Checked against JPL Horizons at all 148 phases of 2025–2027: Moon within 7.5″, Sun
within 0.3″ (true equinox of date).

For the phase at a given moment, `getMoonPhase(jd)` (TT) returns the elongation,
illuminated fraction and two names. `phase` is the nearest of the four principal
phases (90° buckets). `phaseName` is one of eight names: `'new-moon'`,
`'waxing-crescent'`, `'first-quarter'`, `'waxing-gibbous'`, `'full-moon'`,
`'waning-gibbous'`, `'last-quarter'`, `'waning-crescent'`, in 45° buckets centred on
the principal phases and the midpoints between them. So `'full-moon'` covers
elongation 157.5°–202.5°, roughly a day and a half either side of the exact full moon.

```ts
import { getMoonPhase } from 'celestine/events';

getMoonPhase(start + 10).phaseName; // 'last-quarter' (2026-01-11)
```

### Eclipses

`findEclipses` searches an inclusive TT interval for greatest solar and lunar eclipses.
It is exported only from `celestine/events`. Results include TT `jd`, model-derived UT
`jdUT`, type, NASA magnitude and signed gamma in Earth equatorial radii. Lunar events
also include umbral and penumbral magnitudes; solar events identify whether the axis
intersects Earth's ellipsoid with `central`.

```ts
import { findEclipses } from 'celestine/events';

const eclipses = findEclipses(2460310.5, 2460676.5, {
  kinds: ['solar', 'lunar'],
  includeNutation: true,
});
for (const eclipse of eclipses) {
  console.log(eclipse.jdUT, eclipse.kind, eclipse.type, eclipse.magnitude);
}
```

`sunLongitude` and `moonLongitude` equal the position getters at greatest eclipse:
apparent geocentric ecliptic longitudes, mean equinox of date by default, true equinox
with `includeNutation: true`. NASA Canon comparisons for 2020–2030 match all 50 types;
maximum TT timing error is 17.10 seconds (see the generated [accuracy report](https://anonyfox.github.io/celestine/accuracy/)).
`sunSign`, `sunSignName`, `moonSign` and `moonSignName` use those same longitudes; Aries is index 0.

`findNextEclipse(jd, options?)` and `findPreviousEclipse(jd, options?)` select strictly after/before
the supplied TT instant, with the same frame and `kinds` options. Empty kinds or a search with no
result within 1201 days throws `RangeError`.

```ts
import { findNextEclipse, getSolarEclipseLocal } from 'celestine/events';
const eclipse = findNextEclipse(2461041.5, { kinds: ['solar'] }); // TT
if (eclipse.kind === 'solar') {
  const local = getSolarEclipseLocal(eclipse, { latitude: 64.1466, longitude: -21.9426 });
  console.log(local.localType, local.maximum.jdUT, local.maximum.obscuration);
}
```

`getSolarEclipseLocal(eventOrTT, observer)` returns C1/C4 (`partialBegin`, `partialEnd`),
C2/C3 (`centralBegin`, `centralEnd`), local maximum, diameter magnitude and disk-area obscuration.
`duration` is central-phase seconds, or null. `localType` describes the geometric alignment,
including phases below the horizon; `visible` means any partial phase has Sun centre altitude >0°.
No local eclipse means `localType: 'none'`, `visible: false` and null contacts/duration.
Maximum is the maximum diameter magnitude within 0.4 day of greatest global eclipse.

Observer coordinates are WGS84 geodetic degrees, longitude east-positive; optional elevation is
metres, default zero. Altitudes are topocentric geometric centre altitudes, without refraction,
terrain or horizon dip. Solar azimuth is north=0°, east=90°. The Moon radii are 0.2725076 Earth
radii for partial contacts and 0.272281 for central contacts. Lunar limb relief is not modelled.
Contacts converge to <0.01 s numerically; this is separate from ephemeris and ΔT uncertainty.

`getLunarEclipseLocal(eventOrTT, observer)` returns global P1, U1, U2, U3, U4, P4 instants with
local topocentric Moon `altitude`, `moonAltitude` at maximum and visibility flags. Absent
contacts are null. `visibleDuringUmbral` is false for penumbral-only events. `durations`
contains penumbral (P1..P4), partial (U1..U4) and total (U2..U3) minutes, zero for absent phases.
Contact geometry shares the global NASA Canon model, including its 1.01 enlarged umbra.

The [2026–2028 fixture](../src/events/__fixtures__/nasa-eclipses-2026-2028.json) matches all
14 NASA types; maximum TT/UT residuals are 10.84/16.66 s, with NASA's predicted ΔT used only
for the UT comparison. Lunar durations differ by at most 0.49 min for the shallow July 2027
penumbral eclipse, and 0.10 min otherwise. The ten-city
[solar fixture](../src/events/__fixtures__/nasa-solar-local-2026.json) records minute rounding,
city coordinates and sunset annotations; the tests allow 90 s and one percentage point.

### Black Moon Lilith

Use separate getters for mean and true (perturbed apogee) Black Moon Lilith:

```ts
import { getMeanLilith, getTrueLilith } from 'celestine/ephemeris';
const jd = 2461041.5; // TT
console.log(getMeanLilith(jd).longitude, getTrueLilith(jd).longitude);
```


For integrations, see [examples](../examples/). For signatures and option types,
see the [API documentation](https://anonyfox.github.io/celestine).
