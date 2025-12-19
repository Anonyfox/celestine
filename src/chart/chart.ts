/**
 * Main Chart Calculation
 *
 * The primary entry point for calculating complete birth charts.
 *
 * @module chart/chart
 *
 * @example
 * ```typescript
 * import { calculateChart } from 'celestine/chart';
 *
 * const chart = calculateChart({
 *   year: 2000, month: 1, day: 1,
 *   hour: 12, minute: 0, second: 0,
 *   timezone: 0,
 *   latitude: 51.5074,
 *   longitude: -0.1278
 * });
 *
 * console.log(chart.planets[0].formatted); // Sun position
 * console.log(chart.angles.ascendant.signName); // Rising sign
 * ```
 */

import type { AspectPattern } from '../aspects/types.js';
import { CelestialBody } from '../ephemeris/positions.js';
import type { HouseSystem } from '../houses/types.js';
import type { Sign } from '../zodiac/types.js';
import { calculateChartAspects, detectChartPatterns } from './aspect-calculation.js';
import { generateChartSummary } from './chart-summary.js';
import { BODY_NAMES, DEFAULT_HOUSE_SYSTEM, DEFAULT_OPTIONS } from './constants.js';
import { calculateChartHouses } from './house-calculation.js';
import { validateBirthData, validateChartOptions } from './input-validation.js';
import { calculateLots, calculatePlanetPositions, sortedPlanetList } from './planet-positions.js';
import { calculateIsDaytime, calculateTimeData } from './time-conversion.js';
import type {
  BirthData,
  Chart,
  ChartAngles,
  ChartHouses,
  ChartLilith,
  ChartLot,
  ChartNode,
  ChartOptions,
  ChartPlanet,
  ValidationResult,
} from './types.js';
import { ValidationError } from './types.js';
import {
  buildChartLilith,
  buildChartLot,
  buildChartNode,
  buildChartPlanet,
} from './zodiac-placement.js';

/**
 * Calculate a complete astrological birth chart.
 *
 * @param birth - Birth date, time, and location
 * @param options - Optional configuration
 * @returns Complete chart object
 *
 * @throws {ValidationError} If birth data is invalid
 * @throws {CalculationError} If calculation fails
 *
 * @example
 * ```typescript
 * const chart = calculateChart({
 *   year: 2000, month: 1, day: 1,
 *   hour: 12, minute: 0, second: 0,
 *   timezone: 0,
 *   latitude: 51.5074,
 *   longitude: -0.1278
 * });
 *
 * // Access planets
 * for (const planet of chart.planets) {
 *   console.log(`${planet.name}: ${planet.formatted} (House ${planet.house})`);
 * }
 *
 * // Access angles
 * console.log(`ASC: ${chart.angles.ascendant.formatted}`);
 * console.log(`MC: ${chart.angles.midheaven.formatted}`);
 *
 * // Access aspects
 * for (const aspect of chart.aspects.all) {
 *   console.log(`${aspect.body1} ${aspect.symbol} ${aspect.body2}`);
 * }
 * ```
 */
