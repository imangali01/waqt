import { computeState } from './state.js';
import { dateOf } from './tz.js';
import { PRAYER_NAMES, windowsForDate } from './windows.js';
import { nameOfDay } from './names.js';
import { getMark, statusOfWindow } from './marks.js';

const PULSE_MS = 5 * 60000;

export function buildSnapshot(days, marks, now, names = []) {
  const s = computeState(days, now);
  if (s.phase === 'nodata') return { ...s, dots: [], missed: [], pulse: false };

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

  const marked = s.phase === 'prayer' && getMark(marks, s.date, s.prayer) !== null;
  const snap = {
    ...s,
    prayerName: PRAYER_NAMES[s.prayer],
    marked,
    pulse: s.phase === 'prayer' && !marked && s.remainingMs <= PULSE_MS,
    dots,
    missed,
  };
  if (s.phase === 'gap') snap.name = nameOfDay(names, today);
  return snap;
}
