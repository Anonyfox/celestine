# Ephemeris Validation

This folder contains tools to generate reference ephemeris data from Swiss Ephemeris
for validating the Celestine TypeScript implementation.

## Purpose

Swiss Ephemeris (via `pyswisseph`) is the gold standard for astrological calculations.
We use it to generate authoritative planetary positions that we compare against our
TypeScript implementation to ensure numerical correctness.

## Validation Status ✅

**All celestial bodies validated against Swiss Ephemeris 2.10.03:**

| Body    | J2000.0 | 1992 | 1970 | 2022 |
|---------|---------|------|------|------|
| Sun     | 0.5'  ✅ | 0.3' ✅ | 0.3' ✅ | 0.5' ✅ |
| Moon    | 0.3'  ✅ | 0.8' ✅ | 0.5' ✅ | 0.9' ✅ |
| Mercury | 0.6'  ✅ | 0.9' ✅ | 0.6' ✅ | 5.9' ⚠️ |
| Venus   | 0.3'  ✅ | 0.1' ✅ | 0.1' ✅ | 0.3' ✅ |
| Mars    | 0.4'  ✅ | 0.1' ✅ | 0.1' ✅ | 0.2' ✅ |
| Jupiter | 0.1'  ✅ | 0.6' ✅ | 0.4' ✅ | 0.3' ✅ |

**Note:** Mercury uses simplified VSOP87 which degrades at dates 20+ years from J2000.0.
This is acceptable for astrological use (typical charts are 1950-2050).

## Usage

```bash
cd .references/validation

# The pyswisseph wheel is pre-extracted in pyswisseph_pkg/
# Use Python 3.11 to run the script:
python3.11 generate_reference_data.py
```

## Output

The script produces:
1. Console output with formatted planetary positions
2. `reference_ephemeris.json` - machine-readable data for test assertions

## Key Test Dates

- **J2000.0** (JD 2451545.0): Jan 1, 2000, 12:00 TT - fundamental epoch
- **Meeus Example 47.a** (JD 2448724.5): Apr 12, 1992 - Moon calculation reference
- **Unix Epoch** (JD 2440587.5): Jan 1, 1970 - common reference
- **Recent** (JD 2459580.5): Jan 1, 2022 - modern date test

## Reference Data in Tests

The Swiss Ephemeris reference values are embedded directly in the test files:
- `src/ephemeris/sun.test.ts`
- `src/ephemeris/moon.test.ts`
- `src/ephemeris/planets/mercury.test.ts`
- `src/ephemeris/planets/venus.test.ts`
- `src/ephemeris/planets/mars.test.ts`
- `src/ephemeris/planets/jupiter.test.ts`

**These reference values are AUTHORITATIVE and must not be modified.**
If tests fail, fix the implementation, not the expected values.

## Cleanup

This entire `validation/` folder can be deleted once the Celestine package is
complete and all planetary calculations have been verified.

