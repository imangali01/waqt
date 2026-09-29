import { computeState } from './state.js';
import { dateOf } from './tz.js';
import { PRAYER_NAMES, windowsForDate } from './windows.js';
import { getMark, statusOfWindow } from './marks.js';

export function buildSnapshot(days, marks, now) {
  const s = computeState(days, now);
  if (s.phase === 'nodata') return { ...s, dots: [], missed: [] };

  const today = dateOf(now);
  const windows = windowsForDate(days, today);
  const dots = windows.map((w) => ({
    prayer: w.prayer,
    name: PRAYER_NAMES[w.prayer],
    status: statusOfWindow(w, getMark(marks, w.date, w.prayer), now),
  }));
  const missed = dots
    .filter((d) => d.status === 'missed')
    .map((d) => ({ date: today, prayer: d.prayer, name: d.name }));

  return {
    ...s,
    prayerName: PRAYER_NAMES[s.prayer],
    marked: s.phase === 'prayer' && getMark(marks, s.date, s.prayer) !== null,
    dots,
    missed,
  };
}
