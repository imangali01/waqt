import { describe, it, expect, vi } from 'vitest';
import { parseYear, fetchYear, createTimesSource } from '../../src/core/times.js';

const apiRow = (Date, fajr = '03:00') => ({
  imsak: '02:50', fajr, sunrise: '05:10', dhuhr: '12:30', asr: '17:40',
  sunset: '20:10', maghrib: '20:15', isha: '22:00', midnight: '01:00', Date,
});
const okFetch = (rows) => vi.fn(async () => ({ ok: true, json: async () => ({ result: rows }) }));
const memFile = (initial = {}) => {
  let v = initial;
  return { read: (d) => v ?? d, write: (x) => { v = x; } };
};

describe('parseYear', () => {
  it('строит map по датам', () => {
    const days = parseYear({ result: [apiRow('2026-07-01')] });
    expect(days['2026-07-01']).toEqual({
      fajr: '03:00', sunrise: '05:10', dhuhr: '12:30', asr: '17:40',
      sunset: '20:10', maghrib: '20:15', isha: '22:00', midnight: '01:00',
    });
  });
  it('неожиданная форма — ошибка', () => {
    expect(() => parseYear({})).toThrow();
    expect(() => parseYear({ result: [] })).toThrow();
  });
});

describe('fetchYear', () => {
  it('HTTP ошибка — исключение', async () => {
    const f = vi.fn(async () => ({ ok: false, status: 500 }));
    await expect(fetchYear(2026, f)).rejects.toThrow('500');
  });
});

describe('createTimesSource', () => {
  it('успех: данные в памяти и в кэше', async () => {
    const file = memFile({});
    const src = createTimesSource({ fetchFn: okFetch([apiRow('2026-07-01')]), file });
    const ok = await src.refresh(new Date('2026-07-01T07:00:00Z'));
    expect(ok).toBe(true);
    expect(src.getDays()['2026-07-01']).toBeDefined();
    expect(file.read({})['2026-07-01']).toBeDefined();
  });
  it('ошибка сети: кэш не затирается', async () => {
    const file = memFile({ '2026-07-01': { fajr: '03:00' } });
    const src = createTimesSource({ fetchFn: vi.fn(async () => { throw new Error('offline'); }), file });
    expect(await src.refresh(new Date('2026-07-01T07:00:00Z'))).toBe(false);
    expect(src.getDays()['2026-07-01']).toEqual({ fajr: '03:00' });
  });
  it('в конце декабря запрашивает и следующий год', async () => {
    const f = okFetch([apiRow('2026-12-31')]);
    const src = createTimesSource({ fetchFn: f, file: memFile({}) });
    await src.refresh(new Date('2026-12-30T07:00:00Z'));
    const urls = f.mock.calls.map((c) => c[0]);
    expect(urls[0]).toContain('/2026/');
    expect(urls[1]).toContain('/2027/');
  });
});
