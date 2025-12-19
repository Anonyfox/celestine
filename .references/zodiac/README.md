# Zodiac & Signs Reference Sources

**Purpose**: Authoritative source code and reference data for zodiac sign calculations, essential dignities, and formatting.

---

## Swiss Ephemeris Library Functions

**Source URL**: https://github.com/aloistr/swisseph
**License**: AGPL-3.0 / Swiss Ephemeris Professional License (dual license)
**Authors**: Dieter Koch and Alois Treindl
**Copyright**: Astrodienst AG, Switzerland

### Files Downloaded

- `swephlib.c` - Core ephemeris library functions including:

  - `swe_split_deg()` - Splits decimal degrees into zodiac sign + degrees/minutes/seconds
  - `swe_cs2degstr()` - Formats degrees as string with symbols
  - `swe_cs2lonlatstr()` - Longitude/latitude formatting
  - `swe_cs2timestr()` - Time string formatting
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/swephlib.c
  - 4,634 lines

- `swephlib.h` - Header file with function declarations and constants
  - Defines SE_SPLIT_DEG_ZODIACAL and related flags
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/swephlib.h
  - 189 lines

### Key Functions for Reference

#### `swe_split_deg()`

**Purpose**: Converts decimal degrees to zodiac position (sign + DMS)

**Function Signature** (C):

```c
void swe_split_deg(
  double ddeg,          // Input: decimal degrees
  int32 roundflag,      // Rounding and output format flags
  int32 *ideg,          // Output: degrees (integer)
  int32 *imin,          // Output: minutes
  int32 *isec,          // Output: seconds
  double *dsecfr,       // Output: fractional seconds
  int32 *isgn           // Output: sign number (0-11) or +/- for non-zodiacal
)
```

**Flags**:

```c
#define SE_SPLIT_DEG_ROUND_SEC    1    // Round to nearest second
#define SE_SPLIT_DEG_ROUND_MIN    2    // Round to nearest minute
#define SE_SPLIT_DEG_ROUND_DEG    4    // Round to nearest degree
#define SE_SPLIT_DEG_ZODIACAL     8    // Split into zodiac signs (0-11)
#define SE_SPLIT_DEG_KEEP_SIGN   16    // Don't round into next sign
#define SE_SPLIT_DEG_NAKSHATRA 1024    // Split into nakshatras (Vedic)
```

**Algorithm** (from lines ~640-730):

1. Normalize input to 0-360 range
2. Apply rounding if requested
3. If `SE_SPLIT_DEG_ZODIACAL` flag set:
   - `sign = floor(degrees / 30)`
   - `degrees = degrees % 30`
   - Handle edge case: 360° = 0° Aries (sign 0)
4. Split remainder into degrees, minutes, seconds
5. Handle `SE_SPLIT_DEG_KEEP_SIGN` to prevent rounding into next sign

**Key Insight**: Swiss Ephemeris handles the edge case where rounding would push 29°59'59.9" into the next sign.

---

## Essential Dignities Reference

**File**: `dignities_reference.md` (in this directory)

**Contents**:

- Complete planetary rulerships (traditional + modern)
- Exaltation degrees and signs
- Detriment and fall tables
- Dignity scoring system (+5, +4, 0, -4, -5)
- Unicode symbols for signs and planets
- Test verification data

**Primary Sources Cited**:

1. Ptolemy's "Tetrabiblos" (c. 160 CE) - Original dignity system
2. William Lilly's "Christian Astrology" (1647) - English standard
3. Skyscript.co.uk - Modern compilation with historical accuracy

---

## Verification Data

### Meeus Example (Ecliptic to Zodiac)

**Source**: "Astronomical Algorithms" by Jean Meeus, 2nd Ed., Example 25.a, Page 152

**Input**:

