import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { computeState } from '../../src/core/state.js';
import { DAYS, at } from '../fixtures.js';

const { stateAt, nextRefresh, tr } = createRequire(import.meta.url)('../../scripts/scriptable/Waqt.cjs');

describe('скрипт Scriptable совпадает с ядром приложения', () => {
  for (const [date, hm] of [['2026-07-01', '13:00'], ['2026-07-01', '04:00'], ['2026-07-01', '05:30'], ['2026-07-01', '23:00'], ['2026-07-01', '02:00'], ['2026-07-01', '20:00']]) {
    it(`${date} ${hm}`, () => {
      const now = at(date, hm);
      const a = computeState(DAYS, now);
      const b = stateAt(DAYS, now);
      expect(b.phase).toBe(a.phase);
      expect(b.prayer).toBe(a.prayer);
      expect(b.level).toBe(a.level);
      expect(b.endsAt.getTime() - now.getTime()).toBe(a.remainingMs);
    });
  }
  it('нет данных — nodata', () => {
    expect(stateAt({}, at('2026-07-01', '13:00')).phase).toBe('nodata');
  });
  it('следующее обновление — ближайший порог цвета или конец окна, не раньше минуты', () => {
    const now = at('2026-07-01', '17:00'); // до конца Зухра 40 мин → порог 30 мин через 10 мин
    const s = stateAt(DAYS, now);
    expect(nextRefresh(s, now).getTime() - now.getTime()).toBe(10 * 60000 + 0);
  });
  it('переводы: казахский и арабский, иначе русский', () => {
    expect(tr('kk', 'dhuhr')).toBe('Бесін');
    expect(tr('ar', 'dhuhr')).toBe('الظهر');
    expect(tr('xx', 'dhuhr')).toBe('Зухр');
  });
});
