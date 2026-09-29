import { describe, it, expect } from 'vitest';
import { buildHistory } from '../../src/core/history.js';
import { setMark } from '../../src/core/marks.js';
import { DAYS, at } from '../fixtures.js';

const tracked = {
  '2026-06-30': { times: DAYS['2026-06-30'], dirty: false },
  '2026-07-01': { times: DAYS['2026-07-01'], dirty: false },
};
const status = (cols, date, prayer) => cols.find((c) => c.date === date).cells.find((x) => x.prayer === prayer).status;

describe('buildHistory', () => {
  const now = at('2026-07-01', '13:00');

  it('красные, зелёные, жёлтые, серые', () => {
    let marks = setMark({}, '2026-06-30', 'fajr', 'on_time', '2026-06-30T00:00:00.000Z');
    marks = setMark(marks, '2026-06-30', 'dhuhr', 'late', '2026-06-30T13:00:00.000Z');
    const cols = buildHistory({ days: DAYS, tracked, marks, now, startDate: '2026-06-29', count: 4 });
    expect(cols.map((c) => c.date)).toEqual(['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02']);
    expect(status(cols, '2026-06-29', 'fajr')).toBe('nodata');
    expect(status(cols, '2026-06-30', 'fajr')).toBe('on_time');
    expect(status(cols, '2026-06-30', 'dhuhr')).toBe('late');
    expect(status(cols, '2026-06-30', 'asr')).toBe('missed');
    expect(status(cols, '2026-07-01', 'fajr')).toBe('missed');
    expect(status(cols, '2026-07-01', 'dhuhr')).toBe('pending');
    expect(status(cols, '2026-07-01', 'asr')).toBe('upcoming');
    expect(status(cols, '2026-07-02', 'fajr')).toBe('upcoming');
  });

  it('отметка в серый день показывается жёлтой', () => {
    const marks = setMark({}, '2026-06-29', 'fajr', 'late', '2026-07-01T05:00:00.000Z');
    const cols = buildHistory({ days: DAYS, tracked, marks, now, startDate: '2026-06-29', count: 1 });
    expect(status(cols, '2026-06-29', 'fajr')).toBe('late');
  });

  it('отменённая отметка снова красная, а в сером дне снова серая', () => {
    const marks = { '2026-06-30|asr': { status: null, deleted: true, updatedAt: '2026-07-01T05:00:00.000Z' }, '2026-06-29|fajr': { status: null, deleted: true, updatedAt: '2026-07-01T05:00:00.000Z' } };
    const cols = buildHistory({ days: DAYS, tracked, marks, now, startDate: '2026-06-29', count: 2 });
    expect(status(cols, '2026-06-30', 'asr')).toBe('missed');
    expect(status(cols, '2026-06-29', 'fajr')).toBe('nodata');
  });
});
