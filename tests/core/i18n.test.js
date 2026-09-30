import { describe, it, expect } from 'vitest';
import { LANGS, DICT, t, normalizeLang, prayerName, daysLabel } from '../../src/core/i18n.js';

describe('i18n', () => {
  it('три языка: русский, казахский, арабский', () => {
    expect(LANGS).toEqual(['ru', 'kk', 'ar']);
  });
  it('normalizeLang: неизвестное — русский', () => {
    expect(normalizeLang('kk')).toBe('kk');
    expect(normalizeLang('xx')).toBe('ru');
    expect(normalizeLang(undefined)).toBe('ru');
  });
  it('во всех языках одинаковый набор ключей', () => {
    const keys = Object.keys(DICT.ru).sort();
    expect(Object.keys(DICT.kk).sort()).toEqual(keys);
    expect(Object.keys(DICT.ar).sort()).toEqual(keys);
  });
  it('подставляет параметры', () => {
    expect(t('ru', 'until', { t: '16:05' })).toBe('до 16:05');
    expect(t('ar', 'until', { t: '16:05' })).toContain('16:05');
  });
  it('неизвестный ключ возвращается как есть', () => {
    expect(t('ru', 'no.such.key')).toBe('no.such.key');
  });
  it('названия намазов', () => {
    expect(prayerName('ru', 'dhuhr')).toBe('Зухр');
    expect(prayerName('kk', 'dhuhr')).toBe('Бесін');
    expect(prayerName('ar', 'dhuhr')).toBe('الظهر');
  });
  it('дни: русские склонения, казахский без изменений, арабские формы', () => {
    expect(daysLabel('ru', 1)).toBe('день');
    expect(daysLabel('ru', 3)).toBe('дня');
    expect(daysLabel('ru', 7)).toBe('дней');
    expect(daysLabel('kk', 7)).toBe('күн');
    expect(daysLabel('ar', 1)).toBe('يوم');
    expect(daysLabel('ar', 2)).toBe('يومان');
    expect(daysLabel('ar', 5)).toBe('أيام');
    expect(daysLabel('ar', 12)).toBe('يومًا');
  });
});
