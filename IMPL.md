# Ephemeris Module: Implementation Guide

## Overview

The **Ephemeris Module** calculates positions of celestial bodies (Sun, Moon, planets) at any given moment. This is the missing core piece that enables complete birth chart generation.

**Goal**: Given a Julian Date, return ecliptic longitude (and optionally latitude, distance) for any celestial body.

**Philosophy**: Educational, transparent, self-contained. No external data files. Verified against authoritative sources.

---

## Feature List

### Celestial Bodies

| Body | Priority | Algorithm Source | Notes |
|------|----------|------------------|-------|
| **Sun** | P0 | Meeus Ch. 25 | Foundation - needed for day/night, aspects |
| **Moon** | P0 | Meeus Ch. 47 | Fastest moving, most complex |
| **Mercury** | P1 | Meeus Ch. 36 | Inner planet |
| **Venus** | P1 | Meeus Ch. 36 | Inner planet |
| **Mars** | P1 | Meeus Ch. 36 | Outer planet |
| **Jupiter** | P1 | Meeus Ch. 36 | Outer planet |
| **Saturn** | P1 | Meeus Ch. 36 | Outer planet |
| **Uranus** | P2 | Meeus Ch. 36 | Modern planet |
| **Neptune** | P2 | Meeus Ch. 36 | Modern planet |
| **Pluto** | P2 | Meeus Ch. 37 | Dwarf planet (special handling) |
| **North Node** | P1 | Meeus Ch. 47 | Mean Node (smooth) |
| **True Node** | P2 | Derived | Includes oscillations |
| **Lilith** | P3 | Lunar apogee | Mean Black Moon Lilith |
| **Chiron** | P3 | Orbital elements | Optional, complex orbit |

### Output Per Body

```typescript
interface PlanetPosition {
  longitude: number;        // Ecliptic longitude 0-360° (primary output)
  latitude: number;         // Ecliptic latitude (usually small, can be 0 for simplified)
  distance: number;         // Distance in AU (optional)
  longitudeSpeed: number;   // Degrees per day (for retrograde detection)
  isRetrograde: boolean;    // Convenience flag
}
```

### Derived Calculations

| Feature | Description |
|---------|-------------|
| **Retrograde detection** | `longitudeSpeed < 0` |
| **Stationary detection** | `|longitudeSpeed| < threshold` |
| **Elongation** | Angular distance from Sun (for Mercury/Venus visibility) |
| **Phase angle** | For Moon phases |

---

## Precision Levels

### Level 1: Simplified (This Implementation)

**Target**: ±1 arcminute (1/60°) accuracy

**Source**: Jean Meeus, "Astronomical Algorithms" (2nd Ed., 1998)

**Characteristics**:
- Polynomial + periodic term formulas
- ~50-200 terms per planet
- Valid range: roughly 1800-2200 CE
- Self-contained (no data files)
- Sufficient for all astrological purposes

**Why this is enough**: Astrology interprets 1° orbs. A 1' error is 60× smaller than interpretive resolution.

### Level 2: High Precision (Future Enhancement)

**Target**: ±1 arcsecond (1/3600°) accuracy

**Source**: VSOP87 (full) or Moshier analytical ephemeris

**Characteristics**:
- Thousands of trigonometric terms
- Tables stored in code or data files
- Valid range: -4000 to +8000 CE
- Required for: eclipse prediction, occultations, precise transits

**Implementation path**: Port the Moshier tables from `.references/swisseph/planetary/swemptab.h`

### Level 3: Research Grade (Out of Scope)

**Target**: Sub-arcsecond

**Source**: JPL DE440/DE441 numerical ephemeris

**Characteristics**:
- Binary data files (~100MB)
- Chebyshev polynomial interpolation
- Used for spacecraft navigation

---

## Algorithms

### Sun Position (Meeus Ch. 25)

```
Input: Julian Date (JD)
Output: Apparent geocentric ecliptic longitude

1. Calculate Julian Centuries: T = (JD - 2451545.0) / 36525
2. Geometric mean longitude: L₀ = 280.46646 + 36000.76983·T + 0.0003032·T²
3. Mean anomaly: M = 357.52911 + 35999.05029·T - 0.0001537·T²
4. Eccentricity: e = 0.016708634 - 0.000042037·T - 0.0000001267·T²
5. Equation of center: C = (1.914602 - 0.004817·T)·sin(M) + (0.019993)·sin(2M) + ...
6. True longitude: ☉ = L₀ + C
7. Apply nutation correction: Δψ (small, ~±17")
8. Apply aberration: -20.4898" / R (R = distance in AU)
9. Result: Apparent longitude = ☉ + Δψ + aberration
```

