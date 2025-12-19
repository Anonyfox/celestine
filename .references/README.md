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

## Notes

Swiss Ephemeris is the gold standard for astrological calculations and is used by
commercial software worldwide. Their implementations are considered authoritative.

All reference materials are used for study and verification purposes only. Celestine's
implementations are original code, informed by but not derived from these sources.
