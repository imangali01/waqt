import { describe, it, expect } from 'vitest';
import { computeStreak } from '../../src/core/streak.js';
import { setMark } from '../../src/core/marks.js';
import { PRAYERS } from '../../src/core/prayer-windows.js';
import { T, at } from '../fixtures.js';

// Пять дней данных подряд: 06-28 … 07-02 (Иша 07-02 закрывается фаджром 07-03).
const DAYS = Object.fromEntries(
  ['2026-06-28', '2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03'].map((d) => [d, T()]),
);
const ISO = '2026-07-01T00:00:00.000Z';

function withDay(marks, date, status = 'on_time', prayers = PRAYERS) {
  let m = marks;
  for (const p of prayers) m = setMark(m, date, p, status, ISO);
  return m;
}

describe('computeStreak', () => {
  it('без отметок серия 0', () => {
    expect(computeStreak({ days: DAYS, marks: {}, now: at('2026-07-01', '13:00') })).toBe(0);
  });

  it('считает подряд идущие дни, где все 5 намазов вовремя; сегодняшний день в процессе не входит', () => {
    let marks = withDay({}, '2026-06-30');
    marks = withDay(marks, '2026-06-29');
    // сегодня 13:00: Фаджр вовремя, остальное впереди
    marks = withDay(marks, '2026-07-01', 'on_time', ['fajr']);
    expect(computeStreak({ days: DAYS, marks, now: at('2026-07-01', '13:00') })).toBe(2);
  });

  it('вчера тоже полностью вовремя — серия растёт', () => {
    let marks = withDay({}, '2026-06-30');
    marks = withDay(marks, '2026-07-01');
    expect(computeStreak({ days: DAYS, marks, now: at('2026-07-01', '13:00') })).toBe(2);
  });

  it('сегодня все пять вовремя — сегодняшний день входит в серию', () => {
    let marks = withDay({}, '2026-06-30');
    marks = withDay(marks, '2026-07-01');
    expect(computeStreak({ days: DAYS, marks, now: at('2026-07-01', '23:30') })).toBe(2);
  });

  it('жёлтый (прочитан позже) намаз в прошлом ломает серию', () => {
    let marks = withDay({}, '2026-06-29');
    marks = withDay(marks, '2026-06-30', 'on_time', ['fajr', 'dhuhr', 'asr', 'maghrib']);
    marks = setMark(marks, '2026-06-30', 'isha', 'late', ISO);
    expect(computeStreak({ days: DAYS, marks, now: at('2026-07-01', '13:00') })).toBe(0);
  });

  it('пропущенный день в середине обрывает серию', () => {
    let marks = withDay({}, '2026-06-28');
    marks = withDay(marks, '2026-06-30');
    marks = withDay(marks, '2026-07-01');
    expect(computeStreak({ days: DAYS, marks, now: at('2026-07-01', '23:30') })).toBe(2);
  });

  it('сегодня уже пропущен намаз (окно закончилось без отметки) — серия 0', () => {
    const marks = withDay({}, '2026-06-30');
    // 07-01 Фаджр 03:00–05:10 без отметки, сейчас 13:00
    expect(computeStreak({ days: DAYS, marks, now: at('2026-07-01', '13:00') })).toBe(0);
  });

  it('сегодняшний пропуск в конце дня тоже обнуляет серию, даже если остальные вовремя', () => {
    const marks = withDay(withDay({}, '2026-06-30'), '2026-07-01', 'on_time', ['fajr', 'dhuhr', 'asr', 'maghrib']);
    expect(computeStreak({ days: DAYS, marks, now: at('2026-07-02', '01:00') })).toBe(0);
  });

  it('отменённая отметка (tombstone) не считается', () => {
    let marks = withDay({}, '2026-06-30');
    marks['2026-06-30|asr'] = { status: null, deleted: true, updatedAt: ISO };
    expect(computeStreak({ days: DAYS, marks, now: at('2026-07-01', '13:00') })).toBe(0);
  });

  it('нет данных времён — серия по прошлым дням считается по отметкам', () => {
    const marks = withDay(withDay({}, '2026-06-29'), '2026-06-30');
    expect(computeStreak({ days: {}, marks, now: at('2026-07-01', '13:00') })).toBe(2);
  });
});
