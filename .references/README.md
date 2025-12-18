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

## Notes

Swiss Ephemeris is the gold standard for astrological calculations and is used by
commercial software worldwide. Their Placidus implementation is considered authoritative.

