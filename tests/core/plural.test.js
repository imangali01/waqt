import { describe, it, expect } from 'vitest';
import { daysWord } from '../../src/core/plural.js';

describe('daysWord', () => {
  it('склоняет «день» по-русски', () => {
    expect(daysWord(0)).toBe('дней');
    expect(daysWord(1)).toBe('день');
    expect(daysWord(2)).toBe('дня');
    expect(daysWord(4)).toBe('дня');
    expect(daysWord(5)).toBe('дней');
    expect(daysWord(11)).toBe('дней');
    expect(daysWord(12)).toBe('дней');
    expect(daysWord(21)).toBe('день');
    expect(daysWord(22)).toBe('дня');
    expect(daysWord(111)).toBe('дней');
    expect(daysWord(101)).toBe('день');
  });
});
