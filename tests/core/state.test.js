import { describe, it, expect } from 'vitest';
import { computeState, formatRemaining } from '../../src/core/state.js';
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
