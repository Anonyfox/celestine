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
- ✅ **Date Conversions** - Calendar ↔ Julian Date with full validation
- 🪐 **Planetary Positions** - Accurate ephemeris calculations (coming soon)
- ♈ **Zodiac System** - Tropical zodiac signs with full metadata (coming soon)
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
import { julianDate, eclipticToZodiac } from "celestine";

// Calculate Julian Date for J2000.0 epoch
const jd = julianDate(2000, 1, 1, 12);
console.log(jd); // 2451545.0

// Convert ecliptic longitude to zodiac position
const position = eclipticToZodiac(45.5);
console.log(position);
// { signIndex: 1, signName: 'Taurus', degree: 15.5, formatted: '15°30' Taurus' }
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
const systems = ["placidus", "koch", "equal", "whole-sign", "porphyry", "regiomontanus", "campanus"];
```

**Available:**

- 7 house systems (Placidus, Koch, Equal, Whole Sign, Porphyry, Regiomontanus, Campanus)
- Calculate ASC, MC, DSC, IC (chart angles)
- Obliquity of ecliptic (Laskar 1986 formula)
- Geographic location validation with helpful error messages
- House position lookup & zodiac utilities
- Direct ports of Swiss Ephemeris algorithms for complex systems
- Verified against astronomical principles (angle relationships, house spacing, equatorial behavior)

### Zodiac Conversions

```typescript
import { eclipticToZodiac } from "celestine";

// Convert any ecliptic longitude to zodiac position
const sunPosition = eclipticToZodiac(120.5);
console.log(sunPosition);
// { signIndex: 4, signName: 'Leo', degree: 0.5, formatted: '0°30' Leo' }
```

## API Documentation

Full API documentation is available at [https://anonyfox.github.io/celestine](https://anonyfox.github.io/celestine)

### Core Functions

#### `julianDate(year, month, day, hour?)`

Calculates the Julian Date for a given date and time.

**Parameters:**

- `year` - Year (Gregorian calendar)
- `month` - Month (1-12)
- `day` - Day (1-31)
- `hour` - Hour (0-23, decimal, optional)

**Returns:** Julian Date as a continuous day count

#### `eclipticToZodiac(longitude)`

Converts ecliptic longitude to zodiac sign and position.

**Parameters:**

- `longitude` - Ecliptic longitude in degrees (0-360)

**Returns:** Object with sign index, sign name, degree within sign, and formatted string

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
- [ ] Aspect calculations with orbs
- [ ] Planetary dignities and essential dignities
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
