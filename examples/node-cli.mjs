// Build first: npm run build. All displayed instants are UTC ISO strings.
import { CelestialBody, time, transits } from 'celestine';
import { findLunarPhases, getMoonPhase } from 'celestine/events';

const date = new Date(process.argv[2] ?? Date.now());
if (!Number.isFinite(date.getTime())) throw new RangeError('Expected an ISO date');
const jdUT = time.toJulianDate({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
  day: date.getUTCDate(),
  hour: date.getUTCHours(),
  minute: date.getUTCMinutes(),
  second: date.getUTCSeconds() + date.getUTCMilliseconds() / 1000,
});
// Public helpers apply the built-in deltaT model; searches take TT, not UT.
const jdTT = time.toTT(jdUT);
function utc(jd) {
  return new Date((time.toUT(jd) - time.UNIX_EPOCH_JD) * time.SECONDS_PER_DAY * 1000).toISOString();
}
console.log(`As of ${date.toISOString()} (UTC; event dates use model-derived UT)`);
const bodies = [
  CelestialBody.Mercury,
  CelestialBody.Venus,
  CelestialBody.Mars,
  CelestialBody.Jupiter,
  CelestialBody.Saturn,
  CelestialBody.Uranus,
  CelestialBody.Neptune,
  CelestialBody.Pluto,
];
// Search far enough to include the next Mars retrograde as well as the other planets.
const stations = bodies
  .flatMap((body) => {
    const station = transits
      .findStationPoints(body, jdTT, jdTT + 1000)
      .find((event) => event.jd > jdTT && event.type === 'station-retrograde');
    return station ? [{ body, ...station }] : [];
  })
  .sort((a, b) => a.jd - b.jd);
console.log('Next station-retrograde for each planet (UTC):');
for (const station of stations) console.log(`${station.body}: ${utc(station.jd)}`);
const phase = getMoonPhase(jdTT);
console.log(
  `Moon phase: ${phase.phase} (nearest principal phase), ${(phase.illumination * 100).toFixed(1)}% illuminated`,
);
const next = findLunarPhases(jdTT, jdTT + 40).find((event) => event.jd > jdTT);
if (next) console.log(`Next principal phase: ${next.phase} ${utc(next.jd)} (UTC)`);
