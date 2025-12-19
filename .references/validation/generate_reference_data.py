#!/usr/bin/env python3
"""
Generate reference ephemeris data using Swiss Ephemeris (pyswisseph).

This script generates authoritative planetary positions that we use to validate
our TypeScript implementation. Swiss Ephemeris is the gold standard for
astrological calculations.

Usage:
    python3.11 generate_reference_data.py

Output:
    Prints geocentric ecliptic coordinates for all implemented planets
    at various test dates.
"""

import sys
import os

# Add the extracted wheel package to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(script_dir, 'pyswisseph_pkg'))

import swisseph as swe
import json
from datetime import datetime

# Swiss Ephemeris flags
# SEFLG_SPEED: include speed in output
# Default is apparent geocentric ecliptic coordinates
CALC_FLAGS = swe.FLG_SPEED

# Planet constants from Swiss Ephemeris
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

# Test dates (Julian Date and human-readable)
TEST_DATES = [
    # J2000.0 epoch - the fundamental reference point
    (2451545.0, "2000-Jan-01 12:00 TT (J2000.0)"),

    # Meeus Example 47.a - Moon calculation reference
    (2448724.5, "1992-Apr-12 00:00 TT (Meeus Ex 47.a)"),

    # Various historical/future dates for range testing
    (2415020.5, "1900-Jan-01 00:00 TT"),
    (2440587.5, "1970-Jan-01 00:00 TT (Unix epoch)"),
    (2459580.5, "2022-Jan-01 00:00 TT"),
    (2488069.5, "2100-Jan-01 00:00 TT"),
]


def calculate_position(planet_id: int, jd: float) -> dict:
    """
    Calculate geocentric ecliptic position for a planet.

    Returns:
        dict with longitude, latitude, distance, speed, is_retrograde
    """
    # swe_calc returns (xx, retflag) where xx is [lon, lat, dist, lon_speed, lat_speed, dist_speed]
    result, retflag = swe.calc_ut(jd, planet_id, CALC_FLAGS)

    return {
        'longitude': round(result[0], 6),      # degrees
        'latitude': round(result[1], 6),       # degrees
        'distance': round(result[2], 6),       # AU (or km for Moon)
        'longitude_speed': round(result[3], 6), # degrees/day
        'latitude_speed': round(result[4], 6),  # degrees/day
        'is_retrograde': result[3] < 0,
    }


def format_zodiac(longitude: float) -> str:
    """Convert longitude to zodiac sign + degrees."""
    signs = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir',
             'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis']
    sign_idx = int(longitude / 30) % 12
    degrees = longitude % 30
    return f"{degrees:.2f}° {signs[sign_idx]}"


def main():
    print("=" * 80)
    print("SWISS EPHEMERIS REFERENCE DATA FOR CELESTINE VALIDATION")
    print("=" * 80)
    print(f"Swiss Ephemeris version: {swe.version}")
    print()

    # Store all data for JSON export
    all_data = {
        'generator': 'pyswisseph',
        'version': swe.version,
        'generated_at': datetime.now().isoformat(),
        'dates': {},
        'planets': list(PLANETS.keys()),
    }

    for jd, date_desc in TEST_DATES:
        print(f"\n{'='*80}")
        print(f"DATE: {date_desc}")
        print(f"Julian Date: {jd}")
        print("=" * 80)

        date_data = {
            'description': date_desc,
            'jd': jd,
            'positions': {}
        }

        print(f"\n{'Planet':<10} {'Longitude':>12} {'Zodiac':>15} {'Latitude':>10} {'Distance':>12} {'Speed':>10} {'Retro':>6}")
        print("-" * 80)

        for planet_name, planet_id in PLANETS.items():
            pos = calculate_position(planet_id, jd)
            date_data['positions'][planet_name] = pos

            zodiac = format_zodiac(pos['longitude'])
            retro = "R" if pos['is_retrograde'] else ""

            # Distance unit: AU for planets, special handling for Moon (km -> AU for display)
            dist_str = f"{pos['distance']:.4f} AU"
            if planet_name == 'Moon':
                # Moon distance is in AU in Swiss Ephemeris when using default flags
                dist_str = f"{pos['distance']:.6f} AU"

            print(f"{planet_name:<10} {pos['longitude']:>12.4f}° {zodiac:>15} {pos['latitude']:>+10.4f}° {dist_str:>12} {pos['longitude_speed']:>+10.4f} {retro:>6}")

        all_data['dates'][str(jd)] = date_data

    # Save JSON for programmatic use
    json_path = 'reference_ephemeris.json'
    with open(json_path, 'w') as f:
        json.dump(all_data, f, indent=2)
    print(f"\n\nJSON data saved to: {json_path}")

    # Print key values for copy-paste into tests
    print("\n" + "=" * 80)
    print("KEY VALUES FOR TEST ASSERTIONS (J2000.0)")
    print("=" * 80)
    j2000_data = all_data['dates']['2451545.0']['positions']

    for planet_name in ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter']:
        pos = j2000_data[planet_name]
        print(f"""
// {planet_name} at J2000.0 (Swiss Ephemeris reference)
// Longitude: {pos['longitude']}° ({format_zodiac(pos['longitude'])})
// Latitude: {pos['latitude']}°
// Distance: {pos['distance']} AU
// Speed: {pos['longitude_speed']}°/day
// Retrograde: {pos['is_retrograde']}
""")


if __name__ == '__main__':
    main()

