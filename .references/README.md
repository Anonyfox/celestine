# Reference Sources

## Swiss Ephemeris

**Source URL**: https://github.com/aloistr/swisseph
**License**: AGPL-3.0 / Swiss Ephemeris Professional License (dual license)
**Authors**: Dieter Koch and Alois Treindl
**Copyright**: Astrodienst AG, Switzerland

### Files Downloaded

- `swisseph/swehouse.c` - House and aspect calculation implementation
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/swehouse.c
- `swisseph/swehouse.h` - House calculation header
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/swehouse.h
- `swiss_ephemeris_documentation.pdf` - Complete Swiss Ephemeris programmer's documentation
  - URL: https://argala.ru/pdf-files/swisseph.pdf
  - 98 pages covering all calculation methods
- `swiss_ephemeris_table_of_houses.pdf` - Reference tables for house cusps
  - URL: https://traditional-astrology.ru/wp-content/uploads/2020/11/hts_r_e.pdf
  - Precomputed house cusps for various latitudes and sidereal times

### Purpose

Reference implementation for astronomical house system calculations, particularly:

- Placidus house system
- Koch house system
- Regiomontanus house system
- Campanus house system
- Other house systems

### Usage

These files are for reference and study purposes to understand the authoritative algorithms.
Our implementation in Celestine is independent but informed by these references.

### Usage

These files are for reference and study purposes to understand the authoritative algorithms.
Our implementation in Celestine is independent but informed by these references.

---

## Zodiac & Signs

**Source URL**: https://github.com/aloistr/swisseph
**Location**: `zodiac/`
**License**: AGPL-3.0 / Swiss Ephemeris Professional License (dual license)
**Authors**: Dieter Koch and Alois Treindl
**Copyright**: Astrodienst AG, Switzerland

### Files Downloaded

- `zodiac/swephlib.c` - Core ephemeris library functions
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/swephlib.c
  - Contains `swe_split_deg()` - splits decimal degrees into zodiac sign + DMS
  - 4,634 lines
- `zodiac/swephlib.h` - Library header with constants and function declarations
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/swephlib.h
  - Defines SE_SPLIT_DEG_ZODIACAL and related flags
  - 189 lines

### Reference Documents

- `zodiac/dignities_reference.md` - Complete essential dignities tables
  - Planetary rulerships (traditional + modern)
  - Exaltations with exact degrees
  - Detriments and falls
  - Dignity scoring system
  - Test verification data
  - Sources: Ptolemy's Tetrabiblos, Lilly's Christian Astrology, Skyscript

### Purpose

Reference implementation and verification data for:

- Ecliptic longitude to zodiac sign conversion
- Degrees/Minutes/Seconds (DMS) formatting
- Sign properties (element, modality, polarity, rulers)
- Essential dignities (domicile, exaltation, detriment, fall)
- Unicode symbols for signs and planets

### Usage

These files provide the authoritative algorithms and reference tables for zodiac calculations.
Our TypeScript implementation is independent but verified against these sources.

---

---

## Planetary Ephemeris (Moshier)

**Source URL**: https://github.com/aloistr/swisseph
**Location**: `swisseph/planetary/`
**License**: AGPL-3.0 / Swiss Ephemeris Professional License (dual license)
**Authors**: Steve Moshier (original), Dieter Koch & Alois Treindl (Swiss Ephemeris adaptation)
**Copyright**: Astrodienst AG, Switzerland

### Files Downloaded

- `planetary/swemplan.c` - Moshier analytical planetary ephemeris
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/swemplan.c
  - Self-contained planetary position calculations
  - 967 lines
- `planetary/swemptab.h` - Moshier planetary coefficient tables
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/swemptab.h
  - Trigonometric series coefficients for all planets
  - 10,640 lines (mostly data tables)
- `planetary/sweph.c` - Main Swiss Ephemeris core
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/sweph.c
  - Complete ephemeris calculation routines
  - 8,614 lines
- `planetary/sweph.h` - Swiss Ephemeris header
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/sweph.h
  - Planet constants, orbital elements
  - 849 lines
- `planetary/swephexp.h` - Swiss Ephemeris export header
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/swephexp.h
  - Public API definitions
  - 1,020 lines
- `planetary/sweodef.h` - Swiss Ephemeris definitions
  - URL: https://raw.githubusercontent.com/aloistr/swisseph/master/sweodef.h
  - Platform-specific definitions
  - 326 lines

### Purpose

Reference implementation for planetary position calculations:

- **Moshier Ephemeris**: Self-contained analytical ephemeris (~1 arcsecond accuracy)
  - Based on Steve Moshier's implementation of Bretagnon & Francou's VSOP87
  - No external data files needed
  - Covers all planets Mercury through Pluto
- **Lunar calculations**: Moon position algorithms
- **Coordinate transformations**: Heliocentric → Geocentric conversions
- **Perturbation corrections**: Planetary perturbations and nutation

### Algorithm Notes

The Moshier ephemeris uses:

- **VSOP87 theory** for inner planets (truncated for efficiency)
- **Series expansions** for outer planets
- **Chebyshev polynomials** for interpolation
- Accuracy: ~1 arcsecond for planets, ~3 arcseconds for Moon (1800-2200 CE)

For our simplified implementation (arcminute accuracy), we use Jean Meeus'
"Astronomical Algorithms" which provides cleaner, more educational formulas
while still achieving astrologically-sufficient precision.

---

## Notes

Swiss Ephemeris is the gold standard for astrological calculations and is used by
commercial software worldwide. Their implementations are considered authoritative.

All reference materials are used for study and verification purposes only. Celestine's
implementations are original code, informed by but not derived from these sources.
