import { describe, it, expect } from 'vitest';
import { buildSnapshot } from '../../src/core/snapshot.js';
import { setMark } from '../../src/core/marks.js';
import { DAYS, at } from '../fixtures.js';

describe('buildSnapshot', () => {
  it('добавляет русское название намаза', () => {
    const s = buildSnapshot(DAYS, {}, at('2026-07-01', '13:00'));
    expect(s).toMatchObject({ phase: 'prayer', prayer: 'dhuhr', prayerName: 'Зухр', marked: false });
  });
  it('nodata без названия', () => {
    expect(buildSnapshot({}, {}, at('2026-07-01', '13:00'))).toMatchObject({ phase: 'nodata' });
  });
  it('marked true после отметки текущего намаза', () => {
    const marks = setMark({}, '2026-07-01', 'dhuhr', 'on_time', '2026-07-01T08:00:00.000Z');
    expect(buildSnapshot(DAYS, marks, at('2026-07-01', '13:00')).marked).toBe(true);
  });
  it('точки за сегодня и список пропущенных', () => {
    const marks = setMark({}, '2026-07-01', 'fajr', 'on_time', '2026-07-01T00:30:00.000Z');
    const s = buildSnapshot(DAYS, marks, at('2026-07-01', '13:00'));
    expect(s.dots.map((d) => d.status)).toEqual(['on_time', 'pending', 'upcoming', 'upcoming', 'upcoming']);
    const s2 = buildSnapshot(DAYS, {}, at('2026-07-01', '18:00'));
    expect(s2.missed).toEqual([{ date: '2026-07-01', prayer: 'fajr', name: 'Фаджр' }, { date: '2026-07-01', prayer: 'dhuhr', name: 'Зухр' }]);
    expect(s2.dots.map((d) => d.status)).toEqual(['missed', 'missed', 'pending', 'upcoming', 'upcoming']);
  });
  it('nodata содержит пустые точки', () => {
    const s = buildSnapshot({}, {}, at('2026-07-01', '13:00'));
    expect(s.dots).toEqual([]);
  });
});

describe('buildSnapshot имя дня', () => {
  const names = [{ index: 1, translit: 'Ар-Рахман' }];
  it('имя только в промежутке', () => {
    expect(buildSnapshot(DAYS, {}, at('2026-07-01', '05:30'), names).name).toEqual(names[0]);
    expect(buildSnapshot(DAYS, {}, at('2026-07-01', '13:00'), names).name).toBeUndefined();
  });
});

describe('buildSnapshot streak', () => {
  const full = (date) => ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
    .reduce((m, p) => setMark(m, date, p, 'on_time', '2026-07-01T00:00:00.000Z'), {});
  it('серия дней в снимке', () => {
    // сегодня Фаджр (его окно уже закончилось к 13:00) прочитан вовремя, остальные намазы впереди
    const marks = setMark({ ...full('2026-06-30'), ...full('2026-06-29') }, '2026-07-01', 'fajr', 'on_time', '2026-07-01T00:00:00.000Z');
    expect(buildSnapshot(DAYS, marks, at('2026-07-01', '13:00')).streak).toBe(2);
    expect(buildSnapshot(DAYS, {}, at('2026-07-01', '13:00')).streak).toBe(0);
  });
  it('серия есть и без данных времён', () => {
    expect(buildSnapshot({}, full('2026-06-30'), at('2026-07-01', '13:00')).streak).toBe(1);
  });
});

describe('buildSnapshot pulse (последние 5 минут без отметки)', () => {
  // Аср 17:40–20:10 (sunset)
  it('пульсирует, когда осталось 5 минут или меньше и намаз не отмечен', () => {
    expect(buildSnapshot(DAYS, {}, at('2026-07-01', '20:05:00')).pulse).toBe(true);
    expect(buildSnapshot(DAYS, {}, at('2026-07-01', '20:09:30')).pulse).toBe(true);
  });
  it('не пульсирует, пока осталось больше 5 минут', () => {
    expect(buildSnapshot(DAYS, {}, at('2026-07-01', '20:04:59')).pulse).toBe(false);
    expect(buildSnapshot(DAYS, {}, at('2026-07-01', '13:00')).pulse).toBe(false);
  });
  it('не пульсирует после отметки', () => {
    const marks = setMark({}, '2026-07-01', 'asr', 'on_time', '2026-07-01T14:00:00.000Z');
    expect(buildSnapshot(DAYS, marks, at('2026-07-01', '20:07:00')).pulse).toBe(false);
  });
  it('не пульсирует в промежутке между намазами и без данных', () => {
    expect(buildSnapshot(DAYS, {}, at('2026-07-01', '05:30')).pulse).toBe(false);
    expect(buildSnapshot({}, {}, at('2026-07-01', '13:00')).pulse).toBe(false);
  });
});
