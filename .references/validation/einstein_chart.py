#!/usr/bin/env python3
"""
Calculate Einstein's birth chart using Swiss Ephemeris for verification.

Einstein's birth data (Rodden Rating AA - Birth Certificate):
- Date: March 14, 1879
- Time: 11:30 AM LMT (Local Mean Time)
- Location: Ulm, Germany (48°24'N, 10°00'E)

LMT to UT conversion:
- 10°E longitude = +40 minutes (10/15 * 60)
- 11:30 LMT - 40 min = 10:50 UT
"""

import sys
import os

# Add the extracted wheel package to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(script_dir, 'pyswisseph_pkg'))

import swisseph as swe

# Einstein birth data
YEAR = 1879
MONTH = 3
DAY = 14
HOUR_UT = 10  # 10:50 UT
MINUTE_UT = 50
SECOND_UT = 0
LATITUDE = 48.4  # 48°24'N
LONGITUDE = 10.0  # 10°00'E

# Swiss Ephemeris flags
CALC_FLAGS = swe.FLG_SPEED

# Planet constants
PLANETS = {
    'Sun': swe.SUN,
    'Moon': swe.MOON,
    'Mercury': swe.MERCURY,
    'Venus': swe.VENUS,
    'Mars': swe.MARS,
    'Jupiter': swe.JUPITER,
    'Saturn': swe.SATURN,
    'Uranus': swe.URANUS,
    'Neptune': swe.NEPTUNE,
    'Pluto': swe.PLUTO,
}

SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
         'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']

def format_zodiac(longitude: float) -> str:
    """Convert longitude to zodiac sign + degrees."""
    sign_idx = int(longitude / 30) % 12
    degrees = longitude % 30
    deg = int(degrees)
    minutes = (degrees - deg) * 60
    return f"{deg}°{minutes:.1f}' {SIGNS[sign_idx]}"

