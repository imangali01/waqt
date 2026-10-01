import { computeState } from './state.js';
import { dateOf } from './tz.js';
import { windowsForDate } from './prayer-windows.js';
import { nameOfDay } from './names.js';
import { getMark, statusOfWindow } from './marks.js';
import { computeStreak } from './streak.js';

const PULSE_MS = 5 * 60000;

export function buildSnapshot(days, marks, now, names = []) {
  const s = computeState(days, now);
  const streak = computeStreak({ days, marks, now });
  if (s.phase === 'nodata') return { ...s, dots: [], missed: [], pulse: false, streak };

  const today = dateOf(now);
  const windows = windowsForDate(days, today);
  const dots = windows.map((w) => ({
    date: w.date,
    prayer: w.prayer,
    status: statusOfWindow(w, getMark(marks, w.date, w.prayer), now),
  }));
  const missed = dots
    .filter((d) => d.status === 'missed')
    .map((d) => ({ date: today, prayer: d.prayer }));

  const marked = s.phase === 'prayer' && getMark(marks, s.date, s.prayer) !== null;
  const snap = {
    ...s,
    marked,
    pulse: s.phase === 'prayer' && !marked && s.remainingMs <= PULSE_MS,
    dots,
    missed,
    streak,
  };
  snap.name = nameOfDay(names, today);
  return snap;
}
