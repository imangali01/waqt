import { describe, it, expect } from 'vitest';
import { duePush, pushMessage } from '../../src/core/push.js';

const M = 60000;
const snap = (remainingMs, over = {}) => ({
  phase: 'prayer', date: '2026-07-01', prayer: 'asr', remainingMs, elapsedMs: 3 * 3600e3, marked: false, ...over,
});

describe('duePush', () => {
  it('начало намаза: push даже если отмечать ещё нечего', () => {
    expect(duePush({ snap: snap(3 * 3600e3, { elapsedMs: 5000 }), sent: new Set() }))
      .toEqual({ key: '2026-07-01|asr|start', kind: 'start' });
  });
  it('старт не повторяется и не догоняет задним числом', () => {
    const key = '2026-07-01|asr|start';
    expect(duePush({ snap: snap(3 * 3600e3, { elapsedMs: 5000 }), sent: new Set([key]) })).toBeNull();
    expect(duePush({ snap: snap(3 * 3600e3, { elapsedMs: 120000 }), sent: new Set() })).toBeNull();
  });
  it('напоминание на каждом пороге для неотмеченного', () => {
    for (const t of [20, 15, 10, 5, 4, 3, 2, 1.5, 1, 0.5]) {
      expect(duePush({ snap: snap(t * M - 1000), sent: new Set() })).toMatchObject({ kind: 'left', minutes: t });
    }
  });
  it('после отметки не шлёт напоминаний', () => {
    expect(duePush({ snap: snap(5 * M - 1000, { marked: true }), sent: new Set() })).toBeNull();
  });
  it('вне порогов и между намазами тишина', () => {
    expect(duePush({ snap: snap(12 * M), sent: new Set() })).toBeNull();
    expect(duePush({ snap: { phase: 'gap' }, sent: new Set() })).toBeNull();
    expect(duePush({ snap: { phase: 'nodata' }, sent: new Set() })).toBeNull();
  });
  it('не повторяет отправленный порог', () => {
    const first = duePush({ snap: snap(5 * M - 1000), sent: new Set() });
    expect(duePush({ snap: snap(5 * M - 2000), sent: new Set([first.key]) })).toBeNull();
  });
  it('окно шире шага в 30 с: выбирает ближайший порог, а не более ранний', () => {
    // 84 с до конца попадает в окна порогов 2:00 и 1:30 — нужен 1:30
    expect(duePush({ snap: snap(84000), sent: new Set() })).toMatchObject({ minutes: 1.5 });
    // 2:00 уже отправлен, а 1:30 нет
    expect(duePush({ snap: snap(84000), sent: new Set(['2026-07-01|asr|left|2']) })).toMatchObject({ minutes: 1.5 });
  });
});

describe('pushMessage', () => {
  it('напоминание: название намаза и остаток', () => {
    expect(pushMessage({ kind: 'left', minutes: 5, prayer: 'asr', lang: 'ru' }))
      .toMatchObject({ title: 'Аср: осталось 5 мин', tag: 'waqt-asr' });
    expect(pushMessage({ kind: 'left', minutes: 1.5, prayer: 'asr', lang: 'ru' }).title).toBe('Аср: осталось 1 мин 30 с');
    expect(pushMessage({ kind: 'left', minutes: 0.5, prayer: 'asr', lang: 'ru' }).title).toBe('Аср: осталось 30 с');
  });
  it('начало намаза', () => {
    expect(pushMessage({ kind: 'start', prayer: 'maghrib', lang: 'ru' }).title).toBe('Время намаза: Магриб');
  });
  it('казахский и арабский, неизвестный язык — русский', () => {
    expect(pushMessage({ kind: 'start', prayer: 'fajr', lang: 'kk' }).title).toContain('Таң');
    expect(pushMessage({ kind: 'left', minutes: 5, prayer: 'fajr', lang: 'ar' }).title).toContain('5');
    expect(pushMessage({ kind: 'start', prayer: 'asr', lang: 'xx' }).title).toBe('Время намаза: Аср');
  });
});
