import { performance } from 'node:perf_hooks';
import * as events from '../../dist/events/index.js';
import { CelestialBody, ephemeris } from '../../dist/index.js';

const a = 2461041.5;
const classic = Object.values(CelestialBody).slice(0, 10);
const jobs = {
  'lunar phases / year': () => events.findLunarPhases(a, a + 365),
  'seasons / year': () => events.findSeasons(a, a + 365),
  'Moon ingresses / year': () => events.findSignIngresses(CelestialBody.Moon, a, a + 365),
  'ten-body ingresses / year': () =>
    classic.flatMap((body) => events.findSignIngresses(body, a, a + 365)),
  'Mars–Saturn aspects / 3 years': () =>
    events.findAspectTimes(CelestialBody.Mars, CelestialBody.Saturn, a, a + 1095),
  'VOC / month': () => events.findVoidOfCourseMoon(a, a + 30),
  'VOC / year': () => events.findVoidOfCourseMoon(a, a + 365),
  'getAllPositions with speed / call': () => {
    for (let i = 0; i < 100; i++) ephemeris.getAllPositions(a + i / 10);
  },
};
for (const [name, run] of Object.entries(jobs)) {
  run();
  const times = [];
  for (let i = 0; i < 7; i++) {
    const start = performance.now();
    run();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  console.log(
    `${name}: ${(times[3] / (name.startsWith('getAll') ? 100 : 1)).toFixed(3)} ms median`,
  );
}
