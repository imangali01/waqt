import { addDays, dateOf } from './tz.js';
import { PRAYERS, windowsForDate } from './windows.js';
import { getMark, statusOfWindow } from './marks.js';

export function buildHistory({ days, tracked, marks, now, startDate, count }) {
  const trackedTimes = Object.fromEntries(Object.entries(tracked).map(([d, v]) => [d, v.times]));
  const merged = { ...days, ...trackedTimes };
  const today = dateOf(now);
  const columns = [];

  for (let i = 0; i < count; i++) {
    const date = addDays(startDate, i);
    const byPrayer = Object.fromEntries(windowsForDate(merged, date).map((w) => [w.prayer, w]));
    const isTracked = Boolean(tracked[date]);
    const cells = PRAYERS.map((prayer) => {
      const mark = getMark(marks, date, prayer);
      if (mark) return { prayer, status: mark.status };
      const w = byPrayer[prayer];
      if (!isTracked || !w) return { prayer, status: date > today ? 'upcoming' : 'nodata' };
      return { prayer, status: statusOfWindow(w, null, now) };
    });
    columns.push({ date, cells });
  }
  return columns;
}