export function calculateChart(birth: BirthData, options?: ChartOptions): Chart {
  // Step 1: Validate birth data
  const validation = validateBirthData(birth);
  if (!validation.valid) {
    const firstError = validation.errors[0];
    throw new ValidationError(firstError.message, firstError.field, firstError.value);
  }

  // Normalize birth data (ensure second is set)
  const normalizedBirth: BirthData = {
    ...birth,
    second: birth.second ?? 0,
  };

  // Step 2: Validate and merge options
  const { options: validatedOptions, warnings: optionWarnings } = validateChartOptions(
    options,
    birth.latitude,
  );

  const mergedOptions: Required<ChartOptions> = {
    ...DEFAULT_OPTIONS,
    ...validatedOptions,
  };

  // Step 3: Calculate time values
  const timeData = calculateTimeData(normalizedBirth);

  // Step 4: Calculate planetary positions
  const positions = calculatePlanetPositions(timeData.julianDate, mergedOptions);

  // Step 5: Calculate house cusps
  const houseResult = calculateChartHouses(
    { latitude: birth.latitude, longitude: birth.longitude },
    timeData.localSiderealTime,
    timeData.julianCenturies,
    mergedOptions.houseSystem,
  );

  // Note: optionWarnings and houseResult.warnings can be used for chart.warnings if needed
  void optionWarnings; // Reserved for future use

  // Step 6: Recalculate isDaytime with actual Sun position
  const sunPos = positions.planets.get(CelestialBody.Sun);
  const isDaytime = sunPos
    ? calculateIsDaytime(sunPos.longitude, houseResult.angles.ascendant.longitude)
    : timeData.isDaytime;

  // Update calculated data with correct isDaytime
  const calculatedData = {
    ...timeData,
    isDaytime,
  };

  // Step 7: Build planet objects
  const planets: ChartPlanet[] = [];
  for (const [body, position] of sortedPlanetList(positions.planets)) {
    planets.push(buildChartPlanet(body, position, houseResult.houses));
  }

  // Add Chiron
  if (positions.chiron) {
    planets.push(buildChartPlanet(CelestialBody.Chiron, positions.chiron, houseResult.houses));
  }

  // Add asteroids
  if (positions.asteroids) {
    if (positions.asteroids.ceres) {
      planets.push(
        buildChartPlanet(CelestialBody.Ceres, positions.asteroids.ceres, houseResult.houses),
      );
    }
    if (positions.asteroids.pallas) {
      planets.push(
        buildChartPlanet(CelestialBody.Pallas, positions.asteroids.pallas, houseResult.houses),
      );
    }
    if (positions.asteroids.juno) {
      planets.push(
        buildChartPlanet(CelestialBody.Juno, positions.asteroids.juno, houseResult.houses),
      );
    }
    if (positions.asteroids.vesta) {
      planets.push(
        buildChartPlanet(CelestialBody.Vesta, positions.asteroids.vesta, houseResult.houses),
      );
    }
  }

  // Step 8: Build nodes
  const nodes: ChartNode[] = [];
  if (positions.nodes) {
    if (positions.nodes.trueNorth) {
      nodes.push(
        buildChartNode(
          'North Node',
          'True',
          positions.nodes.trueNorth.longitude,
          houseResult.houses,
        ),
      );
      nodes.push(
        buildChartNode(
          'South Node',
          'True',
          positions.nodes.trueSouth!.longitude,
          houseResult.houses,
        ),
      );
    }
    if (positions.nodes.meanNorth) {
      nodes.push(
        buildChartNode(
          'North Node',
          'Mean',
          positions.nodes.meanNorth.longitude,
          houseResult.houses,
        ),
      );
      nodes.push(
        buildChartNode(
          'South Node',
          'Mean',
          positions.nodes.meanSouth!.longitude,
          houseResult.houses,
        ),
      );
    }
  }

  // Step 9: Build Lilith
  const lilith: ChartLilith[] = [];
  if (positions.lilith) {
    if (positions.lilith.mean) {
      lilith.push(buildChartLilith('Mean', positions.lilith.mean.longitude, houseResult.houses));
    }
    if (positions.lilith.true) {
      lilith.push(buildChartLilith('True', positions.lilith.true.longitude, houseResult.houses));
    }
  }

  // Step 10: Calculate lots (Part of Fortune, Part of Spirit)
  const lots: ChartLot[] = [];
  if (mergedOptions.includeLots && sunPos) {
    const moonPos = positions.planets.get(CelestialBody.Moon);
    if (moonPos) {
      const lotsData = calculateLots(
        sunPos.longitude,
        moonPos.longitude,
        houseResult.angles.ascendant.longitude,
        isDaytime,
        true,
      );

      if (lotsData.fortune) {
        const formula = isDaytime ? 'ASC + Moon - Sun' : 'ASC + Sun - Moon';
        lots.push(
          buildChartLot(
            BODY_NAMES.partOfFortune,
            formula,
            lotsData.fortune.longitude,
            houseResult.houses,
          ),
        );
      }
      if (lotsData.spirit) {
        const formula = isDaytime ? 'ASC + Sun - Moon' : 'ASC + Moon - Sun';
        lots.push(
          buildChartLot(
            BODY_NAMES.partOfSpirit,
            formula,
            lotsData.spirit.longitude,
            houseResult.houses,
          ),
        );
      }
    }
  }

  // Step 11: Calculate aspects
  const chartAspects = calculateChartAspects(planets, mergedOptions, nodes, lilith);

  // Step 12: Detect patterns
  const patterns: AspectPattern[] = mergedOptions.includePatterns
    ? detectChartPatterns(chartAspects.all)
    : [];

  // Step 13: Generate summary
  const summary = generateChartSummary(planets, patterns);

  // Build and return the complete chart
  return {
    input: normalizedBirth,
    options: mergedOptions,
    calculated: calculatedData,
    planets,
    nodes,
    lilith,
    lots,
    angles: houseResult.angles,
    houses: houseResult.houses,
    aspects: chartAspects,
    patterns,
    summary,
  };
}

