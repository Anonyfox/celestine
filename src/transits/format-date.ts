import type { TransitDate } from './types.js';

/** Shared calendar-only rendering for transit reports. */
export function formatDate(date: TransitDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}
