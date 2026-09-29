import { describe, it, expect } from 'vitest';
import { computeState, formatRemaining, levelFor } from '../../src/core/state.js';
import { DAYS, at } from '../fixtures.js';

describe('formatRemaining', () => {
  it('часы и минуты', () => {
    expect(formatRemaining(4 * 3600e3 + 40 * 60e3)).toBe('4:40');
    expect(formatRemaining(45 * 60e3)).toBe('0:45');
  });
});

describe('computeState', () => {
  it('внутри окна Зухра', () => {
    const s = computeState(DAYS, at('2026-07-01', '13:00'));
    expect(s).toMatchObject({ phase: 'prayer', prayer: 'dhuhr', date: '2026-07-01', remainingMs: 16800000, text: '4:40' });
  });
  it('между восходом и Зухром — «до следующего»', () => {
    const s = computeState(DAYS, at('2026-07-01', '05:30'));
    expect(s).toMatchObject({ phase: 'gap', prayer: 'dhuhr', remainingMs: 7 * 3600e3, text: '7:00' });
  });
  it('после полуночи идёт Иша вчерашней даты', () => {
    const s = computeState(DAYS, at('2026-07-02', '00:30'));
    expect(s).toMatchObject({ phase: 'prayer', prayer: 'isha', date: '2026-07-01', text: '2:32' });
  });
  it('нет данных', () => {
    expect(computeState({}, at('2026-07-01', '13:00'))).toEqual({ phase: 'nodata' });
  });
});

describe('levelFor', () => {
  it('пороги 30 и 15 минут', () => {
    expect(levelFor(30 * 60e3)).toBe('normal');
    expect(levelFor(30 * 60e3 - 1)).toBe('warn');
    expect(levelFor(15 * 60e3)).toBe('warn');
    expect(levelFor(15 * 60e3 - 1)).toBe('critical');
  });
});

describe('formatRemaining: единый формат Ч:ММ (секунды отдельным полем)', () => {
  it('в последние 15 минут тоже Ч:ММ, а не ММ:СС', () => {
    expect(formatRemaining(15 * 60e3)).toBe('0:15');
    expect(formatRemaining(14 * 60e3 + 59e3)).toBe('0:14');
    expect(formatRemaining(5e3)).toBe('0:00');
  });
  it('seconds есть в любом состоянии', () => {
    expect(computeState(DAYS, at('2026-07-01', '19:50:10')).seconds).toBe('50');
    expect(computeState(DAYS, at('2026-07-01', '20:00:30')).seconds).toBe('30');
    expect(computeState(DAYS, at('2026-07-01', '05:30:15')).seconds).toBe('45');
  });
});

describe('computeState level', () => {
  it('в окне намаза считает уровень, в промежутке normal', () => {
    expect(computeState(DAYS, at('2026-07-01', '19:50')).level).toBe('warn');
    expect(computeState(DAYS, at('2026-07-01', '20:00')).level).toBe('critical');
    expect(computeState(DAYS, at('2026-07-01', '13:00')).level).toBe('normal');
    expect(computeState(DAYS, at('2026-07-01', '05:30')).level).toBe('normal');
  });
});

describe('seconds и progress', () => {
  it('seconds — две цифры остатка секунд', () => {
    const s = computeState(DAYS, at('2026-07-01', '13:00:07'));
    expect(s.seconds).toBe('53');
  });
  it('progress — доля оставшегося времени окна намаза', () => {
    // Зухр 12:30–17:40 (310 мин); в 15:05 осталось 155 мин → 0.5
    expect(computeState(DAYS, at('2026-07-01', '15:05')).progress).toBeCloseTo(0.5, 5);
  });
  it('в промежутке progress = null', () => {
    expect(computeState(DAYS, at('2026-07-01', '05:30')).progress).toBeNull();
  });
});

describe('atText', () => {
  it('в окне намаза — время конца, в промежутке — время начала (Астана)', () => {
    expect(computeState(DAYS, at('2026-07-01', '13:00')).atText).toBe('17:40');
    expect(computeState(DAYS, at('2026-07-01', '05:30')).atText).toBe('12:30');
    expect(computeState(DAYS, at('2026-07-02', '00:30')).atText).toBe('03:02');
  });
});