/**
 * Validate birth data without calculating a chart.
 *
 * @param birth - Birth data to validate
 * @returns Validation result
 */
export function validateBirth(birth: BirthData): ValidationResult {
  return validateBirthData(birth);
}

/**
 * Get available house systems for a latitude.
 *
 * @param latitude - Geographic latitude
 * @returns Array of available house system names
 */
export { getAvailableHouseSystems } from './input-validation.js';

/**
 * Calculate only planetary positions without houses or aspects.
 *
 * @param birth - Birth data
 * @param options - Optional configuration
 * @returns Array of chart planets with zodiac positions
 *
 * @example
 * ```typescript
 * const planets = calculatePlanets({
 *   year: 2000, month: 1, day: 1,
 *   hour: 12, minute: 0, second: 0,
 *   timezone: 0, latitude: 0, longitude: 0
 * });
 *
 * for (const planet of planets) {
 *   console.log(`${planet.name}: ${planet.formatted}`);
 * }
 * ```
 */
export function calculatePlanets(birth: BirthData, options?: Partial<ChartOptions>): ChartPlanet[] {
  // Validate input
  const validationResult = validateBirthData(birth);
  if (!validationResult.valid) {
    throw new ValidationError(
      validationResult.errors.map((e) => e.message).join('; '),
      validationResult.errors[0]?.field ?? 'unknown',
      validationResult.errors[0]?.value,
    );
  }

  const normalizedBirth = validationResult.normalized!;
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options } as Required<ChartOptions>;

  // Calculate time data
  const calculatedData = calculateTimeData(normalizedBirth);

  // Calculate planetary positions
  const positions = calculatePlanetPositions(calculatedData.julianDate, mergedOptions);

  // Build a minimal houses object for zodiac placement (uses 0° ASC as placeholder)
  const placeholderHouses: ChartHouses = {
    system: 'equal',
    systemName: 'Equal',
    cusps: Array.from({ length: 12 }, (_, i) => ({
      house: i + 1,
      longitude: i * 30,
      sign: i as Sign,
      signName: [
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
      ][i],
      degree: 0,
      minute: 0,
      formatted: `0° ${['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][i]}`,
      size: 30,
    })),
  };

  // Convert to chart planets
  const planets: ChartPlanet[] = [];
  for (const [body, position] of sortedPlanetList(positions.planets)) {
    planets.push(buildChartPlanet(body, position, placeholderHouses));
  }

  // Add Chiron
  if (mergedOptions.includeChiron && positions.chiron) {
    planets.push(buildChartPlanet(CelestialBody.Chiron, positions.chiron, placeholderHouses));
  }

  // Add asteroids
  if (mergedOptions.includeAsteroids && positions.asteroids) {
    if (positions.asteroids.ceres) {
      planets.push(
        buildChartPlanet(CelestialBody.Ceres, positions.asteroids.ceres, placeholderHouses),
      );
    }
    if (positions.asteroids.pallas) {
      planets.push(
        buildChartPlanet(CelestialBody.Pallas, positions.asteroids.pallas, placeholderHouses),
      );
    }
    if (positions.asteroids.juno) {
      planets.push(
        buildChartPlanet(CelestialBody.Juno, positions.asteroids.juno, placeholderHouses),
      );
    }
    if (positions.asteroids.vesta) {
      planets.push(
        buildChartPlanet(CelestialBody.Vesta, positions.asteroids.vesta, placeholderHouses),
      );
    }
  }

  return planets;
}

/**
 * Calculate only house cusps and angles.
 *
 * @param birth - Birth data
 * @param options - Optional house system
 * @returns House cusps and angles
 *
 * @example
 * ```typescript
 * const houses = calculateHouseCusps({
 *   year: 2000, month: 1, day: 1,
 *   hour: 12, minute: 0, second: 0,
 *   timezone: 0, latitude: 51.5, longitude: -0.1
 * });
 *
 * console.log(`Ascendant: ${houses.angles.ascendant.formatted}`);
 * for (const cusp of houses.cusps) {
 *   console.log(`House ${cusp.house}: ${cusp.formatted}`);
 * }
 * ```
 */
