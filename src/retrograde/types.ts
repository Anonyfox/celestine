import type { RetrogradePeriod } from '../transits/types.js';

/** Time-based progress through a retrograde period and its longitude shadow. */
export interface RetrogradeProgress {
  period: RetrogradePeriod;
  /** Exact result of getRetrogradeShadow, in the selected frame. */
  shadow: ReturnType<typeof import('../transits/retrograde-transits.js').getRetrogradeShadow>;
  /** TT midpoint between stations. */
  midpointJD: number;
  /** Midpoint converted to UT, when both station UT fields are supplied. */
  midpointJDUT?: number;
  /** Linear elapsed station-to-station percentage, clamped to [0, 100]. */
  percentDone: number;
  phase: 'pre-shadow' | 'retrograde' | 'post-shadow' | 'outside';
}
