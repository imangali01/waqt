import { dateOf } from './tz.js';

const BASE = 'https://api.muftyat.kz/prayer-times';
export const LAT = 51.133333;
export const LON = 71.433333;

export function parseYear(json) {
  if (!json || !Array.isArray(json.result) || json.result.length === 0) {
    throw new Error('unexpected times payload');
  }
  const days = {};
  for (const r of json.result) {
    days[r.Date] = {
      fajr: r.fajr, sunrise: r.sunrise, dhuhr: r.dhuhr, asr: r.asr,
      sunset: r.sunset, maghrib: r.maghrib, isha: r.isha, midnight: r.midnight,
    };
  }
  return days;
}

export async function fetchYear(year, fetchFn = fetch) {
  const res = await fetchFn(`${BASE}/${year}/${LAT}/${LON}`);
  if (!res.ok) throw new Error(`times api ${res.status}`);
  return parseYear(await res.json());
}

export function createTimesSource({ fetchFn = fetch, file }) {
  const days = file.read({});

  async function refresh(now) {
    const today = dateOf(now);
    const year = Number(today.slice(0, 4));
    const years = [year];
    if (today >= `${year}-12-25`) years.push(year + 1);
    let ok = false;
    for (const y of years) {
      try {
        Object.assign(days, await fetchYear(y, fetchFn));
        ok = true;
      } catch { /* сеть/формат: оставляем кэш */ }
    }
    if (ok) file.write(days);
    return ok;
  }

  return { getDays: () => days, refresh };
}
