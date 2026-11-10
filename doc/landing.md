# Celestine

Celestine is a TypeScript astrology and astronomy engine with zero runtime dependencies.
It runs in browsers and Node under the MIT license. Positions are verified against
committed JPL Horizons fixtures; the <a href="accuracy/">accuracy report</a> records sampled errors and scope.

## Documentation

- <a href="modules.html">API reference</a>: modules and function signatures.
- <a href="accuracy/">Accuracy</a>: measurements against JPL Horizons and other references.
- <a href="documents/COMPARISON.html">Ephemeris comparison</a>: measured results and package metadata.
- <a href="documents/GUIDE.html">Guide</a>: module usage and time-scale conventions.
- <a href="examples/browser-natal-chart.html">Browser natal chart demo</a>: calculate and display a chart.

## Install

```sh
npm install celestine
```

## Quick start

```ts
import { time, ephemeris, zodiac } from 'celestine';
const jdUT = time.toJulianDate({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, second: 0 });
const jdTT = time.toTT(jdUT);
const sun = ephemeris.getSunPosition(jdTT);
console.log(zodiac.eclipticToZodiac(sun.longitude).formatted);
```

Civil dates convert to UT; ephemeris getters take TT. See the guide for frames and chart inputs.
