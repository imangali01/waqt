import { describe, it, expect } from 'vitest';
import { dueAzan } from '../../src/core/azan.js';

const snap = (elapsedMs, over = {}) => ({ phase: 'prayer', date: '2026-07-01', prayer: 'dhuhr', elapsedMs, ...over });

describe('dueAzan', () => {
  it('звучит в момент начала намаза', () => {
    expect(dueAzan({ snap: snap(0), fired: new Set() })).toEqual({ key: '2026-07-01|dhuhr|azan' });
    expect(dueAzan({ snap: snap(29000), fired: new Set() })).toEqual({ key: '2026-07-01|dhuhr|azan' });
  });
  it('не звучит, если окно намаза началось давно (запуск или пробуждение позже)', () => {
    expect(dueAzan({ snap: snap(31000), fired: new Set() })).toBeNull();
    expect(dueAzan({ snap: snap(3600000), fired: new Set() })).toBeNull();
  });
  it('не повторяется для того же намаза', () => {
    expect(dueAzan({ snap: snap(1000), fired: new Set(['2026-07-01|dhuhr|azan']) })).toBeNull();
  });
  it('не звучит в промежутке и без данных', () => {
    expect(dueAzan({ snap: { phase: 'gap' }, fired: new Set() })).toBeNull();
    expect(dueAzan({ snap: { phase: 'nodata' }, fired: new Set() })).toBeNull();
  });
});