export function calculateHouseCusps(
  birth: BirthData,
  options?: { houseSystem?: HouseSystem },
): { houses: ChartHouses; angles: ChartAngles; warnings: string[] } {
  // Validate input
  const validationResult = validateBirthData(birth);
  if (!validationResult.valid) {
    throw new ValidationError(
      validationResult.errors.map((e) => e.message).join('; '),
      validationResult.errors[0]?.field ?? 'unknown',
      validationResult.errors[0]?.value,
    );
  }

  const normalizedBirth = validationResult.normalized!;
  const houseSystem = options?.houseSystem ?? DEFAULT_HOUSE_SYSTEM;

  // Calculate time data
  const calculatedData = calculateTimeData(normalizedBirth);

  // Calculate houses
  const houseResult = calculateChartHouses(
    { latitude: normalizedBirth.latitude, longitude: normalizedBirth.longitude },
    calculatedData.localSiderealTime,
    calculatedData.julianCenturies,
    houseSystem,
  );

  return {
    houses: houseResult.houses,
    angles: houseResult.angles,
    warnings: houseResult.warnings,
  };
}

/**
 * Format a chart for display as text.
 *
 * @param chart - Chart to format
 * @returns Formatted chart string
 *
 * @example
 * ```typescript
 * const chart = calculateChart(birthData);
 * console.log(formatChart(chart));
 * ```
 */
export function formatChart(chart: Chart): string {
  const lines: string[] = [];

  // Header
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                        BIRTH CHART');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Birth data
  const { input } = chart;
  lines.push(
    `Date: ${input.year}-${String(input.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`,
  );
  lines.push(
    `Time: ${String(input.hour).padStart(2, '0')}:${String(input.minute).padStart(2, '0')}:${String(input.second ?? 0).padStart(2, '0')} (UTC${input.timezone >= 0 ? '+' : ''}${input.timezone})`,
  );
  lines.push(
    `Location: ${Math.abs(input.latitude).toFixed(4)}°${input.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(input.longitude).toFixed(4)}°${input.longitude >= 0 ? 'E' : 'W'}`,
  );
  lines.push('');

  // Angles
  lines.push('─────────────────────── ANGLES ───────────────────────');
  lines.push(`  ASC: ${chart.angles.ascendant.formatted}`);
  lines.push(`  MC:  ${chart.angles.midheaven.formatted}`);
  lines.push(`  DSC: ${chart.angles.descendant.formatted}`);
  lines.push(`  IC:  ${chart.angles.imumCoeli.formatted}`);
  lines.push('');

  // Planets
  lines.push('────────────────────── PLANETS ──────────────────────');
  for (const planet of chart.planets) {
    const retro = planet.isRetrograde ? ' R' : '  ';
    const house = `H${planet.house}`.padStart(3);
    lines.push(`  ${planet.name.padEnd(10)} ${planet.formatted.padEnd(20)} ${house}${retro}`);
  }
  lines.push('');

  // Nodes
  if (chart.nodes.length > 0) {
    lines.push('──────────────────── LUNAR NODES ────────────────────');
    for (const node of chart.nodes) {
      const house = `H${node.house}`.padStart(3);
      lines.push(`  ${node.name.padEnd(12)} ${node.formatted.padEnd(20)} ${house}`);
    }
    lines.push('');
  }

  // Houses
  lines.push(`─────────────────── HOUSES (${chart.houses.systemName}) ───────────────────`);
  for (const cusp of chart.houses.cusps) {
    lines.push(`  House ${String(cusp.house).padStart(2)}: ${cusp.formatted}`);
  }
  lines.push('');

  // Aspects summary
  lines.push('────────────────────── ASPECTS ──────────────────────');
  lines.push(`  Total: ${chart.aspects.count}`);
  lines.push(`  Conjunctions: ${chart.aspects.summary.conjunctions}`);
  lines.push(`  Sextiles: ${chart.aspects.summary.sextiles}`);
  lines.push(`  Squares: ${chart.aspects.summary.squares}`);
  lines.push(`  Trines: ${chart.aspects.summary.trines}`);
  lines.push(`  Oppositions: ${chart.aspects.summary.oppositions}`);
  lines.push('');

  // Patterns
  if (chart.patterns.length > 0) {
    lines.push('──────────────────── PATTERNS ────────────────────');
    for (const pattern of chart.patterns) {
      lines.push(`  ${pattern.type}: ${pattern.bodies.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