### Moon Position (Meeus Ch. 47)

The Moon is the most complex due to:
- Strong solar perturbations
- Evection, variation, annual equation
- Over 60 periodic terms for longitude alone

```
Key parameters:
- L' = Mean longitude of Moon
- D = Mean elongation (Moon from Sun)
- M = Sun's mean anomaly
- M' = Moon's mean anomaly
- F = Moon's argument of latitude

Longitude = L' + Σ(periodic terms involving sin of combinations of D, M, M', F)
```

### Planets (Meeus Ch. 36)

Each planet uses:
1. **Heliocentric position**: Planet's position relative to Sun (orbital elements + perturbations)
2. **Earth's heliocentric position**: From solar calculations
3. **Geocentric conversion**: Vector subtraction
4. **Coordinate transformation**: Heliocentric rectangular → Geocentric ecliptic

```
For each planet:
L = Mean longitude (polynomial in T)
a = Semi-major axis
e = Eccentricity (polynomial in T)
i = Inclination (polynomial in T)
Ω = Longitude of ascending node (polynomial in T)
ω̃ = Longitude of perihelion (polynomial in T)

+ Periodic perturbation terms (planet-specific)
```

### Lunar Nodes (Meeus Ch. 47)

**Mean Node** (smooth, no oscillations):
```
Ω = 125.0445479° - 1934.1362891°·T + 0.0020754°·T² + ...
```

**True Node** (with nutation):
```
True Ω = Mean Ω + nutation corrections
```

The True Node can appear to move backward briefly due to oscillations.

---

## Edge Cases & Quirks

### 1. Retrograde Motion

**What**: Planets appear to move backward (decreasing longitude)

**Detection**: `longitudeSpeed < 0`

**Quirk**: Mercury/Venus retrograde differently than Mars+ (inferior vs superior planets)

**Testing**: Verify retrograde periods match published ephemeris dates

### 2. Stationary Points

**What**: Moment when apparent motion is zero (switching direct ↔ retrograde)

**Detection**: `|longitudeSpeed| < 0.0001°/day` (threshold depends on planet)

**Edge case**: Very close to exact station, speed might flip sign between calculations

### 3. Longitude Wraparound

**What**: Longitude crossing 360° → 0°

**Edge case**: Speed calculation when yesterday=359°, today=1° → naive diff = -358°, correct = +2°

**Solution**:
```typescript
let diff = today - yesterday;
if (diff > 180) diff -= 360;
if (diff < -180) diff += 360;
```

### 4. Pluto's Eccentric Orbit

**What**: Pluto's orbit is highly elliptical and inclined

**Edge case**: Sometimes inside Neptune's orbit (1979-1999)

**Impact**: Simplified formulas less accurate for Pluto (±2' vs ±1' for others)

### 5. Moon's Extreme Speed

