# Aspects Module Implementation Plan

A complete specification for implementing the Aspects module in Celestine. This document covers all definitions, calculations, edge cases, and validation strategies.

**Purpose:** Provide an exhaustive reference for implementing aspect calculations with 100% feature coverage and verified accuracy.

**Related:** See `KNOWLEDGE.md` Section 9 (Aspects: Angular Relationships) for foundational concepts.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Aspect Definitions](#2-aspect-definitions)
3. [Orb System](#3-orb-system)
4. [Core Calculations](#4-core-calculations)
5. [Applying vs Separating](#5-applying-vs-separating)
6. [Out-of-Sign Aspects](#6-out-of-sign-aspects)
7. [Aspect Patterns](#7-aspect-patterns)
8. [Edge Cases](#8-edge-cases)
9. [Type Definitions](#9-type-definitions)
10. [Module Structure](#10-module-structure)
11. [Test Strategy](#11-test-strategy)
12. [Reference Data](#12-reference-data)
13. [API Design](#13-api-design)
14. [Implementation Checklist](#14-implementation-checklist)

---

## 1. Overview

### What Aspects Are

**Aspects** are specific angular relationships between celestial bodies measured along the ecliptic. They represent how planetary energies interact and are fundamental to astrological interpretation.

### Why They Matter

- **Chart interpretation:** Aspects show how planets "communicate" with each other
- **Timing:** Transiting aspects indicate when events may manifest
- **Strength assessment:** Aspects modify how strongly a planet expresses

### Core Concept

The angular separation between two bodies is calculated as the shortest arc between them (0° to 180°). This separation is then compared against predefined aspect angles, with an allowable deviation called the **orb**.

```
aspect_found = |angle - aspect_angle| ≤ orb
```

---

## 2. Aspect Definitions

### 2.1 Major Aspects (Ptolemaic)

The five major aspects, established by Ptolemy in the 2nd century CE, are based on sign relationships:

| Aspect | Angle | Symbol | Nature | Sign Relationship |
|--------|-------|--------|--------|-------------------|
| **Conjunction** | 0° | ☌ | Fusion, intensification | Same sign |
| **Sextile** | 60° | ⚹ | Opportunity, support | 2 signs apart |
| **Square** | 90° | □ | Tension, challenge, action | 3 signs apart |
| **Trine** | 120° | △ | Harmony, ease, flow | 4 signs apart |
| **Opposition** | 180° | ☍ | Polarity, awareness, projection | 6 signs apart |

**Classification:**
- **Harmonious/Soft:** Trine (120°), Sextile (60°)
- **Dynamic/Hard:** Square (90°), Opposition (180°)
- **Neutral:** Conjunction (0°) — nature depends on planets involved

### 2.2 Minor Aspects

Minor aspects provide additional nuance. They have narrower orbs and are considered less influential than major aspects.

| Aspect | Angle | Symbol | Nature | Origin |
|--------|-------|--------|--------|--------|
| **Semi-sextile** | 30° | ⚺ | Mild friction, adjustment | 1/12 of circle |
| **Semi-square** | 45° | ∠ | Minor tension, irritation | 1/8 of circle (octile) |
| **Quintile** | 72° | Q | Creativity, talent, gifts | 1/5 of circle |
| **Sesquiquadrate** | 135° | ⚼ | Frustration, agitation | 3/8 of circle |
| **Biquintile** | 144° | bQ | Creative mastery | 2/5 of circle |
| **Quincunx** | 150° | ⚻ | Adjustment, discomfort, "blind spot" | 5/12 of circle |

**Kepler Aspects (Less Common):**

| Aspect | Angle | Symbol | Nature |
|--------|-------|--------|--------|
| **Septile** | 51.43° | S | Fate, karma, irrationality |
| **Novile** | 40° | N | Spiritual completion |
| **Decile** | 36° | D | Growth, skill |

### 2.3 Aspect Harmonic Series

Aspects derive from dividing the circle:

| Division | Angle | Aspect |
|----------|-------|--------|
| 1 | 360°/1 = 360° | (Full circle) |
| 2 | 360°/2 = 180° | Opposition |
| 3 | 360°/3 = 120° | Trine |
| 4 | 360°/4 = 90° | Square |
| 5 | 360°/5 = 72° | Quintile |
| 6 | 360°/6 = 60° | Sextile |
| 8 | 360°/8 = 45° | Semi-square |
| 12 | 360°/12 = 30° | Semi-sextile |

---

## 3. Orb System

### 3.1 What Is an Orb?

The **orb** is the maximum allowable deviation from exactness for an aspect to be considered active. An "exact" square is 90°; with a 7° orb, any separation from 83° to 97° qualifies as a square.

### 3.2 Standard Orb Values

Different traditions use different orbs. Here are common defaults:

#### Default Orbs by Aspect Type

| Aspect | Typical Orb | Tight Orb | Wide Orb |
|--------|-------------|-----------|----------|
| Conjunction | 8° | 6° | 10° |
| Opposition | 8° | 6° | 10° |
| Trine | 8° | 6° | 10° |
| Square | 7° | 5° | 8° |
| Sextile | 6° | 4° | 7° |
| Semi-sextile | 2° | 1° | 3° |
| Quincunx | 3° | 2° | 4° |
| Semi-square | 2° | 1° | 3° |
| Sesquiquadrate | 2° | 1° | 3° |
| Quintile | 2° | 1° | 3° |
| Biquintile | 2° | 1° | 3° |

#### Orb Modifications by Body

The **luminaries** (Sun and Moon) traditionally receive wider orbs due to their prominence:

| Body | Orb Modifier |
|------|-------------|
| Sun | +2° |
| Moon | +2° |
| Personal planets (Mercury-Mars) | ±0° |
| Social planets (Jupiter-Saturn) | ±0° |
| Outer planets (Uranus-Pluto) | -1° to -2° |
| Asteroids, Chiron | -2° |
| Angles (ASC, MC) | +1° to +2° |

**Calculation:** When two bodies form an aspect, use the average of their individual orb modifiers, or use the wider orb, depending on tradition.

### 3.3 Moiety System (Traditional)

In traditional astrology, each planet has a "moiety" (half-orb). The aspect orb is the sum of both planets' moieties.

| Planet | Moiety |
|--------|--------|
| Sun | 8°30' |
| Moon | 6°00' |
| Mercury | 3°30' |
| Venus | 4°00' |
| Mars | 4°00' |
| Jupiter | 5°30' |
| Saturn | 5°00' |

**Example:** Sun-Mars aspect orb = 8°30' + 4°00' = 12°30'

### 3.4 Orb Strength (Exactness)

The closer an aspect is to exact, the stronger its influence. We can express this as a percentage:

```
strength = 100 - (deviation / orb × 100)
```

**Example:** A square at 88° (2° from exact 90°) with 7° orb:
```
strength = 100 - (2 / 7 × 100) = 71.4%
```

---

## 4. Core Calculations

### 4.1 Angular Separation

Calculate the shortest arc between two ecliptic longitudes:

```typescript
function angularSeparation(lon1: number, lon2: number): number {
  // Normalize both to 0-360
  lon1 = ((lon1 % 360) + 360) % 360;
  lon2 = ((lon2 % 360) + 360) % 360;

  // Calculate raw difference
  let diff = Math.abs(lon1 - lon2);

  // Take shortest arc (always 0-180)
  if (diff > 180) {
    diff = 360 - diff;
  }

  return diff;
}
```

### 4.2 Aspect Detection

Check if a separation falls within orb of any defined aspect:

```typescript
function findAspect(
  separation: number,
  aspectAngle: number,
  orb: number
): { found: boolean; deviation: number } {
  const deviation = Math.abs(separation - aspectAngle);
  return {
    found: deviation <= orb,
    deviation: deviation
  };
}
```

### 4.3 Signed Angle (For Applying/Separating)

To determine direction, we need the signed angle from body1 to body2:

```typescript
function signedAngle(lon1: number, lon2: number): number {
  // Normalize
  lon1 = ((lon1 % 360) + 360) % 360;
  lon2 = ((lon2 % 360) + 360) % 360;

  let diff = lon2 - lon1;

  // Normalize to -180 to +180
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  return diff;
}
```

### 4.4 Precision Considerations

- **Minimum precision:** 1 arcminute (1/60°) for astrological purposes
- **Internal precision:** Use full floating-point throughout
- **Display precision:** Degrees and minutes, optionally seconds
- **Comparison tolerance:** Use small epsilon (1e-10) for "exact" comparisons

---

## 5. Applying vs Separating

### 5.1 Definition

- **Applying:** The aspect is getting tighter (bodies moving toward exact)
- **Separating:** The aspect is getting wider (bodies moving apart)
- **Stationary:** The aspect is at its tightest point

### 5.2 Astrological Significance

- **Applying aspects** are considered stronger — the influence is building
- **Separating aspects** are considered weaker — the influence is waning
- Traditional rule: "Applying aspects promise; separating aspects have delivered"

### 5.3 Calculation Method

Determine whether the separation is increasing or decreasing over time using the planets' speeds:

```typescript
function isApplying(
  lon1: number, lon2: number,
  speed1: number, speed2: number,
  aspectAngle: number
): boolean {
  // Current separation
  const currentSep = angularSeparation(lon1, lon2);

  // Future separation (1 day later)
  const futureLon1 = lon1 + speed1;
  const futureLon2 = lon2 + speed2;
  const futureSep = angularSeparation(futureLon1, futureLon2);

  // Calculate how separation relates to aspect angle
  const currentDev = Math.abs(currentSep - aspectAngle);
  const futureDev = Math.abs(futureSep - aspectAngle);

  // Applying if deviation is decreasing
  return futureDev < currentDev;
}
```

### 5.4 Edge Cases for Applying/Separating

1. **Retrograde motion:** A normally faster planet going retrograde can reverse applying/separating
2. **Station points:** At stations (speed ≈ 0), aspect may be neither applying nor separating
3. **Mutual reception by speed:** Both planets moving same direction at similar speeds

---

## 6. Out-of-Sign Aspects

### 6.1 Definition

An **out-of-sign aspect** (also called "dissociate" aspect) occurs when two planets form an aspect by degree but are NOT in signs that traditionally form that aspect.

### 6.2 Examples

**Normal trine (in-sign):**
- Venus at 15° Aries (Fire)
- Mars at 18° Leo (Fire)
- Separation: 123° ≈ 120° = Trine ✓
- Signs: Fire-Fire = trine relationship ✓

**Out-of-sign trine:**
- Venus at 28° Aries (Fire)
- Mars at 2° Virgo (Earth)
- Separation: 124° ≈ 120° = Trine ✓
- Signs: Fire-Earth = NOT trine relationship ✗

### 6.3 Implementation

```typescript
interface AspectInfo {
  type: AspectType;
  angle: number;
  deviation: number;
  orb: number;
  strength: number;
  isApplying: boolean;
  isOutOfSign: boolean;  // Important flag
}

function isOutOfSign(
  lon1: number,
  lon2: number,
  aspectType: AspectType
): boolean {
  const sign1 = Math.floor(lon1 / 30);
  const sign2 = Math.floor(lon2 / 30);
  const signDiff = ((sign2 - sign1) % 12 + 12) % 12;

  // Expected sign differences for each aspect
  const expectedSignDiffs: Record<AspectType, number[]> = {
    conjunction: [0],
    sextile: [2, 10],
    square: [3, 9],
    trine: [4, 8],
    opposition: [6],
    semisextile: [1, 11],
    quincunx: [5, 7],
    // etc.
  };

  return !expectedSignDiffs[aspectType].includes(signDiff);
}
```

### 6.4 Handling

Out-of-sign aspects should:
1. Still be detected and reported
2. Be flagged with `isOutOfSign: true`
3. Optionally have reduced strength (configurable)
4. Be filterable in output (user may want to ignore them)

---

## 7. Aspect Patterns

### 7.1 Overview

Aspect patterns are configurations of three or more planets forming interconnected aspects. They have special interpretive significance.

### 7.2 Major Patterns

| Pattern | Structure | Aspects Involved |
|---------|-----------|------------------|
| **T-Square** | 3 planets | 2 squares + 1 opposition |
| **Grand Trine** | 3 planets | 3 trines (120° each) |
| **Grand Cross** | 4 planets | 4 squares + 2 oppositions |
| **Yod** (Finger of God) | 3 planets | 2 quincunxes + 1 sextile |
| **Kite** | 4 planets | Grand Trine + 1 opposition |
| **Mystic Rectangle** | 4 planets | 2 trines + 2 sextiles + 2 oppositions |
| **Stellium** | 3+ planets | All conjunct (within ~10°) |

### 7.3 Pattern Detection Algorithm

```typescript
function detectTSquare(aspects: Aspect[]): TSquare | null {
  // Find oppositions
  const oppositions = aspects.filter(a => a.type === 'opposition');

  for (const opp of oppositions) {
    // Find squares from each end of the opposition
    const squaresFromP1 = aspects.filter(a =>
      a.type === 'square' &&
      (a.body1 === opp.body1 || a.body2 === opp.body1)
    );
    const squaresFromP2 = aspects.filter(a =>
      a.type === 'square' &&
      (a.body1 === opp.body2 || a.body2 === opp.body2)
    );

    // Find common apex planet
    for (const sq1 of squaresFromP1) {
      for (const sq2 of squaresFromP2) {
        const apex1 = sq1.body1 === opp.body1 ? sq1.body2 : sq1.body1;
        const apex2 = sq2.body1 === opp.body2 ? sq2.body2 : sq2.body1;

        if (apex1 === apex2) {
          return {
            type: 'T-Square',
            apex: apex1,
            opposition: [opp.body1, opp.body2],
            aspects: [opp, sq1, sq2]
          };
        }
      }
    }
  }
  return null;
}
```

### 7.4 Pattern Priority

When reporting patterns, prioritize:
1. Grand Cross (rarest, most significant)
2. Grand Trine
3. T-Square
4. Yod
5. Stellium
6. Other patterns

---

## 8. Edge Cases

### 8.1 Zero-Degree Conjunction

When two bodies have identical longitudes:
- Separation = 0.0°
- This is an **exact conjunction**
- Handle floating-point comparison carefully

```typescript
const EXACT_THRESHOLD = 0.0001; // ~0.36 arcseconds
if (separation < EXACT_THRESHOLD) {
  // Treat as exact
}
```

### 8.2 180° Boundary

Opposition at exactly 180°:
- `angularSeparation(0, 180) = 180`
- `angularSeparation(180, 360) = 180`
- Both should work correctly

### 8.3 Zodiac Boundary (0°/360°)

Bodies near 0° Aries require careful handling:
- Sun at 359° (29° Pisces)
- Moon at 2° (2° Aries)
- Separation should be 3°, not 357°

```typescript
// This is handled by taking min(diff, 360-diff)
angularSeparation(359, 2); // Returns 3, not 357 ✓
```

### 8.4 Same Planet

Self-aspects should be filtered:
```typescript
if (body1 === body2) {
  return null; // No self-aspects
}
```

### 8.5 Multiple Aspects Between Same Pair

With wide orbs, two bodies might be "in orb" of multiple aspects:
- Sun at 45° and Moon at 90° = 45° separation
- This is within orb of both semi-square (45°) and sextile (60°, if 15° orb)

**Resolution:** Report only the closest aspect, or report all with flags.

### 8.6 Stationary Planets

When a planet is stationary (speed ≈ 0):
- Applying/separating calculation may be unreliable
- Consider the aspect "held" or "fixed"

```typescript
const STATION_THRESHOLD = 0.01; // degrees/day
const isStationary = Math.abs(speed) < STATION_THRESHOLD;
```

### 8.7 Retrograde Aspects

When one or both planets are retrograde:
- Applying/separating logic reverses
- The formula in Section 5.3 handles this naturally

### 8.8 Void of Course Moon

Not directly an aspect calculation, but related:
- Moon is "void of course" when it makes no more applying aspects before leaving its sign
- Implementation requires checking all potential aspects to remaining sign degrees

---

## 9. Type Definitions

### 9.1 Aspect Type Enum

```typescript
/**
 * All supported aspect types
 */
export enum AspectType {
  // Major (Ptolemaic)
  Conjunction = 'conjunction',
  Sextile = 'sextile',
  Square = 'square',
  Trine = 'trine',
  Opposition = 'opposition',

  // Minor
  SemiSextile = 'semi-sextile',
  SemiSquare = 'semi-square',
  Quintile = 'quintile',
  Sesquiquadrate = 'sesquiquadrate',
  Biquintile = 'biquintile',
  Quincunx = 'quincunx',
}
```

### 9.2 Aspect Definition

```typescript
/**
 * Definition of an aspect type (angle and default orb)
 */
export interface AspectDefinition {
  /** The aspect type */
  type: AspectType;

  /** Exact angle in degrees */
  angle: number;

  /** Unicode symbol for the aspect */
  symbol: string;

  /** Default orb in degrees */
  defaultOrb: number;

  /** Classification: major or minor */
  classification: 'major' | 'minor';

  /** Nature: harmonious, dynamic, or neutral */
  nature: 'harmonious' | 'dynamic' | 'neutral';
}
```

### 9.3 Aspect Result

```typescript
/**
 * A detected aspect between two celestial bodies
 */
export interface Aspect {
  /** First body in the aspect */
  body1: CelestialBody;

  /** Second body in the aspect */
  body2: CelestialBody;

  /** Type of aspect */
  type: AspectType;

  /** Exact angle for this aspect type (e.g., 90 for square) */
  angle: number;

  /** Actual angular separation between the bodies */
  separation: number;

  /** Deviation from exact (always positive) */
  deviation: number;

  /** Orb used for this detection */
  orb: number;

  /** Aspect strength as percentage (100 = exact) */
  strength: number;

  /** Whether the aspect is applying (getting tighter) */
  isApplying: boolean;

  /** Whether this is an out-of-sign aspect */
  isOutOfSign: boolean;

  /** The aspect symbol */
  symbol: string;
}
```

### 9.4 Aspect Configuration

```typescript
/**
 * Configuration options for aspect calculations
 */
export interface AspectConfig {
  /** Which aspect types to detect */
  aspectTypes?: AspectType[];

  /** Custom orbs per aspect type (overrides defaults) */
  orbs?: Partial<Record<AspectType, number>>;

  /** Orb modifier per body type */
  bodyOrbModifiers?: Partial<Record<CelestialBody, number>>;

  /** Whether to detect out-of-sign aspects */
  includeOutOfSign?: boolean;

  /** Strength reduction for out-of-sign aspects (0-1) */
  outOfSignPenalty?: number;

  /** Minimum strength to report (0-100) */
  minimumStrength?: number;

  /** Whether to include applying/separating info (requires speeds) */
  includeApplying?: boolean;
}
```

### 9.5 Aspect Pattern Types

```typescript
/**
 * Types of aspect patterns
 */
export enum PatternType {
  TSquare = 'T-Square',
  GrandTrine = 'Grand Trine',
  GrandCross = 'Grand Cross',
  Yod = 'Yod',
  Kite = 'Kite',
  MysticRectangle = 'Mystic Rectangle',
  Stellium = 'Stellium',
}

/**
 * A detected aspect pattern
 */
export interface AspectPattern {
  type: PatternType;
  bodies: CelestialBody[];
  aspects: Aspect[];
  description: string;
}
```

---

## 10. Module Structure

### 10.1 File Organization

```
src/aspects/
├── index.ts                    # Public API exports
├── types.ts                    # Type definitions
├── constants.ts                # Aspect definitions, default orbs
├── constants.test.ts           # Constant validation tests
├── angular-separation.ts       # Core angle calculation
├── angular-separation.test.ts  # Angle calculation tests
├── aspect-detection.ts         # Aspect finding logic
├── aspect-detection.test.ts    # Detection tests with reference data
├── applying-separating.ts      # Applying/separating calculation
├── applying-separating.test.ts # A/S tests
├── out-of-sign.ts              # Out-of-sign detection
├── out-of-sign.test.ts         # OOS tests
├── orbs.ts                     # Orb calculation and configuration
├── orbs.test.ts                # Orb tests
├── patterns.ts                 # Aspect pattern detection
├── patterns.test.ts            # Pattern tests
├── aspects.ts                  # Main unified API
└── aspects.test.ts             # Integration tests with real chart data
```

### 10.2 Dependency Graph

```
types.ts ← constants.ts ← angular-separation.ts
                             ↓
                        aspect-detection.ts ← orbs.ts
                             ↓
                     applying-separating.ts
                             ↓
                        out-of-sign.ts
                             ↓
                         patterns.ts
                             ↓
                         aspects.ts (unified API)
                             ↓
                          index.ts
```

---

## 11. Test Strategy

### 11.1 Reference Data Sources

All tests MUST use externally sourced reference data. Sources:

1. **Swiss Ephemeris:** Gold standard for planetary positions
2. **Astro.com:** Chart calculation reference
3. **Solar Fire:** Professional astrology software
4. **JPL Horizons:** NASA planetary data

### 11.2 Test Categories

#### Constants Tests
```typescript
describe('Aspect Constants', () => {
  it('should have correct angles for all major aspects', () => {
    expect(ASPECTS.conjunction.angle).toBe(0);
    expect(ASPECTS.sextile.angle).toBe(60);
    expect(ASPECTS.square.angle).toBe(90);
    expect(ASPECTS.trine.angle).toBe(120);
    expect(ASPECTS.opposition.angle).toBe(180);
  });

  it('should have symbols for all aspects', () => {
    expect(ASPECTS.conjunction.symbol).toBe('☌');
    expect(ASPECTS.opposition.symbol).toBe('☍');
    // etc.
  });
});
```

#### Angular Separation Tests
```typescript
describe('Angular Separation', () => {
  // Basic cases
  it('should calculate 0° for same position', () => {
    expect(angularSeparation(45, 45)).toBe(0);
  });

  it('should calculate 90° for square', () => {
    expect(angularSeparation(0, 90)).toBe(90);
  });

  // Wraparound cases
  it('should handle 360° boundary', () => {
    expect(angularSeparation(350, 10)).toBe(20);
    expect(angularSeparation(359, 1)).toBe(2);
  });

  // Always return shortest arc
  it('should always return value ≤ 180', () => {
    expect(angularSeparation(0, 270)).toBe(90); // Not 270
    expect(angularSeparation(10, 200)).toBe(170); // Not 190
  });
});
```

#### Reference Data Tests (CRITICAL)
```typescript
/**
 * AUTHORITATIVE REFERENCE DATA
 * Source: Astro.com chart calculation for J2000.0 epoch
 * DO NOT MODIFY these values - they are ground truth
 */
const ASTROCOM_J2000_ASPECTS = [
  {
    body1: 'Sun',
    body2: 'Mercury',
    separation: 22.87,  // degrees
    description: 'J2000.0 Sun-Mercury separation'
  },
  {
    body1: 'Sun',
    body2: 'Venus',
    separation: 49.33,
    description: 'J2000.0 Sun-Venus separation'
  },
  // ... more reference data
] as const;

describe('Reference Data Validation', () => {
  for (const ref of ASTROCOM_J2000_ASPECTS) {
    it(`should match Astro.com for ${ref.description}`, () => {
      const sunPos = getSunPosition(J2000_EPOCH);
      const otherPos = getPosition(ref.body2, J2000_EPOCH);
      const separation = angularSeparation(sunPos.longitude, otherPos.longitude);

      expect(Math.abs(separation - ref.separation)).toBeLessThan(0.1);
    });
  }
});
```

### 11.3 Edge Case Tests

```typescript
describe('Edge Cases', () => {
  describe('Zero separation', () => {
    it('should detect exact conjunction', () => {
      const result = findAspect(0, 0, 10);
      expect(result.found).toBe(true);
      expect(result.deviation).toBe(0);
    });
  });

  describe('180° boundary', () => {
    it('should detect opposition at exactly 180°', () => {
      const result = findAspect(180, 180, 8);
      expect(result.found).toBe(true);
    });
  });

  describe('Multiple potential aspects', () => {
    it('should return closest aspect when separation matches multiple', () => {
      // 47° is within orb of both semi-square (45°) and sextile (60°) with wide orbs
      const aspects = findAllAspects(47, { semiSquareOrb: 5, sextileOrb: 15 });
      expect(aspects[0].type).toBe('semi-square'); // Closer
    });
  });
});
```

### 11.4 Real Chart Tests

Use complete birth charts with known aspects:

```typescript
/**
 * Celebrity Chart Reference Data
 * Source: Astrodatabank (AA-rated data)
 */
const EINSTEIN_CHART = {
  birthDate: { year: 1879, month: 3, day: 14, hour: 11, minute: 30 },
  location: { latitude: 48.4, longitude: 10.0 }, // Ulm, Germany
  knownAspects: [
    { body1: 'Sun', body2: 'Saturn', type: 'conjunction', orb: 4.5 },
    { body1: 'Moon', body2: 'Jupiter', type: 'sextile', orb: 2.1 },
    // ... verified aspects from Astrodatabank
  ]
};

describe('Real Chart Validation', () => {
  it('should find known aspects in Einstein chart', () => {
    const positions = calculatePositions(EINSTEIN_CHART.birthDate);
    const aspects = findAllAspects(positions);

    for (const known of EINSTEIN_CHART.knownAspects) {
      const found = aspects.find(a =>
        a.body1 === known.body1 &&
        a.body2 === known.body2 &&
        a.type === known.type
      );
      expect(found).toBeDefined();
      expect(found!.deviation).toBeCloseTo(known.orb, 0.5);
    }
  });
});
```

---

## 12. Reference Data

### 12.1 J2000.0 Epoch Reference

Planetary positions at J2000.0 (Jan 1, 2000, 12:00 TT):

| Body | Longitude | Speed (°/day) |
|------|-----------|---------------|
| Sun | 280.459° | +1.0194 |
| Moon | 223.32° | +13.18 |
| Mercury | 271.78° | +1.29 |
| Venus | 241.13° | +1.24 |
| Mars | 355.47° | +0.52 |
| Jupiter | 34.28° | +0.083 |
| Saturn | 40.38° | +0.033 |
| Uranus | 314.90° | +0.012 |
| Neptune | 303.24° | +0.006 |
| Pluto | 251.26° | +0.004 |

### 12.2 Known Aspects at J2000.0

| Body 1 | Body 2 | Separation | Aspect | Deviation |
|--------|--------|------------|--------|-----------|
| Sun | Mercury | 8.68° | Conjunction | 8.68° |
| Sun | Venus | 39.33° | — | — |
| Sun | Saturn | 119.92° | Trine | 0.08° |
| Mercury | Venus | 30.65° | Semi-sextile | 0.65° |
| Jupiter | Saturn | 6.10° | Conjunction | 6.10° |
| Uranus | Neptune | 11.66° | — | — |

### 12.3 Historical Chart: Einstein

Albert Einstein - March 14, 1879, 11:30 LMT, Ulm, Germany

Key aspects (source: Astrodatabank):
- Sun conjunct Saturn (4°26')
- Sun conjunct Mercury (5°08')
- Moon sextile Jupiter (2°08')
- Venus square Saturn (0°33')
- Mars square Uranus (0°08')

---

## 13. API Design

### 13.1 Core Functions

```typescript
/**
 * Calculate angular separation between two ecliptic longitudes.
 * Always returns the shortest arc (0-180°).
 */
export function angularSeparation(lon1: number, lon2: number): number;

/**
 * Find aspects between two planetary positions.
 */
export function findAspectsBetween(
  body1: { longitude: number; speed?: number },
  body2: { longitude: number; speed?: number },
  config?: AspectConfig
): Aspect[];

/**
 * Find all aspects in a set of planetary positions.
 */
export function findAllAspects(
  positions: Map<CelestialBody, PlanetPosition>,
  config?: AspectConfig
): Aspect[];

/**
 * Find aspect patterns in a list of aspects.
 */
export function findPatterns(aspects: Aspect[]): AspectPattern[];
```

### 13.2 Utility Functions

```typescript
/**
 * Get the default orb for an aspect type.
 */
export function getDefaultOrb(aspectType: AspectType): number;

/**
 * Calculate aspect strength (100 = exact).
 */
export function calculateStrength(deviation: number, orb: number): number;

/**
 * Check if an aspect is out-of-sign.
 */
export function isOutOfSign(
  lon1: number,
  lon2: number,
  aspectType: AspectType
): boolean;

/**
 * Get aspect symbol.
 */
export function getAspectSymbol(aspectType: AspectType): string;

/**
 * Get aspect name.
 */
export function getAspectName(aspectType: AspectType): string;

/**
 * Format aspect for display.
 */
export function formatAspect(aspect: Aspect): string;
```

### 13.3 Configuration

```typescript
/**
 * Default configuration.
 */
export const DEFAULT_ASPECT_CONFIG: AspectConfig = {
  aspectTypes: [
    AspectType.Conjunction,
    AspectType.Sextile,
    AspectType.Square,
    AspectType.Trine,
    AspectType.Opposition,
  ],
  orbs: {
    conjunction: 8,
    sextile: 6,
    square: 7,
    trine: 8,
    opposition: 8,
  },
  includeOutOfSign: true,
  outOfSignPenalty: 0.2, // 20% strength reduction
  minimumStrength: 0,
  includeApplying: true,
};
```

### 13.4 Usage Examples

```typescript
import { findAllAspects, AspectType } from 'celestine';

// Get all positions at a specific time
const positions = ephemeris.getAllPositions(jd);

// Find all aspects with default config
const aspects = findAllAspects(positions);

// Find aspects with custom config
const majorOnly = findAllAspects(positions, {
  aspectTypes: [
    AspectType.Conjunction,
    AspectType.Opposition,
    AspectType.Trine,
    AspectType.Square,
    AspectType.Sextile
  ],
  minimumStrength: 50
});

// Format for display
for (const aspect of aspects) {
  console.log(formatAspect(aspect));
  // "Sun ☌ Mercury (8°41', 0.7%, separating)"
}

// Find patterns
const patterns = findPatterns(aspects);
for (const pattern of patterns) {
  console.log(`${pattern.type}: ${pattern.bodies.join(', ')}`);
}
```

---

## 14. Implementation Checklist

### Phase 1: Foundation
- [ ] Create `types.ts` with all type definitions
- [ ] Create `constants.ts` with aspect definitions and default orbs
- [ ] Write `constants.test.ts` validating all constants
- [ ] Create `angular-separation.ts` with core calculation
- [ ] Write `angular-separation.test.ts` with comprehensive tests

### Phase 2: Core Detection
- [ ] Create `orbs.ts` with orb handling logic
- [ ] Write `orbs.test.ts`
- [ ] Create `aspect-detection.ts` with detection algorithms
- [ ] Write `aspect-detection.test.ts` with reference data

### Phase 3: Advanced Features
- [ ] Create `applying-separating.ts`
- [ ] Write `applying-separating.test.ts`
- [ ] Create `out-of-sign.ts`
- [ ] Write `out-of-sign.test.ts`

### Phase 4: Patterns
- [ ] Create `patterns.ts` with pattern detection
- [ ] Write `patterns.test.ts`

### Phase 5: Integration
- [ ] Create `aspects.ts` unified API
- [ ] Write `aspects.test.ts` with real chart validation
- [ ] Create `index.ts` with public exports
- [ ] Update main `src/index.ts` to export aspects module

### Phase 6: Documentation
- [ ] Add JSDoc comments to all public APIs
- [ ] Update README.md with aspects documentation
- [ ] Generate TypeDoc documentation

---

## References (Consolidated)

### Authoritative Sources
| Source | URL | Use |
|--------|-----|-----|
| Swiss Ephemeris | https://www.astro.com/swisseph/ | Algorithm reference |
| Astro.com | https://www.astro.com/ | Chart validation |
| JPL Horizons | https://ssd.jpl.nasa.gov/horizons/ | Position validation |
| Astrodatabank | https://www.astro.com/astro-databank/ | Celebrity charts |

### Literature
- Ptolemy, "Tetrabiblos" — Original aspect doctrine
- Jean Meeus, "Astronomical Algorithms" — Calculations
- Robert Hand, "Horoscope Symbols" — Modern aspect interpretation
- William Lilly, "Christian Astrology" — Traditional orbs

### Online Resources
- Astrograph.com: Aspect orb tables
- Wikipedia: Astrological aspects
- Skyscript: Traditional astrology reference

---

*This document will be updated as implementation progresses.*

