import { describe, it, expect } from 'vitest';
import { toInstant, dateOf, addDays } from '../../src/core/tz.js';

describe('tz', () => {
  it('toInstant читает время как +05:00', () => {
    expect(toInstant('2026-07-01', '12:30').toISOString()).toBe('2026-07-01T07:30:00.000Z');
  });
  it('dateOf использует дату Астаны независимо от пояса ПК', () => {
    expect(dateOf(new Date('2026-07-01T19:30:00Z'))).toBe('2026-07-02');
    expect(dateOf(new Date('2026-07-01T18:59:00Z'))).toBe('2026-07-01');
  });
  it('addDays переходит через год', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