**What**: Moon moves ~13°/day (vs Sun's ~1°/day)

**Edge case**: For precise timing (exact aspects), Moon position changes significantly within hours

**Solution**: Time parameter must be precise to hours/minutes for Moon work

### 6. Nutation

**What**: Small periodic wobble in Earth's axis

**Impact**: Affects apparent positions by up to ±17"

**For simplified**: Can be omitted (error < 0.3')

**For full precision**: Must include nutation in longitude (Δψ) and obliquity (Δε)

### 7. Aberration

**What**: Apparent shift due to Earth's orbital velocity + finite speed of light

**Impact**: Up to ~20" for Sun, varies by planet distance

**For simplified**: Use constant -20.5" for Sun, omit for planets (error < 0.5')

### 8. Light-Time Correction

**What**: We see planets where they *were*, not where they *are*

**Impact**: For outer planets, light travel time can be 4+ hours

**For simplified**: Usually omitted (error < 1' for inner planets, up to 2' for outer)

### 9. Polar Coordinates Singularity

**What**: When latitude = ±90°, longitude is undefined

**For planets**: Never happens (all planets near ecliptic plane)

**For Moon**: Can reach ±5° latitude, no singularity issues

### 10. Date Range Validity

**What**: Polynomial approximations diverge outside their fitted range

**Meeus formulas**: Accurate 1800-2200 CE, degrading outside

**Moshier/VSOP87**: Accurate -4000 to +8000 CE

**For astrology**: 1800-2200 covers virtually all use cases

---

## Verification Strategy

### Primary Source: JPL Horizons

**URL**: https://ssd.jpl.nasa.gov/horizons/

**Why**: NASA's authoritative ephemeris, used for spacecraft navigation

**How to use**:
1. Select target body (e.g., "Sun", "Moon", "Mars")
2. Observer: "Geocentric" (code 500)
3. Time: Specific dates for test cases
4. Output: "Observer table" → check "Ecliptic longitude & latitude"
5. Coordinate system: "Mean ecliptic of date" (matches tropical astrology)

### Test Cases (Must Pass)

#### J2000.0 Epoch (Jan 1, 2000, 12:00 TT)
| Body | Expected Longitude | Source |
|------|-------------------|--------|
| Sun | 280.458° | JPL Horizons |
| Moon | 218.318° | JPL Horizons |
| Mercury | 271.951° | JPL Horizons |
| Venus | 240.598° | JPL Horizons |
| Mars | 355.433° | JPL Horizons |
| Jupiter | 34.351° | JPL Horizons |
| Saturn | 40.088° | JPL Horizons |

#### Meeus Example (Oct 13, 1992, 00:00 TD)
| Body | Expected Longitude | Source |
|------|-------------------|--------|
| Venus | 217°24'40" (217.411°) | Meeus Ch. 25, Example 25.a |

#### Historical Date (Jul 20, 1969, 20:17 UTC - Apollo 11)
| Body | Expected Longitude | Source |
|------|-------------------|--------|
| Sun | ~118° (Leo) | JPL Horizons |
| Moon | ~350° (Pisces) | JPL Horizons |

#### Recent Date (Dec 21, 2020, 18:20 UTC - Great Conjunction)
| Body | Expected Longitude | Source |
|------|-------------------|--------|
| Jupiter | ~300.3° | JPL Horizons |
| Saturn | ~300.3° | JPL Horizons |
*(They were within 0.1° of each other)*

### Secondary Verification

1. **Astro.com**: Free online chart calculation using Swiss Ephemeris
2. **Swiss Ephemeris test page**: https://www.astro.com/swisseph/
3. **Stellarium**: Open-source planetarium software

### Automated Testing

```typescript
describe('Sun position', () => {
  it('should match JPL Horizons for J2000.0', () => {
    const jd = 2451545.0; // J2000.0
    const sun = getSunPosition(jd);
    expect(sun.longitude).toBeCloseTo(280.458, 2); // ±0.01° = ±0.6'
  });
});
```

**Tolerance**: For simplified implementation, accept ±2 arcminutes (0.033°)

---

## File Structure

```
src/ephemeris/
├── index.ts                    # Public API exports
├── types.ts                    # PlanetPosition, Planet enum, options
├── constants.ts                # Orbital elements, coefficients
│
├── sun.ts                      # Sun position calculation
├── sun.test.ts
│
├── moon.ts                     # Moon position calculation
├── moon.test.ts
│
├── planets/
│   ├── index.ts                # Planet calculations barrel export
│   ├── mercury.ts
│   ├── mercury.test.ts
│   ├── venus.ts
│   ├── venus.test.ts
│   ├── mars.ts
│   ├── mars.test.ts
│   ├── jupiter.ts
│   ├── jupiter.test.ts
│   ├── saturn.ts
│   ├── saturn.test.ts
│   ├── uranus.ts
│   ├── uranus.test.ts
│   ├── neptune.ts
│   ├── neptune.test.ts
│   └── pluto.ts
│   └── pluto.test.ts
│
├── lunar-nodes.ts              # Mean and True lunar nodes
├── lunar-nodes.test.ts
│
├── utils/
│   ├── coordinates.ts          # Heliocentric → Geocentric conversions
│   ├── kepler.ts               # Kepler equation solver
│   ├── nutation.ts             # Nutation corrections (optional)
│   └── vsop-helpers.ts         # Trigonometric series evaluation
│
├── ephemeris.ts                # Main unified API
└── ephemeris.test.ts           # Integration tests
```

---

## API Design

### Primary Function

```typescript
import { getPlanetPosition, Planet } from 'celestine/ephemeris';

// Get single planet position
const mars = getPlanetPosition(Planet.Mars, julianDate);
// Returns: { longitude: 45.123, latitude: 1.2, distance: 1.5, longitudeSpeed: 0.5, isRetrograde: false }

// With options
const mars = getPlanetPosition(Planet.Mars, julianDate, {
  includeSpeed: true,      // Calculate daily motion (default: true)
  includeNutation: false,  // Apply nutation correction (default: false for simplified)
});
```

### Bulk Calculation

```typescript
import { getAllPositions, Planet } from 'celestine/ephemeris';

// Get all planets at once (more efficient)
const positions = getAllPositions(julianDate);
// Returns: Map<Planet, PlanetPosition>

// Or specific subset
const positions = getAllPositions(julianDate, [Planet.Sun, Planet.Moon, Planet.Mars]);
```

### Individual Body Functions (Advanced)

```typescript
import { getSunPosition } from 'celestine/ephemeris/sun';
import { getMoonPosition } from 'celestine/ephemeris/moon';
import { getMarsPosition } from 'celestine/ephemeris/planets/mars';
import { getLunarNode } from 'celestine/ephemeris/lunar-nodes';

const sun = getSunPosition(jd);
const moon = getMoonPosition(jd);
const mars = getMarsPosition(jd);
const northNode = getLunarNode(jd, 'mean'); // or 'true'
```

### Type Definitions

```typescript
// types.ts

export enum Planet {
  Sun = 'Sun',
  Moon = 'Moon',
  Mercury = 'Mercury',
  Venus = 'Venus',
  Mars = 'Mars',
  Jupiter = 'Jupiter',
  Saturn = 'Saturn',
  Uranus = 'Uranus',
  Neptune = 'Neptune',
  Pluto = 'Pluto',
  NorthNode = 'NorthNode',
  SouthNode = 'SouthNode',
  Lilith = 'Lilith',      // Mean Black Moon
  Chiron = 'Chiron',      // Optional
}

export interface PlanetPosition {
  /** Ecliptic longitude in degrees (0-360) */
  longitude: number;

  /** Ecliptic latitude in degrees (-90 to +90) */
  latitude: number;

  /** Distance from Earth in AU */
  distance: number;

  /** Daily motion in degrees/day (negative = retrograde) */
  longitudeSpeed: number;

  /** True if planet is in retrograde motion */
  isRetrograde: boolean;
}

export interface EphemerisOptions {
  /** Include speed calculation (default: true) */
  includeSpeed?: boolean;

  /** Apply nutation correction for higher precision (default: false) */
  includeNutation?: boolean;

  /** Apply light-time correction (default: false) */
  includeLightTime?: boolean;

  /** Apply aberration correction (default: false for planets, true for Sun) */
  includeAberration?: boolean;
}
```

---

## Implementation Order

### Phase 1: Foundation
1. `types.ts` - Type definitions
2. `constants.ts` - J2000.0 orbital elements, polynomial coefficients
3. `utils/kepler.ts` - Kepler equation solver (eccentric anomaly from mean anomaly)

### Phase 2: Sun & Moon
4. `sun.ts` + tests - Highest priority, foundation for everything
5. `moon.ts` + tests - Complex but critical

### Phase 3: Classical Planets
6. Inner planets: `mercury.ts`, `venus.ts`
7. Outer planets: `mars.ts`, `jupiter.ts`, `saturn.ts`
8. Each with colocated tests

### Phase 4: Modern Planets & Points
9. `uranus.ts`, `neptune.ts`, `pluto.ts`
10. `lunar-nodes.ts` - Mean and True nodes
11. `lilith.ts` - Mean lunar apogee (optional)

### Phase 5: Unified API
12. `ephemeris.ts` - Main API wrapping all individual functions
13. `index.ts` - Public exports

---

## What Full Precision Requires

To upgrade from arcminute to arcsecond accuracy:

### 1. More Trigonometric Terms
- Simplified Sun: ~10 terms
- Full VSOP87 Sun: ~1,000 terms
- Simplified Moon: ~60 terms
- Full ELP2000 Moon: ~3,000 terms

### 2. Nutation Model
- Full IAU 2000A nutation: 678 terms
- Simplified: 2-5 dominant terms

### 3. Aberration
- Stellar aberration: constant ~20.5"
- Planetary aberration: depends on distance, requires iteration

### 4. Light-Time Correction
- Iterative calculation: compute planet position, determine light travel time, re-compute for earlier time

### 5. Reference Frame
- FK5 corrections for J2000.0 frame alignment
- Frame bias between ICRS and mean equator

### 6. Relativistic Effects
- For sub-arcsecond: general relativity corrections
- Solar gravitational deflection of light

**Data source for full precision**: The coefficient tables in `.references/swisseph/planetary/swemptab.h` (10,640 lines) contain the Moshier/VSOP87 truncated series that achieve ~1" accuracy.

---

## Testing Approach

### Unit Tests (Per File)

```typescript
// sun.test.ts
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { getSunPosition } from './sun.js';

describe('Sun position', () => {
  it('J2000.0 epoch', () => {
    const pos = getSunPosition(2451545.0);
    assert.ok(Math.abs(pos.longitude - 280.458) < 0.05); // ±3 arcmin
  });

  it('handles date near year boundary', () => {
    const pos = getSunPosition(2451544.5); // Dec 31, 1999
    assert.ok(pos.longitude > 279 && pos.longitude < 281);
  });

  it('speed is approximately 1°/day', () => {
    const pos = getSunPosition(2451545.0);
    assert.ok(Math.abs(pos.longitudeSpeed - 1.0) < 0.1);
  });
});
```

### Integration Tests

```typescript
// ephemeris.test.ts
describe('Full chart positions', () => {
  it('Great Conjunction Dec 21, 2020', () => {
    const jd = /* Dec 21, 2020 18:20 UTC */;
    const jupiter = getPlanetPosition(Planet.Jupiter, jd);
    const saturn = getPlanetPosition(Planet.Saturn, jd);
    const separation = Math.abs(jupiter.longitude - saturn.longitude);
    assert.ok(separation < 0.2); // Within 0.2° of each other
  });
});
```

### Verification Script

```typescript
// scripts/verify-against-horizons.ts
// Manual verification helper - not automated (requires JPL web query)
```

### How to Get Test Data from JPL Horizons

**Step-by-step to extract verification values:**

1. Go to: https://ssd.jpl.nasa.gov/horizons/app.html
2. **Ephemeris Type**: Observer Table
3. **Target Body**: Select (e.g., "Sun [Sol]", "Moon [Luna]", "Mars")
4. **Observer Location**: Geocentric (select "@sun" then change to code `500` for Earth center)
5. **Time Specification**:
   - Start: `2000-Jan-01 12:00` (for J2000.0)
   - Stop: `2000-Jan-01 12:01`
   - Step: `1 minute`
6. **Table Settings**:
   - Check: "Observer ecliptic lon & lat" (columns 31,32)
   - Reference system: "Mean ecliptic and equinox of date"
7. Generate Ephemeris → Copy the longitude value

**Example output line:**
```
2000-Jan-01 12:00  280.4583  -0.0002  ...
                   ^^^^^^^^
                   Sun longitude = 280.4583°
```

**Pro tip**: For Moon, the position changes rapidly. Note the exact time when recording test values.

---

## References

### Primary Algorithm Source
- **Jean Meeus, "Astronomical Algorithms"** (2nd Ed., 1998, Willmann-Bell)
  - Chapter 25: Solar Coordinates
  - Chapter 36: Planetary Phenomena (positions)
  - Chapter 37: Pluto
  - Chapter 47: Position of the Moon
  - Appendix III: Periodic terms for planets

### Verification Sources
- **JPL Horizons**: https://ssd.jpl.nasa.gov/horizons/
- **Swiss Ephemeris**: https://www.astro.com/swisseph/
- **Astro.com**: https://www.astro.com/

### Reference Implementation
- `.references/swisseph/planetary/` - Swiss Ephemeris source code
- Particularly `swemplan.c` for algorithm structure

### Academic Papers
- VSOP87: Bretagnon & Francou (1988), Astronomy & Astrophysics
- ELP2000-85: Chapront-Touzé & Chapront (1988)

---

## Success Criteria

The ephemeris module is complete when:

1. ✅ All 10 main bodies calculate positions (Sun through Pluto)
2. ✅ Lunar nodes (mean) are calculated
3. ✅ All positions match JPL Horizons within ±2 arcminutes
4. ✅ Retrograde detection works correctly
5. ✅ API is clean and matches design above
6. ✅ All tests pass
7. ✅ TypeDoc documentation is complete

---

*Last updated: December 2024*
*For: Celestine Astronomical Library - Ephemeris Module*