def main():
    print("=" * 80)
    print("ALBERT EINSTEIN BIRTH CHART - SWISS EPHEMERIS VERIFICATION")
    print("=" * 80)
    print(f"Swiss Ephemeris version: {swe.version}")
    print()
    print("Birth Data:")
    print(f"  Date: {YEAR}-{MONTH:02d}-{DAY:02d}")
    print(f"  Time: 11:30 AM LMT (Local Mean Time)")
    print(f"  UT:   {HOUR_UT}:{MINUTE_UT:02d}:{SECOND_UT:02d}")
    print(f"  Location: Ulm, Germany")
    print(f"  Latitude: {LATITUDE}°N")
    print(f"  Longitude: {LONGITUDE}°E")
    print()

    # Calculate Julian Date
    hour_decimal = HOUR_UT + MINUTE_UT/60 + SECOND_UT/3600
    jd = swe.julday(YEAR, MONTH, DAY, hour_decimal)
    print(f"Julian Date (UT): {jd}")
    print()

    # Get Delta T (difference between TT and UT)
    delta_t = swe.deltat(jd)
    jd_tt = jd + delta_t
    print(f"Delta T: {delta_t * 86400:.2f} seconds")
    print(f"Julian Date (TT): {jd_tt}")
    print()

    # Calculate sidereal time
    # ARMC = sidereal time at Greenwich expressed in degrees
    armc = swe.sidtime(jd) * 15  # Convert hours to degrees
    print(f"GMST (Greenwich Mean Sidereal Time): {swe.sidtime(jd):.6f} hours = {armc:.4f}°")

    # Local Sidereal Time = GMST + longitude
    lst = armc + LONGITUDE
    if lst >= 360:
        lst -= 360
    print(f"LST (Local Sidereal Time): {lst:.4f}°")
    print()

    # Get obliquity of ecliptic
    eps_data = swe.calc(jd, swe.ECL_NUT)
    obliquity = eps_data[0][0]  # True obliquity
    print(f"Obliquity of Ecliptic: {obliquity:.6f}°")
    print()

    # Calculate house cusps using Placidus
    print("=" * 80)
    print("HOUSE CUSPS (PLACIDUS)")
    print("=" * 80)

    # swe.houses returns (cusps, ascmc)
    # cusps[0] is unused, cusps[1-12] are houses 1-12
    # ascmc[0] = ASC, ascmc[1] = MC, ascmc[2] = ARMC, ascmc[3] = Vertex
    cusps, ascmc = swe.houses(jd, LATITUDE, LONGITUDE, b'P')  # 'P' = Placidus

    print(f"\nAngles:")
    print(f"  Ascendant (ASC):  {ascmc[0]:.4f}° = {format_zodiac(ascmc[0])}")
    print(f"  Midheaven (MC):   {ascmc[1]:.4f}° = {format_zodiac(ascmc[1])}")
    print(f"  ARMC:             {ascmc[2]:.4f}°")
    print(f"  Vertex:           {ascmc[3]:.4f}° = {format_zodiac(ascmc[3])}")

    print(f"\nHouse Cusps (indices 1-12):")
    for i in range(1, min(13, len(cusps))):
        print(f"  House {i:2d}: {cusps[i]:8.4f}° = {format_zodiac(cusps[i])}")

    # Calculate planetary positions
    print()
    print("=" * 80)
    print("PLANETARY POSITIONS")
    print("=" * 80)
    print(f"\n{'Planet':<10} {'Longitude':>12} {'Zodiac':>22} {'Latitude':>10} {'Speed':>10}")
    print("-" * 70)

    for planet_name, planet_id in PLANETS.items():
        result, retflag = swe.calc_ut(jd, planet_id, CALC_FLAGS)
        longitude = result[0]
        latitude = result[1]
        speed = result[3]
        retro = " R" if speed < 0 else ""

        print(f"{planet_name:<10} {longitude:>12.4f}° {format_zodiac(longitude):>22} {latitude:>+10.4f}° {speed:>+10.4f}{retro}")

    # Also calculate lunar nodes and Lilith
    print()
    print("Additional Points:")

    # True Node (Mean node would be swe.MEAN_NODE)
    result, _ = swe.calc_ut(jd, swe.TRUE_NODE, CALC_FLAGS)
    print(f"  True Node:    {result[0]:.4f}° = {format_zodiac(result[0])}")

    # Mean Node
    result, _ = swe.calc_ut(jd, swe.MEAN_NODE, CALC_FLAGS)
    print(f"  Mean Node:    {result[0]:.4f}° = {format_zodiac(result[0])}")

    # Mean Lilith (Black Moon)
    result, _ = swe.calc_ut(jd, swe.MEAN_APOG, CALC_FLAGS)
    print(f"  Mean Lilith:  {result[0]:.4f}° = {format_zodiac(result[0])}")

    # Chiron - requires ephemeris file, skip
    # result, _ = swe.calc_ut(jd, swe.CHIRON, CALC_FLAGS)
    # print(f"  Chiron:       {result[0]:.4f}° = {format_zodiac(result[0])}")

    print()
    print("=" * 80)
    print("SUMMARY FOR CELESTINE VALIDATION")
    print("=" * 80)
    print("""
These are the AUTHORITATIVE values from Swiss Ephemeris that our
Celestine library should match:

const EINSTEIN_SWISSEPH = {
  jd: %.6f,
  sun: { longitude: %.4f, sign: '%s', degree: %.1f },
  moon: { longitude: %.4f, sign: '%s', degree: %.1f },
  mercury: { longitude: %.4f, sign: '%s', degree: %.1f },
  ascendant: { longitude: %.4f, sign: '%s', degree: %.1f },
  midheaven: { longitude: %.4f, sign: '%s', degree: %.1f },
};
""" % (
        jd,
        # Sun
        swe.calc_ut(jd, swe.SUN, CALC_FLAGS)[0][0],
        SIGNS[int(swe.calc_ut(jd, swe.SUN, CALC_FLAGS)[0][0] / 30) % 12],
        swe.calc_ut(jd, swe.SUN, CALC_FLAGS)[0][0] % 30,
        # Moon
        swe.calc_ut(jd, swe.MOON, CALC_FLAGS)[0][0],
        SIGNS[int(swe.calc_ut(jd, swe.MOON, CALC_FLAGS)[0][0] / 30) % 12],
        swe.calc_ut(jd, swe.MOON, CALC_FLAGS)[0][0] % 30,
        # Mercury
        swe.calc_ut(jd, swe.MERCURY, CALC_FLAGS)[0][0],
        SIGNS[int(swe.calc_ut(jd, swe.MERCURY, CALC_FLAGS)[0][0] / 30) % 12],
        swe.calc_ut(jd, swe.MERCURY, CALC_FLAGS)[0][0] % 30,
        # ASC
        ascmc[0],
        SIGNS[int(ascmc[0] / 30) % 12],
        ascmc[0] % 30,
        # MC
        ascmc[1],
        SIGNS[int(ascmc[1] / 30) % 12],
        ascmc[1] % 30,
    ))

if __name__ == '__main__':
    main()

