import { addDays, dateOf } from './tz.js';
import { PRAYERS, windowsForDate } from './prayer-windows.js';
import { getMark } from './marks.js';

const MAX_DAYS = 3660;

const isFullDay = (marks, date) =>
  PRAYERS.every((prayer) => getMark(marks, date, prayer)?.status === 'on_time');

// Сегодня: 'full' — все пять вовремя, 'failed' — какое-то окно закончилось без отметки «вовремя»,
// 'open' — день ещё идёт и серию не ломает.
function todayState({ days, marks, now }, date) {
  if (isFullDay(marks, date)) return 'full';
  const failed = windowsForDate(days, date).some(
    (w) => now >= w.end && getMark(marks, date, w.prayer)?.status !== 'on_time',
  );
  return failed ? 'failed' : 'open';
}

// Серия: сколько подряд дней все 5 намазов прочитаны вовремя (зелёные).
export function computeStreak({ days, marks, now }) {
  const today = dateOf(now);
  const state = todayState({ days, marks, now }, today);
  if (state === 'failed') return 0;

  let count = state === 'full' ? 1 : 0;
  for (let i = 1; i <= MAX_DAYS; i++) {
    if (!isFullDay(marks, addDays(today, -i))) break;
    count += 1;
  }
  return count;
}
