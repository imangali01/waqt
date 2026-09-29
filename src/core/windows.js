import { toInstant, addDays } from './tz.js';

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const PRAYER_NAMES = { fajr: 'Фаджр', dhuhr: 'Зухр', asr: 'Аср', maghrib: 'Магриб', isha: 'Иша' };
const END_OF = { fajr: 'sunrise', dhuhr: 'asr', asr: 'sunset', maghrib: 'isha' };

export function windowsForDate(days, date) {
  const t = days[date];
  if (!t) return [];
  const out = [];
  for (const prayer of PRAYERS) {
    let end;
    if (prayer === 'isha') {
      const nextDate = addDays(date, 1);
      if (!days[nextDate]) continue;
      end = toInstant(nextDate, days[nextDate].fajr);
    } else {
      end = toInstant(date, t[END_OF[prayer]]);
    }
    out.push({ date, prayer, start: toInstant(date, t[prayer]), end });
  }
  return out;
}
