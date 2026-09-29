export const T = (o = {}) => ({
  fajr: '03:00', sunrise: '05:10', dhuhr: '12:30', asr: '17:40',
  sunset: '20:10', maghrib: '20:15', isha: '22:00', midnight: '01:00', ...o,
});
export const DAYS = {
  '2026-06-30': T(),
  '2026-07-01': T(),
  '2026-07-02': T({ fajr: '03:02' }),
};
export const at = (date, hm) => new Date(`${date}T${hm}:00+05:00`);
