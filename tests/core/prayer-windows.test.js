import { describe, it, expect } from 'vitest';
import { windowsForDate } from '../../src/core/prayer-windows.js';
import { DAYS, at } from '../fixtures.js';

describe('windowsForDate', () => {
  it('даёт пять окон с правильными концами', () => {
    const w = windowsForDate(DAYS, '2026-07-01');
    expect(w.map((x) => x.prayer)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
    expect(w[0].end).toEqual(at('2026-07-01', '05:10'));
    expect(w[1].end).toEqual(at('2026-07-01', '17:40'));
    expect(w[2].end).toEqual(at('2026-07-01', '20:10'));
    expect(w[3].end).toEqual(at('2026-07-01', '22:00'));
    expect(w[4].end).toEqual(at('2026-07-02', '03:02'));
  });
  it('без данных следующего дня иши нет', () => {
    const w = windowsForDate(DAYS, '2026-07-02');
    expect(w.map((x) => x.prayer)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib']);
  });
  it('нет данных за день — пустой список', () => {
    expect(windowsForDate(DAYS, '2030-01-01')).toEqual([]);
  });
});
