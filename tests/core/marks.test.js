import { describe, it, expect } from 'vitest';
import {
  markKey, getMark, setMark, clearMark, mergeMarks,
  decideStatus, statusOfWindow, historyAction, trackDay,
} from '../../src/core/marks.js';
import { windowsForDate } from '../../src/core/windows.js';
import { DAYS, at } from '../fixtures.js';

const W = windowsForDate(DAYS, '2026-07-01');
const dhuhr = W[1]; // 12:30–17:40

describe('decideStatus', () => {
  it('до начала окна нельзя', () => {
    expect(decideStatus(dhuhr, at('2026-07-01', '12:00'))).toBeNull();
  });
  it('в окне — on_time, после — late', () => {
    expect(decideStatus(dhuhr, at('2026-07-01', '13:00'))).toBe('on_time');
    expect(decideStatus(dhuhr, at('2026-07-01', '17:40'))).toBe('late');
  });
});

describe('statusOfWindow', () => {
  it('без отметки: missed после окна, pending внутри, upcoming до', () => {
    expect(statusOfWindow(dhuhr, null, at('2026-07-01', '18:00'))).toBe('missed');
    expect(statusOfWindow(dhuhr, null, at('2026-07-01', '13:00'))).toBe('pending');
    expect(statusOfWindow(dhuhr, null, at('2026-07-01', '10:00'))).toBe('upcoming');
  });
  it('с отметкой — её статус', () => {
    expect(statusOfWindow(dhuhr, { status: 'late' }, at('2026-07-01', '18:00'))).toBe('late');
  });
});

describe('set/clear/get', () => {
  it('ставит, читает, отменяет через tombstone', () => {
    const iso = '2026-07-01T08:00:00.000Z';
    let m = setMark({}, '2026-07-01', 'dhuhr', 'on_time', iso);
    expect(getMark(m, '2026-07-01', 'dhuhr')).toMatchObject({ status: 'on_time', dirty: true });
    m = clearMark(m, '2026-07-01', 'dhuhr', '2026-07-01T09:00:00.000Z');
    expect(getMark(m, '2026-07-01', 'dhuhr')).toBeNull();
    expect(m[markKey('2026-07-01', 'dhuhr')]).toMatchObject({ deleted: true, dirty: true });
  });
  it('повторная отметка после отмены снимает tombstone и обновляет updatedAt', () => {
    let m = setMark({}, '2026-07-01', 'asr', 'on_time', '2026-07-01T10:00:00.000Z');
    m = clearMark(m, '2026-07-01', 'asr', '2026-07-01T10:01:00.000Z');
    m = setMark(m, '2026-07-01', 'asr', 'late', '2026-07-01T10:02:00.000Z');
    expect(getMark(m, '2026-07-01', 'asr')).toMatchObject({ status: 'late', updatedAt: '2026-07-01T10:02:00.000Z' });
  });
  it('очистка отсутствующей отметки ничего не создаёт', () => {
    expect(clearMark({}, '2026-07-01', 'asr', '2026-07-01T10:00:00.000Z')).toEqual({});
  });
});

describe('mergeMarks', () => {
  it('побеждает более поздний updatedAt', () => {
    const a = { k: { status: 'late', updatedAt: '2026-07-01T10:00:00.000Z' } };
    const b = { k: { status: 'on_time', updatedAt: '2026-07-01T11:00:00+00:00' } };
    expect(mergeMarks(a, b).k.status).toBe('on_time');
    expect(mergeMarks(b, a).k.status).toBe('on_time');
  });
  it('равные — локальная', () => {
    const a = { k: { status: 'late', updatedAt: '2026-07-01T10:00:00.000Z' } };
    const b = { k: { status: 'on_time', updatedAt: '2026-07-01T10:00:00.000Z' } };
    expect(mergeMarks(a, b).k.status).toBe('late');
  });
});

describe('historyAction', () => {
  it('красный и серый → late; зелёный и жёлтый → сброс; остальное нельзя', () => {
    expect(historyAction('missed')).toBe('late');
    expect(historyAction('nodata')).toBe('late');
    expect(historyAction('on_time')).toBe('clear');
    expect(historyAction('late')).toBe('clear');
    expect(historyAction('upcoming')).toBeNull();
    expect(historyAction('pending')).toBeNull();
  });
});

describe('trackDay', () => {
  it('записывает времена дня один раз', () => {
    const tracked = {};
    expect(trackDay(tracked, DAYS, '2026-07-01')).toBe(true);
    expect(tracked['2026-07-01']).toMatchObject({ times: DAYS['2026-07-01'], dirty: true });
    expect(trackDay(tracked, DAYS, '2026-07-01')).toBe(false);
    expect(trackDay(tracked, DAYS, '2030-01-01')).toBe(false);
  });
});
