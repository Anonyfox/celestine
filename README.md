# Celestine ✨

[![npm version](https://img.shields.io/npm/v/celestine.svg?style=flat-square)](https://www.npmjs.com/package/celestine)
[![npm downloads](https://img.shields.io/npm/dm/celestine.svg?style=flat-square)](https://www.npmjs.com/package/celestine)
[![CI](https://img.shields.io/github/actions/workflow/status/Anonyfox/celestine/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/Anonyfox/celestine/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-live-brightgreen?style=flat-square)](https://anonyfox.github.io/celestine)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green?style=flat-square&logo=node.js)](https://nodejs.org/)

<div align="center">
  <img src="https://raw.githubusercontent.com/Anonyfox/celestine/main/assets/celestine-logo.png" alt="Celestine Logo" width="400" />
</div>

**No bullshit astrology calculations.** Celestine is a TypeScript library for birth charts, transits, progressions, and everything else you need for serious astrological software. Every single calculation is validated against NASA data, JPL Horizons, and Swiss Ephemeris — not "inspired by" or "based on", but byte-for-byte verified against the actual sources astronomers use.

Built for practitioners who actually care about precision. 2400+ unit tests. Zero runtime dependencies. If the math is wrong, your tests will catch it. If NASA says Mars is at 127.4532°, Celestine gives you 127.4532°. Not 127.45° or "close enough" — the real number, every time.

## Features

- ✅ **Birth Charts** - Complete chart calculation combining all modules into a cohesive API
- ✅ **Ephemeris** - Sun, Moon, all planets, Chiron, 4 major asteroids, lunar nodes, Lilith, lots
- ✅ **JPL/Swiss Ephemeris Verified** - Positions validated against authoritative astronomical data
- ✅ **Time Calculations** - Julian dates, Julian centuries, sidereal time, ΔT corrections
- ✅ **NASA Verified** - Time calculations tested against official NASA reference data
- ✅ **House Systems** - 7 systems (Placidus, Koch, Equal, Whole Sign, Porphyry, Regiomontanus, Campanus)
- ✅ **Astronomically Verified** - House calculations verified against fundamental astronomical principles
- ✅ **Zodiac System** - Tropical zodiac with signs, dignities, and complete metadata
- ✅ **Traditional Astrology** - Planetary rulerships and essential dignities (Ptolemy, Lilly)
- ✅ **Retrograde Detection** - Automatic retrograde motion detection for all bodies
- ✅ **Aspects** - 14 aspect types (major, minor, Kepler), patterns, orbs, applying/separating
- ✅ **Transits** - Predictive astrology with exact timing, house ingress, retrograde handling
- ✅ **Progressions** - Secondary progressions, solar arc directions, Moon phases and sign transits
- 🔒 **Type-safe** - Full TypeScript support with comprehensive types
- 🧪 **Well-tested** - 2400+ unit tests
- 🚀 **Zero runtime dependencies** - Lightweight and fast

## Installation

```bash
npm install celestine
```

## Quick Start

```typescript
import { calculateChart, ephemeris, time, zodiac } from "celestine";

// Calculate a complete birth chart
const chart = calculateChart({
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  second: 0,
  timezone: 0,
  latitude: 51.5074, // London
  longitude: -0.1278,
});

console.log(`Rising: ${chart.angles.ascendant.formatted}`);
console.log(`Sun: ${chart.planets[0].formatted}`);
console.log(`Aspects: ${chart.aspects.all.length}`);

// Or use individual modules for more control
const jd = time.toJulianDate({ year: 2000, month: 1, day: 1, hour: 12 });
const sun = ephemeris.getSunPosition(jd);
const position = zodiac.eclipticToZodiac(sun.longitude);
console.log(position.formatted); // "10°27' Capricorn"

// Check planetary dignity
const marsAries = zodiac.getPlanetaryDignity(
  zodiac.Planet.Mars,
  zodiac.Sign.Aries
);
console.log(marsAries.state); // "Domicile" (Mars rules Aries)
```

## Usage

### Ephemeris (Planetary Positions)

Calculate precise positions of celestial bodies at any moment, validated against JPL Horizons and Swiss Ephemeris.

```typescript
import { ephemeris, time } from "celestine";

// Get Julian Date for a specific moment
const jd = time.toJulianDate({ year: 2000, month: 1, day: 1, hour: 12 });

// Get individual body positions
const sun = ephemeris.getSunPosition(jd);
console.log(sun.longitude); // 280.46° (Capricorn)
console.log(sun.distance); // 0.983 AU
console.log(sun.isRetrograde); // false

const moon = ephemeris.getMoonPosition(jd);
console.log(moon.longitude); // 223.32° (Scorpio)
console.log(moon.latitude); // 5.17°

// Get all positions at once using the unified API
const positions = ephemeris.getAllPositions(jd);
console.log(positions.get(ephemeris.CelestialBody.Mars));

// Check retrograde status
const mercury = ephemeris.getMercuryPosition(jd);
if (mercury.isRetrograde) {
  console.log("Mercury retrograde!");
}

// Get zodiac sign for a body
const sign = ephemeris.getSign(ephemeris.CelestialBody.Venus, jd);
console.log(sign); // "Sagittarius"
```

**Available Bodies:**

- **Luminaries**: Sun, Moon
- **Classical Planets**: Mercury, Venus, Mars, Jupiter, Saturn
- **Modern Planets**: Uranus, Neptune, Pluto
- **Centaur**: Chiron
- **Asteroids**: Ceres, Pallas, Juno, Vesta
- **Lunar Nodes**: Mean Node, True Node (North & South)
- **Lilith**: Mean Lilith, True Lilith (Black Moon)
- **Lots**: Part of Fortune, Part of Spirit

**Features:**

- Geocentric ecliptic coordinates (longitude, latitude, distance)
- Automatic retrograde detection via longitudeSpeed
- ±1 arcminute accuracy for years 1800-2200
- Based on Jean Meeus' "Astronomical Algorithms" and VSOP87 theory
- All positions validated against JPL Horizons and Swiss Ephemeris reference data

### Time Calculations

The Time module provides comprehensive astronomical time calculations, all verified against NASA reference data.

```typescript
import { time } from "celestine";

// Julian Date conversions
const jd = time.toJulianDate({
  year: 2025,
  month: 12,
  day: 18,
  hour: 15,
  minute: 30,
  second: 0,
});
const date = time.fromJulianDate(jd); // Convert back to calendar date

// Julian Centuries from J2000.0 epoch
const T = time.toJulianCenturies(jd); // For ephemeris calculations

// Sidereal Time (for house calculations)
const gmst = time.greenwichMeanSiderealTime(jd); // Greenwich Mean Sidereal Time
const lst = time.localSiderealTime(gmst, -5.0); // Local Sidereal Time (longitude: -5°)

// Delta T corrections (TT ↔ UT)
const deltaT = time.deltaT(2025, 12); // ΔT in seconds
const ttJD = time.utToTT(jd, 2025, 12); // Convert UT to Terrestrial Time

// Time validation
const isValid = time.isValidDate(2024, 2, 29); // true (leap year)
const validation = time.validateCalendarDateTime({
  year: 2025,
  month: 12,
  day: 18,
  hour: 15,
  minute: 30,
  second: 0,
}); // { valid: true, errors: [] }

// Constants
console.log(time.J2000_EPOCH); // 2451545.0
console.log(time.DAYS_PER_CENTURY); // 36525
```

**Available:**

- Julian Date ↔ Calendar Date (Meeus algorithm, handles Gregorian/Julian calendars)
- Julian Centuries from J2000.0 epoch
- Greenwich Mean Sidereal Time & Local Sidereal Time
- ΔT corrections (Espenak & Meeus polynomials, verified against NASA data)
- Date/time validation (leap years, month boundaries, etc.)
- Time utilities (angle normalization, conversions, formatting)
- 36 astronomical constants (J2000, Unix epoch, sidereal day, etc.)

All calculations are based on authoritative sources (Meeus, NASA, IERS) and tested against 309 unit tests including 17 NASA official reference values.

### House Calculations

Calculate astrological house cusps and angles using multiple house systems, all verified against Swiss Ephemeris.

```typescript
import { houses } from "celestine";

// Calculate houses for a birth chart
const birthChart = houses.calculateHouses(
  { latitude: 51.5074, longitude: -0.1278 }, // London
  245.5, // Local Sidereal Time in degrees
  23.4368, // Obliquity of ecliptic
  "placidus" // House system
);

console.log(birthChart.angles);
// { ascendant: 120.5, midheaven: 285.3, descendant: 300.5, imumCoeli: 105.3 }

console.log(birthChart.cusps);
// { cusps: [120.5, 145.2, 172.8, ...] } // 12 house cusps

// Supported house systems
const systems = [
  "placidus",
  "koch",
  "equal",
  "whole-sign",
  "porphyry",
  "regiomontanus",
  "campanus",
];
```

**Available:**

- 7 house systems (Placidus, Koch, Equal, Whole Sign, Porphyry, Regiomontanus, Campanus)
- Calculate ASC, MC, DSC, IC (chart angles)
- Obliquity of ecliptic (Laskar 1986 formula)
- Geographic location validation with helpful error messages
- House position lookup & zodiac utilities
- Direct ports of Swiss Ephemeris algorithms for complex systems
- Verified against astronomical principles (angle relationships, house spacing, equatorial behavior)

### Zodiac System & Planetary Dignities

Calculate tropical zodiac positions and essential dignities based on traditional astrological doctrine.

```typescript
import { zodiac } from "celestine";

// Convert ecliptic longitude to zodiac position
const venus = zodiac.eclipticToZodiac(217.411111);
console.log(venus);
// {
//   sign: Sign.Scorpio,
//   signName: 'Scorpio',
//   degree: 7,
//   minute: 24,
//   second: 40,
//   formatted: "7°24'40\" Scorpio"
// }

// Get sign properties
const aries = zodiac.getSignInfo(zodiac.Sign.Aries);
console.log(aries);
// {
//   element: Element.Fire,
//   modality: Modality.Cardinal,
//   polarity: Polarity.Positive,
//   ruler: Planet.Mars,
//   symbol: '♈'
// }

// Check planetary dignity
const sunAries = zodiac.getPlanetaryDignity(
  zodiac.Planet.Sun,
  zodiac.Sign.Aries
);
console.log(sunAries);
// {
//   state: DignityState.Exaltation,
//   strength: 4,  // +4 for exaltation
//   exaltationDegree: 19,
//   description: 'Sun exalted in Aries'
// }

// Check multiple dignities
zodiac.isRuler(zodiac.Planet.Mars, zodiac.Sign.Aries); // true (Mars rules Aries)
zodiac.isExalted(zodiac.Planet.Sun, zodiac.Sign.Aries); // true (Sun exalted in Aries)
zodiac.isDetriment(zodiac.Planet.Mars, zodiac.Sign.Libra); // true (opposite Aries)

// Format with options
const formatted = zodiac.formatZodiacPosition(venus, {
  useSymbol: true, // Use ♏ instead of "Scorpio"
  includeSeconds: false, // Omit seconds
});
// "7°24' ♏"
```

**Available:**

- Ecliptic longitude → Zodiac sign + DMS (degrees/minutes/seconds)
- Complete sign properties (element, modality, polarity, rulers, symbols)
- Essential dignities (domicile, exaltation, detriment, fall, peregrine)
- Strength scoring (+5, +4, 0, -4, -5) per traditional system
- Traditional rulers (Ptolemy) + modern rulers (Uranus, Neptune, Pluto)
- Exact exaltation degrees (19° Aries for Sun, 28° Capricorn for Mars, etc.)
- Unicode symbols for all signs (♈-♓) and planets (☉☽☿♀♂♃♄♅♆♇)
- Flexible formatting options (symbols, decimal degrees, DMS)
- Algorithm verified against Swiss Ephemeris
- All data verified against Ptolemy's "Tetrabiblos" and Lilly's "Christian Astrology"

### Aspects (Angular Relationships)

Calculate aspects between celestial bodies with configurable orbs, patterns detection, and applying/separating indicators.

```typescript
import { aspects, ephemeris, time } from "celestine";

// Get planetary positions
const jd = time.toJulianDate({ year: 2000, month: 1, day: 1, hour: 12 });
const sun = ephemeris.getSunPosition(jd);
const moon = ephemeris.getMoonPosition(jd);
const mars = ephemeris.getMarsPosition(jd);

// Create bodies array for aspect detection
const bodies = [
  { name: "Sun", longitude: sun.longitude, longitudeSpeed: sun.longitudeSpeed },
  {
    name: "Moon",
    longitude: moon.longitude,
    longitudeSpeed: moon.longitudeSpeed,
  },
  {
    name: "Mars",
    longitude: mars.longitude,
    longitudeSpeed: mars.longitudeSpeed,
  },
];

// Find all aspects between bodies
const result = aspects.calculateAspects(bodies);

for (const aspect of result.aspects) {
  console.log(aspects.formatAspect(aspect));
  // "Sun ⚹ Moon (2°57', 51%, separating)"
}

// Detect aspect patterns (T-Square, Grand Trine, Yod, etc.)
const patterns = aspects.findPatterns(result.aspects);
for (const pattern of patterns) {
  console.log(`${pattern.type}: ${pattern.bodies.join(", ")}`);
}

// Calculate angular separation
const separation = aspects.angularSeparation(sun.longitude, moon.longitude);
console.log(separation); // 57.05°

// Check if within orb of an aspect
const match = aspects.findMatchingAspect(separation);
if (match) {
  console.log(`${match.aspect.name} with ${match.deviation}° orb`);
}
```

**Available Aspects (14 types):**

- **Major (Ptolemaic)**: Conjunction ☌, Sextile ⚹, Square □, Trine △, Opposition ☍
- **Minor**: Semi-sextile ⚺, Semi-square ∠, Quintile Q, Sesquiquadrate ⚼, Biquintile bQ, Quincunx ⚻
- **Kepler**: Septile S (360°/7), Novile N (360°/9), Decile D (360°/10)

**Aspect Patterns:**

- T-Square (Opposition + 2 Squares)
- Grand Trine (3 Trines)
- Grand Cross (4 Squares + 2 Oppositions)
- Yod / Finger of God (2 Quincunxes + Sextile)
- Kite (Grand Trine + Opposition)
- Mystic Rectangle (2 Oppositions + 2 Trines + 2 Sextiles)
- Stellium (3+ Conjunctions)

**Features:**

- Configurable orbs per aspect type
- Strength calculation (100% = exact, decreasing to orb edge)
- Applying vs separating aspect detection
- Out-of-sign (dissociate) aspect detection
- Pattern detection for complex configurations
- Kepler aspects with mathematically exact angles (from "Harmonices Mundi", 1619)

### Birth Charts

Calculate complete astrological birth charts by combining all modules into a cohesive API. All calculations verified against Swiss Ephemeris.

```typescript
import { calculateChart, CelestialBody } from "celestine";

// Calculate a complete birth chart
const chart = calculateChart({
  year: 1879,
  month: 3,
  day: 14,
  hour: 11,
  minute: 30,
  second: 0,
  timezone: 0.667, // LMT offset (or use standard timezone)
  latitude: 48.4,
  longitude: 10.0,
});

// Access planetary positions
for (const planet of chart.planets) {
  console.log(`${planet.name}: ${planet.formatted} in House ${planet.house}`);
}
// "Sun: 23°30' Pisces in House 9"
// "Moon: 14°31' Sagittarius in House 6"

// Access chart angles
console.log(`Rising: ${chart.angles.ascendant.formatted}`);
// "Rising: 11°38' Cancer"
console.log(`Midheaven: ${chart.angles.midheaven.formatted}`);
// "Midheaven: 12°50' Pisces"

// Access house cusps
for (const [num, cusp] of Object.entries(chart.houses.cusps)) {
  console.log(`House ${num}: ${cusp.formatted}`);
}

// Access aspects
for (const aspect of chart.aspects.all) {
  console.log(`${aspect.body1Name} ${aspect.symbol} ${aspect.body2Name}`);
}

// Access chart summary
console.log(chart.summary.elements);
// { fire: 3, earth: 1, air: 2, water: 4 }
console.log(chart.summary.modalities);
// { cardinal: 2, fixed: 3, mutable: 5 }
console.log(chart.summary.retrograde);
// ['Uranus']
console.log(chart.summary.patterns);
// [{ type: 'TSquare', bodies: ['Sun', 'Moon', 'Saturn'] }]
```

**Chart Options:**

```typescript
const chart = calculateChart(birthData, {
  houseSystem: "placidus", // 'koch', 'equal', 'whole-sign', etc.
  includeAsteroids: true, // Ceres, Pallas, Juno, Vesta
  includeChiron: true, // Chiron
  includeLilith: true, // Black Moon Lilith
  includeNodes: true, // Lunar Nodes
  includeLots: true, // Part of Fortune, Part of Spirit
  aspectTypes: "major", // 'all', 'major', or custom array
  zodiacType: "tropical", // Currently only tropical supported
});
```

**Also Available:**

```typescript
import {
  calculateChart,
  calculatePlanets,
  calculateHouseCusps,
  validateBirth,
  formatChart,
  getAvailableHouseSystems,
} from "celestine";

// Calculate only planetary positions
const planets = calculatePlanets(birthData);

// Calculate only house cusps and angles
const houses = calculateHouseCusps(birthData, { houseSystem: "koch" });

// Validate birth data before calculation
const validation = validateBirth(birthData);
if (!validation.valid) {
  console.log(validation.errors);
}

// Format chart for display
console.log(formatChart(chart, "text"));

// Get available house systems
const systems = getAvailableHouseSystems(); // ['placidus', 'koch', ...]
```

**Features:**

- Complete birth chart with planets, houses, aspects, and summary
- All 7 house systems supported
- Automatic dignity calculation for each planet
- Aspect patterns detection (T-Square, Grand Trine, Yod, etc.)
- Element/modality/polarity distribution analysis
- Hemisphere and quadrant emphasis
- Retrograde planet tracking
- Validated against Swiss Ephemeris reference data
- Einstein's chart verified against Swiss Ephemeris 2.10.03

### Transits (Predictive Astrology)

Calculate when current planetary positions form aspects to natal chart positions — the foundation of predictive astrology.

```typescript
import { transits, time, type NatalPoint } from "celestine";

// Define natal points from a birth chart
const natalPoints: NatalPoint[] = [
  { name: "Sun", longitude: 280.37, type: "planet" },
  { name: "Moon", longitude: 223.32, type: "luminary" },
  { name: "ASC", longitude: 101.65, type: "angle" },
];

// Calculate transits at a specific moment
const jd = time.toJulianDate({ year: 2025, month: 12, day: 19, hour: 12 });
const result = transits.calculateTransits(natalPoints, jd);

for (const transit of result.transits) {
  console.log(transits.formatTransit(transit));
  // "Saturn □ Sun (1°23', 85%, applying)"
}

// Search transits over a date range
const searchResult = transits.searchTransits({
  natalPoints,
  startJD: jd,
  endJD: jd + 365, // One year
  transitingBodies: [
    transits.CelestialBody.Saturn,
    transits.CelestialBody.Jupiter,
  ],
});

// Get timing details for each transit
for (const timing of searchResult.transits) {
  console.log(
    `${timing.transit.transitingBody} ${timing.transit.symbol} ${timing.transit.natalPoint}`
  );
  console.log(
    `  Enters orb: ${timing.enterOrbDate?.month}/${timing.enterOrbDate?.day}`
  );
  console.log(
    `  Exact: ${timing.exactDates[0]?.month}/${timing.exactDates[0]?.day}`
  );
  console.log(
    `  Exits orb: ${timing.exitOrbDate?.month}/${timing.exitOrbDate?.day}`
  );
}

// Detect house ingresses
const houseCusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const ingresses = transits.calculateAllIngresses(
  transits.CelestialBody.Mars,
  houseCusps,
  jd,
  jd + 365
);

// Find retrograde periods
const mercuryRx = transits.findRetrogradePeriods(
  transits.CelestialBody.Mercury,
  jd,
  jd + 365
);

for (const period of mercuryRx) {
  console.log(transits.formatRetrogradePeriod(period));
  // "Mercury Rx: Dec 13 - Jan 2 (21 days), 8°23' Capricorn → 22°10' Sagittarius"
}
```

**Transit Types:**

- **Planet-to-Planet**: Transiting Saturn square natal Sun
- **Planet-to-Angle**: Transiting Jupiter conjunct natal ASC
- **Planet-to-House**: Mars enters the 7th house
- **Retrograde Transits**: Multiple passes due to retrograde motion

**Features:**

- Transit detection with applying/separating phase
- Strength calculation (100% = exact, decreasing to orb edge)
- Configurable orbs with extensions for luminaries and angles
- Exact transit time finding via binary search
- Orb entry/exit timing for full transit duration
- House ingress detection (planet enters/exits natal houses)
- Retrograde motion handling with station point detection
- Multiple transit passes for slow planets
- Date range search with grouping by month/body/natal point
- Validated against historical transit events and Swiss Ephemeris

### Progressions (Predictive Astrology)

Calculate how the natal chart evolves over time using secondary progressions, solar arc directions, and other progression techniques.

```typescript
import {
  progressions,
  calculateProgression,
  formatProgressedChart,
} from "celestine";

// Define birth data
const birth = {
  year: 1990,
  month: 6,
  day: 15,
  hour: 14,
  minute: 30,
  second: 0,
  timezone: -5,
  latitude: 40.7128, // New York
  longitude: -74.006,
};

// Calculate secondary progressions for a target date
const target = { year: 2024, month: 1, day: 1 };
const result = calculateProgression(birth, target);

console.log(`Age: ${result.ageAtTarget.toFixed(1)} years`);
console.log(`Solar Arc: ${result.solarArc.toFixed(2)}°`);

// View progressed positions
for (const body of result.bodies) {
  console.log(`${body.name}: ${body.progressedFormatted}`);
  if (body.hasChangedSign) {
    console.log(
      `  ★ Changed from ${body.natalSignName} to ${body.progressedSignName}`
    );
  }
}

// Check progressed angles
console.log(`Progressed ASC: ${result.angles.ascendant.progressedFormatted}`);
console.log(`Progressed MC: ${result.angles.midheaven.progressedFormatted}`);

// View aspects between progressed and natal positions
for (const aspect of result.aspects.slice(0, 5)) {
  console.log(
    `${aspect.progressedBody} ${aspect.aspectType} ${aspect.natalBody}`
  );
}

// Get detailed progressed Moon report
const moonReport = progressions.getProgressedMoonReport(birth, target);
console.log(`Moon Phase: ${moonReport.phase.phaseName}`);
console.log(`Moon Sign Transits:`);
for (const transit of moonReport.signTransits.slice(0, 5)) {
  console.log(
    `  ${transit.signName}: age ${transit.entryAge.toFixed(
      1
    )} - ${transit.exitAge.toFixed(1)}`
  );
}

// Use solar arc directions
const solarArc = progressions.calculateSolarArc(
  result.birthJD,
  result.targetJD
);
console.log(`Solar Arc: ${progressions.formatSolarArc(solarArc)}`);

// Format complete result
console.log(formatProgressedChart(result));
```

**Progression Types:**

- **Secondary Progressions**: 1 day = 1 year (most common technique)
- **Solar Arc Directions**: All points advance by Sun's progressed motion
- **Minor Progressions**: 1 sidereal month = 1 year
- **Tertiary Progressions**: 1 day = 1 month

**Features:**

- Complete progressed chart calculation
- Solar arc calculations and directions
- Progressed-to-natal aspect detection
- Sign change tracking for all bodies
- Specialized progressed Moon analysis
- Moon sign transit timeline
- Progressed lunar phase calculation
- Multiple progression type support
- Configurable orbs and aspect types
- Beautiful formatted output

## API Documentation

Full API documentation is available at [https://anonyfox.github.io/celestine](https://anonyfox.github.io/celestine)

## Development

```bash
npm install        # Install dependencies
npm test           # Run tests
npm run build      # Build package
npm run docs       # Generate documentation
npm run lint       # Check linting
npm run format     # Format code
```

---

<div align="center">

### Support

If this package helps your project, consider sponsoring its maintenance:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-EA4AAA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/Anonyfox)

---

**[Anonyfox](https://anonyfox.com) • [MIT License](LICENSE)**

</div>
