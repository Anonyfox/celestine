# Celestine ✨

[![npm version](https://img.shields.io/npm/v/celestine.svg?style=flat-square)](https://www.npmjs.com/package/celestine)
[![npm downloads](https://img.shields.io/npm/dm/celestine.svg?style=flat-square)](https://www.npmjs.com/package/celestine)
[![CI](https://img.shields.io/github/actions/workflow/status/Anonyfox/celestine/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/Anonyfox/celestine/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-live-brightgreen?style=flat-square)](https://anonyfox.github.io/celestine)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green?style=flat-square&logo=node.js)](https://nodejs.org/)

**A TypeScript library for astronomical and astrological calculations.** Celestine provides precise calculations for planetary positions, birth charts, aspects, houses, and more — all based on solid astronomical principles.

## Features

- ✅ **Time Calculations** - Julian dates, Julian centuries, sidereal time, ΔT corrections
- ✅ **NASA Verified** - Time calculations tested against official NASA reference data
- ✅ **House Systems** - 7 systems (Placidus, Koch, Equal, Whole Sign, Porphyry, Regiomontanus, Campanus)
- ✅ **Astronomically Verified** - House calculations verified against fundamental astronomical principles
- ✅ **Zodiac System** - Tropical zodiac with signs, dignities, and complete metadata
- ✅ **Traditional Astrology** - Planetary rulerships and essential dignities (Ptolemy, Lilly)
- ✅ **Date Conversions** - Calendar ↔ Julian Date with full validation
- 🪐 **Planetary Positions** - Accurate ephemeris calculations (coming soon)
- 📐 **Aspects** - Angular relationships between celestial bodies (coming soon)
- 🔒 **Type-safe** - Full TypeScript support with comprehensive types
- 🧪 **Well-tested** - 100% test coverage
- 🚀 **Zero runtime dependencies** - Lightweight and fast

## Installation

```bash
npm install celestine
```

## Quick Start

```typescript
import { time, zodiac } from "celestine";

// Calculate Julian Date for J2000.0 epoch
const jd = time.toJulianDate({ year: 2000, month: 1, day: 1, hour: 12 });
console.log(jd); // 2451545.0

// Convert ecliptic longitude to zodiac position
const position = zodiac.eclipticToZodiac(217.411111);
console.log(position.formatted); // "7°24'40" Scorpio"

// Check planetary dignity
const marsAries = zodiac.getPlanetaryDignity(
  zodiac.Planet.Mars,
  zodiac.Sign.Aries
);
console.log(marsAries.state); // "Domicile" (Mars rules Aries, +5 strength)
```

## Usage

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

## Roadmap

Celestine is in active development. Planned features include:

- [ ] Complete ephemeris for all planets and major asteroids
- [ ] Birth chart calculation
- [x] House system implementations (Placidus, Koch, Equal, Whole Sign, Porphyry, Regiomontanus, Campanus)
- [x] Zodiac system with tropical signs and essential dignities
- [ ] Aspect calculations with orbs
- [ ] Lunar nodes and additional chart points
- [ ] Retrograde detection
- [ ] Transit calculations
- [ ] Progression calculations

## Project Philosophy

Celestine is built on solid astronomical foundations. All calculations follow established astronomical algorithms (primarily Jean Meeus' "Astronomical Algorithms") and are designed to be accurate, well-documented, and easy to understand.

## License

MIT

---

<div align="center">

### Support

If this package helps your project, consider sponsoring its maintenance:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-EA4AAA?style=for-the-badge&logo=github&logoColor=white)](https://github.com/sponsors/Anonyfox)

---

**[Anonyfox](https://anonyfox.com) • [MIT License](LICENSE)**

</div>
