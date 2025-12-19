/**
 * Celestine - Astronomical and Astrological Calculations
 *
 * @remarks
 * A TypeScript library for calculating planetary positions, birth charts,
 * and other astrological data based on astronomical principles.
 *
 * @packageDocumentation
 */

// Export houses module
export * as houses from './houses/index.js';
// Export time module
export * as time from './time/index.js';

// Export zodiac module
export * as zodiac from './zodiac/index.js';

/**
 * Calculates the Julian Date for a given date and time.
 *
 * @param year - Year (Gregorian calendar)
 * @param month - Month (1-12)
 * @param day - Day (1-31)
 * @param hour - Hour (0-23, decimal)
 * @returns Julian Date as a continuous day count
 *
 * @example
 * ```typescript
 * import { julianDate } from 'celestine';
 *
 * // J2000.0 epoch (January 1, 2000, 12:00 UT)
 * const jd = julianDate(2000, 1, 1, 12);
 * console.log(jd); // 2451545.0
 * ```
 */
export function julianDate(year: number, month: number, day: number, hour = 0): number {
  // Algorithm from Jean Meeus' "Astronomical Algorithms"
  let y = year;
  let m = month;

  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);

  const jd =
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + hour / 24 + b - 1524.5;

  return jd;
}

/**
 * Converts a zodiac degree (0-360) to sign and position within the sign.
 *
 * @param longitude - Ecliptic longitude in degrees (0-360)
 * @returns Object with sign index, sign name, and degree within sign
 *
 * @example
 * ```typescript
 * import { eclipticToZodiac } from 'celestine';
 *
 * const position = eclipticToZodiac(45.5);
 * console.log(position);
 * // { signIndex: 1, signName: 'Taurus', degree: 15.5, formatted: '15°30' Taurus' }
 * ```
 */
export function eclipticToZodiac(longitude: number): {
  signIndex: number;
  signName: string;
  degree: number;
  formatted: string;
} {
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ];

  // Normalize to 0-360
  let lon = longitude % 360;
  if (lon < 0) lon += 360;

  const signIndex = Math.floor(lon / 30);
  const degree = lon % 30;
  const signName = signs[signIndex];

  const deg = Math.floor(degree);
  const min = Math.round((degree - deg) * 60);
  const formatted = `${deg}°${min.toString().padStart(2, '0')}' ${signName}`;

  return { signIndex, signName, degree, formatted };
}

/**
 * Greets the celestial sphere.
 *
 * @param name - Name to greet
 * @returns A celestial greeting
 *
 * @example
 * ```typescript
 * import { greet } from 'celestine';
 *
 * console.log(greet('Stargazer'));
 * // "Hello from the stars, Stargazer!"
 * ```
 */
export function greet(name: string): string {
  return `Hello from the stars, ${name}!`;
}
