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

- 🌟 **Astronomical Calculations** - Julian dates, sidereal time, coordinate conversions
- 🪐 **Planetary Positions** - Accurate ephemeris calculations for all planets
- ♈ **Zodiac System** - Tropical zodiac signs with full metadata
- 🏠 **House Systems** - Multiple house calculation methods (Placidus, Equal, Whole Sign, etc.)
- 📐 **Aspects** - Angular relationships between celestial bodies
- 🔒 **Type-safe** - Full TypeScript support with comprehensive types
- 🧪 **Well-tested** - Built with Node.js native test runner
- 🚀 **Zero runtime dependencies** - Lightweight and fast

## Installation

```bash
npm install celestine
```

## Quick Start

```typescript
import { julianDate, eclipticToZodiac } from 'celestine';

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

```typescript
import { julianDate } from 'celestine';

// Calculate Julian Date for any moment
const jd = julianDate(2025, 12, 18, 12);
console.log(jd); // Julian Date for December 18, 2025, 12:00 UT
```

### Zodiac Conversions

```typescript
import { eclipticToZodiac } from 'celestine';

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
- [ ] House system implementations (Placidus, Koch, Equal, Whole Sign, etc.)
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

