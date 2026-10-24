# Module guide

Use the [README](../README.md) for measured precision, bundle sizes, and time-scale
caveats. The examples below are independent programs. They intentionally avoid
fixed numeric outputs; run them for the inputs you need.

## Time and ephemeris

Civil dates produce UT Julian Dates. Convert to TT before calling position
getters. Longitudes and latitudes are degrees; longitude speed is degrees/day.
Negative longitude speed indicates retrograde motion.

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

## Precise small bodies

Import these getters explicitly to opt into the separate Chebyshev models.
Their supported date span and sampled accuracy checks are described in the
[README](../README.md#precise-small-bodies) and
[tests](../src/precise/precise.test.ts). Default small-body models have much larger
errors; do not apply planetary precision figures to them.

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

For integrations, see [examples](../examples/). For signatures and option types,
see the [API documentation](https://anonyfox.github.io/celestine).
