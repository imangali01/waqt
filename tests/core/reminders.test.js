import { describe, it, expect } from 'vitest';
import { dueReminder } from '../../src/core/reminders.js';

const snap = (remainingMs, over = {}) => ({
  phase: 'prayer', date: '2026-07-01', prayer: 'asr', remainingMs, marked: false, ...over,
});
const M = 60000;

describe('dueReminder', () => {
  it('срабатывает на порогах 20/15/10/5', () => {
    for (const t of [20, 15, 10, 5]) {
      expect(dueReminder({ snap: snap(t * M - 1000), fired: new Set() })).toMatchObject({ minutes: t });
    }
  });
  it('не срабатывает вне порогов', () => {
    expect(dueReminder({ snap: snap(25 * M), fired: new Set() })).toBeNull();
    expect(dueReminder({ snap: snap(12 * M), fired: new Set() })).toBeNull();
  });
  it('не повторяется для уже сыгранного порога', () => {
    const first = dueReminder({ snap: snap(20 * M - 1000), fired: new Set() });
    const fired = new Set([first.key]);
    expect(dueReminder({ snap: snap(20 * M - 2000), fired })).toBeNull();
  });
  it('после отметки не звучит', () => {
    expect(dueReminder({ snap: snap(10 * M - 1000, { marked: true }), fired: new Set() })).toBeNull();
  });
  it('не звучит в промежутке между намазами', () => {
    expect(dueReminder({ snap: snap(10 * M - 1000, { phase: 'gap' }), fired: new Set() })).toBeNull();
  });
  it('после сна ПК (порог давно пройден) не играет задним числом', () => {
    expect(dueReminder({ snap: snap(17 * M), fired: new Set() })).toBeNull();
    expect(dueReminder({ snap: snap(3 * M), fired: new Set() })).toBeNull();
  });
});
