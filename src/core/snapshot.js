import { computeState } from './state.js';
import { PRAYER_NAMES } from './windows.js';

export function buildSnapshot(days, now) {
  const s = computeState(days, now);
  if (s.phase === 'nodata') return s;
  return { ...s, prayerName: PRAYER_NAMES[s.prayer] };
}
