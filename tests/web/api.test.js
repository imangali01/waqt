import { describe, it, expect, vi } from 'vitest';
import { createWebApi } from '../../src/web/api.js';
import { DAYS, at } from '../fixtures.js';

const memory = (init = {}) => {
  const m = { ...init };
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, dump: () => m };
};
const make = (over = {}) => {
  let clock = at('2026-07-01', '13:00');
  const storage = over.storage ?? memory({ 'waqt.times': JSON.stringify(DAYS) });
  const w = createWebApi({ storage, names: [], fetchFn: over.fetchFn, now: () => clock, playChime: over.playChime });
  return { ...w, storage, setNow: (d) => { clock = d; } };
};

describe('веб-версия: api для виджета', () => {
  it('tick отдаёт снимок подписчику', () => {
    const w = make();
    const cb = vi.fn();
    w.api.onState(cb);
    w.tick();
    expect(cb.mock.calls[0][0]).toMatchObject({ phase: 'prayer', prayer: 'dhuhr', marked: false });
  });

  it('mark ставит отметку, она сохраняется и видна в следующем снимке', async () => {
    const w = make();
    expect(await w.api.mark()).toBe(true);
    expect(w.snapshot().marked).toBe(true);
    expect(JSON.parse(w.storage.dump()['waqt.data']).marks['2026-07-01|dhuhr'].status).toBe('on_time');
  });

  it('mark вне окна намаза (пауза) — false', async () => {
    const w = make();
    w.setNow(at('2026-07-01', '05:30'));
    expect(await w.api.mark()).toBe(false);
  });

  it('отметки переживают перезапуск', async () => {
    const w = make();
    await w.api.mark();
    const w2 = createWebApi({ storage: w.storage, names: [], now: () => at('2026-07-01', '13:00') });
    expect(w2.snapshot().marked).toBe(true);
  });

  it('язык: по умолчанию русский, смена сохраняется и сообщается подписчикам', async () => {
    const w = make();
    const cb = vi.fn();
    w.api.onLang(cb);
    expect((await w.api.getSettings()).lang).toBe('ru');
    await w.api.setLang('kk');
    expect(cb).toHaveBeenCalledWith('kk');
    expect(w.storage.dump()['waqt.lang']).toBe('"kk"');
  });

  it('напоминание: звук за 20 минут до конца, один раз', () => {
    const chime = vi.fn();
    const w = make({ playChime: chime });
    w.setNow(at('2026-07-01', '17:20'));
    w.tick();
    w.tick();
    expect(chime).toHaveBeenCalledTimes(1);
    expect(chime).toHaveBeenCalledWith(20);
  });

  it('refresh: скачивает время и кэширует; без сети остаётся кэш', async () => {
    const payload = { result: [{ Date: '2026-07-01', fajr: '03:00', sunrise: '05:10', dhuhr: '12:30', asr: '17:40', sunset: '20:10', maghrib: '20:15', isha: '22:00', midnight: '01:00' }] };
    const storage = memory();
    const ok = createWebApi({ storage, names: [], now: () => at('2026-07-01', '13:00'), fetchFn: async () => ({ ok: true, json: async () => payload }) });
    expect(await ok.refresh()).toBe(true);
    expect(JSON.parse(storage.dump()['waqt.times'])['2026-07-01'].dhuhr).toBe('12:30');
    const off = createWebApi({ storage, names: [], now: () => at('2026-07-01', '13:00'), fetchFn: async () => { throw new Error('offline'); } });
    expect(await off.refresh()).toBe(false);
    expect(off.snapshot().phase).toBe('prayer');
  });
});

function fakeClient({ rows = [], session = { user: { id: 'u1' } } } = {}) {
  const upserts = [];
  const q = (data) => {
    const o = {};
    for (const m of ['select', 'gt', 'order']) o[m] = () => o;
    o.range = async () => ({ data, error: null });
    o.upsert = async (r) => { upserts.push(r); return { error: null }; };
    return o;
  };
  return {
    upserts,
    auth: { getSession: async () => ({ data: { session } }) },
    from: (table) => (table === 'prayer_marks'
      ? { ...q(rows), select: () => q(rows), upsert: async (r) => { upserts.push(r); return { error: null }; } }
      : { ...q([]), select: () => q([]), upsert: async () => ({ error: null }) }),
  };
}

describe('веб-версия: аккаунт и синхронизация', () => {
  it('старые отметки из waqt.marks переезжают в waqt.data', () => {
    const old = { '2026-07-01|dhuhr': { status: 'on_time', markedAt: 'a', updatedAt: 'a', deleted: false, dirty: false } };
    const storage = memory({ 'waqt.times': JSON.stringify(DAYS), 'waqt.marks': JSON.stringify(old) });
    const w = createWebApi({ storage, names: [], now: () => at('2026-07-01', '13:00') });
    expect(w.snapshot().marked).toBe(true);
  });

  it('syncNow выгружает свои отметки и применяет чужие', async () => {
    const client = fakeClient({ rows: [{ date: '2026-07-01', prayer: 'fajr', status: 'on_time', marked_at: 'x', updated_at: '2026-07-01T01:00:00Z', deleted: false, synced_at: '2026-07-01T01:00:01Z' }] });
    const storage = memory({ 'waqt.times': JSON.stringify(DAYS) });
    const w = createWebApi({ storage, names: [], client, now: () => at('2026-07-01', '13:00') });
    await w.api.mark();
    const res = await w.syncNow();
    expect(res.ok).toBe(true);
    expect(client.upserts[0][0]).toMatchObject({ user_id: 'u1', date: '2026-07-01', prayer: 'dhuhr', status: 'on_time' });
    expect(w.snapshot().dots.find((d) => d.prayer === 'fajr').status).toBe('on_time');
  });

  it('клиент можно подключить позже', async () => {
    const w = make();
    expect((await w.syncNow()).reason).toBe('no-client');
    w.attachClient(fakeClient());
    expect((await w.syncNow()).ok).toBe(true);
  });

  it('без клиента syncNow ничего не делает', async () => {
    expect(await make().syncNow()).toEqual({ ok: false, reason: 'no-client' });
  });
});
