import { describe, it, expect } from 'vitest';
import { buildSnapshot } from '../../src/core/snapshot.js';
import { DAYS, at } from '../fixtures.js';

describe('buildSnapshot', () => {
  it('добавляет русское название намаза', () => {
    const s = buildSnapshot(DAYS, at('2026-07-01', '13:00'));
    expect(s).toMatchObject({ phase: 'prayer', prayer: 'dhuhr', prayerName: 'Зухр' });
  });
  it('nodata без названия', () => {
    expect(buildSnapshot({}, at('2026-07-01', '13:00'))).toEqual({ phase: 'nodata' });
  });
});
