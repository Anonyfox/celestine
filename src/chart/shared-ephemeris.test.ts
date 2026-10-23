import assert from 'node:assert/strict';
import { it } from 'node:test';
import { calculateChart, calculateHouseCusps, calculatePlanets } from './chart.js';

it('keeps full charts and planet-only snapshots consistent across the shared ephemeris', () => {
  const birth = {
    year: 2024,
    month: 4,
    day: 8,
    hour: 18,
    minute: 0,
    second: 0,
    timezone: 0,
    latitude: 51.5,
    longitude: 0,
  };
  const options = {
    includeAsteroids: true,
    includeChiron: true,
    includeNodes: 'both' as const,
    houseSystem: 'placidus' as const,
  };
  const chart = calculateChart(birth, options);
  const planets = calculatePlanets(birth, options);
  assert.equal(planets.length, 15);
  assert.equal(chart.nodes.length, 4);
  for (const p of planets) {
    const full = chart.planets.find((q) => q.name === p.name);
    assert.ok(full);
    assert.equal(full.longitude, p.longitude);
    assert.equal(full.latitude, p.latitude);
    assert.equal(full.longitudeSpeed, p.longitudeSpeed);
    assert.equal(full.formatted, p.formatted);
    assert.equal(full.isRetrograde, p.isRetrograde);
  }
  const houses = calculateHouseCusps(birth, { houseSystem: 'placidus' });
  assert.deepEqual(houses.houses, chart.houses);
  assert.deepEqual(houses.angles, chart.angles);
  for (const calculate of [calculatePlanets, calculateHouseCusps]) {
    assert.throws(() => calculate({ ...birth, month: 13 }), /month/i);
  }
});