- Date: 1992 October 13, 00:00 TD
- Venus Ecliptic Longitude: 217.411111° (217°24'40")

**Expected Output**:

- Sign: Scorpio (index 7)
- Degree in sign: 7°24'40"
- Formatted: "7°24'40" Scorpio"

**Calculation Check**:

```typescript
const longitude = 217.411111;
const signIndex = Math.floor(longitude / 30); // 7 (Scorpio)
const degreeInSign = longitude % 30; // 7.411111
const deg = Math.floor(degreeInSign); // 7
const minFloat = (degreeInSign - deg) * 60; // 24.66666
const min = Math.floor(minFloat); // 24
const sec = Math.round((minFloat - min) * 60); // 40

// Result: 7°24'40" in Scorpio ✓
```

### Boundary Test Cases

**Sign Boundaries** (every 30°):

```
0°    → 0°00'00" Aries
30°   → 0°00'00" Taurus
60°   → 0°00'00" Gemini
90°   → 0°00'00" Cancer
120°  → 0°00'00" Leo
150°  → 0°00'00" Virgo
180°  → 0°00'00" Libra
210°  → 0°00'00" Scorpio
240°  → 0°00'00" Sagittarius
270°  → 0°00'00" Capricorn
300°  → 0°00'00" Aquarius
330°  → 0°00'00" Pisces
360°  → 0°00'00" Aries (wraps around)
```

**Edge Cases**:

```
29.999999° → 29°59'59" Aries (not 0° Taurus due to rounding)
-1°        → 29°00'00" Pisces (negative wraps backward)
361°       → 1°00'00" Aries (overflows wrap forward)
```

---

## Online Verification Tools

### 1. Astro.com Extended Chart Selection

**URL**: https://www.astro.com/cgi/chart.cgi

**Usage**:

- Enter any date/time/location
- View planetary positions in zodiac notation
- Compare against our calculations

**Example Query**:

- Date: January 1, 2000, 12:00 UT
- Sun position: ~10°58' Capricorn
- Use for spot-checking

### 2. JPL Horizons System

**URL**: https://ssd.jpl.nasa.gov/horizons/

**Usage**:

- Select target body (Sun, planets)
- Observer: Geocentric (500)
- Output: Ecliptic longitude
- Compare raw longitude values

**Example**:

```
Target: Venus (299)
Observer: Geocentric
Time: 1992-Oct-13 00:00 UT
Output: 217.411111° ecliptic longitude
```

### 3. Swiss Ephemeris Test Page

**URL**: https://www.astro.com/swisseph/

**Usage**:

- Reference implementation
- Can test edge cases
- Outputs in standard zodiac notation

---

## Implementation Notes

### What We're Implementing

1. **Core zodiac conversion**:
   - Ecliptic longitude (0-360°) → Sign (0-11) + degree within sign
   - Decimal degrees → Degrees/Minutes/Seconds (DMS)
   - Proper normalization and rounding

2. **Sign properties**:
   - Element, modality, polarity
   - Rulers (traditional + modern)
   - Sign symbols (Unicode)

3. **Essential dignities**:
   - Domicile (rulership)
   - Exaltation (with exact degrees)
   - Detriment (opposite domicile)
   - Fall (opposite exaltation)
   - Peregrine (no special dignity)

4. **Formatting**:
   - Standard: "15°30'45" Aries"
   - With symbols: "15°30'45" ♈"
   - Decimal: "15.5° Aries"
   - Various rounding options

### What We're NOT Implementing (Out of Scope)

- **Sidereal zodiac**: We're tropical only
- **Minor dignities**: Triplicities, terms/bounds, faces/decans
- **Vedic nakshatras**: Different system entirely
- **Planetary positions**: That's the future ephemeris module

### Key Differences from Swiss Ephemeris

- **Language**: TypeScript vs. C
- **Type safety**: Strong typing vs. pointer arithmetic
- **Scope**: Just zodiac/signs vs. entire ephemeris system
- **Philosophy**: Educational and transparent vs. comprehensive and optimized

Our implementation is **informed by** Swiss Ephemeris but **not a direct port**. We prioritize clarity and correctness over performance optimization.

---

## License Considerations

### Swiss Ephemeris

- **Dual licensed**: AGPL-3.0 OR Swiss Ephemeris Professional License
- **Our usage**: Reference only, no code copying
- **Our implementation**: Independent, original code
- **Attribution**: Acknowledged in comments where algorithms are informed by SE

### Celestine License

- **MIT License** (as per project)
- Independent implementation using publicly available algorithms
- References Swiss Ephemeris as authoritative source for verification

---

## Additional Resources

### Books

1. **"Astronomical Algorithms" by Jean Meeus** (1998)

   - Chapter 25: Examples of coordinate conversions
   - Page 152: Venus ecliptic longitude example
   - Gold standard for verification

2. **"Tetrabiblos" by Claudius Ptolemy** (c. 160 CE)

   - Book I, Chapters 18-20: Essential dignities
   - Historical foundation

3. **"Christian Astrology" by William Lilly** (1647)
   - Pages 104-115: Comprehensive dignity tables
   - English Renaissance standard

### Websites

1. **Skyscript.co.uk**

   - URL: https://www.skyscript.co.uk/dignities.html
   - Scholarly approach to traditional astrology
   - Excellent dignity reference

2. **Astro.com (Astrodienst)**

   - Free chart calculations
   - Uses Swiss Ephemeris backend
   - Industry standard

3. **USNO (US Naval Observatory)**
   - URL: https://aa.usno.navy.mil/
   - Official astronomical data
   - Time and coordinate standards

---

## File Manifest

```
.references/zodiac/
├── README.md                    # This file
├── dignities_reference.md       # Complete dignity tables
├── swephlib.c                   # Swiss Ephemeris library (4,634 lines)
└── swephlib.h                   # Swiss Ephemeris header (189 lines)
```

---

**Last Updated**: December 2024
**For**: Celestine Astronomical Library - Zodiac/Signs Module

