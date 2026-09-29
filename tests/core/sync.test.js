import { describe, it, expect, vi } from 'vitest';
import { rowToMark, markToRow, applyRemote, dirtyEntries, createSync } from '../../src/core/sync.js';

describe('rowToMark / markToRow', () => {
  it('преобразует туда и обратно', () => {
    const m = { status: 'late', markedAt: '2026-07-01T10:00:00.000Z', updatedAt: '2026-07-01T10:00:00.000Z', deleted: false };
    const row = markToRow('u1', '2026-07-01|asr', m);
    expect(row).toEqual({
      user_id: 'u1', date: '2026-07-01', prayer: 'asr', status: 'late',
      marked_at: m.markedAt, updated_at: m.updatedAt, deleted: false,
    });
    expect(rowToMark(row)).toMatchObject({ status: 'late', deleted: false, dirty: false });
  });
  it('tombstone уходит со status late и deleted true', () => {
    const row = markToRow('u1', '2026-07-01|asr', { status: null, markedAt: 'a', updatedAt: 'b', deleted: true });
    expect(row).toMatchObject({ status: 'late', deleted: true });
  });
});

describe('applyRemote', () => {
  it('более свежая локальная (dirty) правка не затирается', () => {
    const local = { '2026-07-01|asr': { status: 'on_time', updatedAt: '2026-07-01T12:00:00.000Z', dirty: true } };
    const rows = [{ date: '2026-07-01', prayer: 'asr', status: 'late', marked_at: 'x', updated_at: '2026-07-01T11:00:00+00:00', deleted: false }];
    expect(applyRemote(local, rows)['2026-07-01|asr'].status).toBe('on_time');
  });
  it('более свежая удалённая заменяет локальную', () => {
    const local = { '2026-07-01|asr': { status: 'on_time', updatedAt: '2026-07-01T10:00:00.000Z', dirty: false } };
    const rows = [{ date: '2026-07-01', prayer: 'asr', status: 'late', marked_at: 'x', updated_at: '2026-07-01T11:00:00+00:00', deleted: true }];
    expect(applyRemote(local, rows)['2026-07-01|asr']).toMatchObject({ deleted: true, dirty: false });
  });
  it('новая удалённая добавляется', () => {
    const rows = [{ date: '2026-07-02', prayer: 'fajr', status: 'on_time', marked_at: 'x', updated_at: '2026-07-02T01:00:00Z', deleted: false }];
    expect(applyRemote({}, rows)['2026-07-02|fajr'].status).toBe('on_time');
  });
});

describe('dirtyEntries', () => {
  it('только с dirty', () => {
    expect(dirtyEntries({ a: { dirty: true }, b: { dirty: false } }).map(([k]) => k)).toEqual(['a']);
  });
});

function fakeClient({ session = { user: { id: 'u1' } }, marksRows = [], daysRows = [], upsertError = null, onUpsert = null } = {}) {
  const upserts = [];
  const gtCalls = [];
  const query = (rows, table) => {
    const q = {
      _since: null,
      select: () => q,
      gt: (col, val) => { gtCalls.push({ table, col, val }); q._since = val; return q; },
      order: () => q,
      range: (a, b) => {
        let r = rows;
        if (q._since) r = r.filter((x) => Date.parse(x.synced_at) > Date.parse(q._since));
        return Promise.resolve({ data: r.slice(a, b + 1), error: null });
      },
    };
    return q;
  };
  const builder = (table) => ({
    ...query(table === 'prayer_marks' ? marksRows : daysRows, table),
    upsert: async (rows, opts) => {
      upserts.push({ table, rows, opts });
      if (onUpsert) onUpsert(table);
      return { error: upsertError };
    },
  });
  return {
    upserts,
    gtCalls,
    auth: { getSession: async () => ({ data: { session } }) },
    from: builder,
  };
}

const dirtyMark = (over = {}) => ({
  status: 'on_time', markedAt: 'm', updatedAt: '2026-07-01T10:00:00.000Z', deleted: false, dirty: true, ...over,
});

describe('createSync.syncOnce', () => {
  it('без сессии ничего не делает', async () => {
    const client = fakeClient({ session: null });
    const s = createSync({ client, data: { marks: {}, tracked: {}, sync: {} }, save: () => {} });
    expect(await s.syncOnce()).toEqual({ ok: false, reason: 'no-session' });
  });
  it('пушит dirty и снимает флаг, если updatedAt не менялся', async () => {
    const data = {
      marks: { '2026-07-01|asr': dirtyMark() },
      tracked: { '2026-07-01': { times: { fajr: '03:00' }, dirty: true } },
      sync: { lastPulledAt: null },
    };
    const save = vi.fn();
    const client = fakeClient();
    const res = await createSync({ client, data, save }).syncOnce();
    expect(res.ok).toBe(true);
    expect(data.marks['2026-07-01|asr'].dirty).toBe(false);
    expect(data.tracked['2026-07-01'].dirty).toBe(false);
    expect(client.upserts.map((u) => u.table).sort()).toEqual(['prayer_days', 'prayer_marks']);
    expect(save).toHaveBeenCalled();
  });
  it('ошибка пуша оставляет dirty', async () => {
    const data = { marks: { '2026-07-01|asr': dirtyMark() }, tracked: {}, sync: { lastPulledAt: null } };
    const res = await createSync({ client: fakeClient({ upsertError: { message: 'boom' } }), data, save: () => {} }).syncOnce();
    expect(res).toEqual({ ok: false, reason: 'boom' });
    expect(data.marks['2026-07-01|asr'].dirty).toBe(true);
  });
  it('подтягивает удалённые отметки и дни; курсор — серверный synced_at, не часы клиента', async () => {
    const data = { marks: {}, tracked: {}, sync: { lastPulledAt: null } };
    const client = fakeClient({
      marksRows: [
        { date: '2026-07-02', prayer: 'fajr', status: 'on_time', marked_at: 'x', updated_at: '2026-07-02T01:00:00Z', synced_at: '2026-07-02T01:00:05Z', deleted: false },
        { date: '2026-07-02', prayer: 'dhuhr', status: 'late', marked_at: 'x', updated_at: '2026-07-02T02:00:00Z', synced_at: '2026-07-02T09:30:00Z', deleted: false },
      ],
      daysRows: [{ date: '2026-07-02', times: { fajr: '03:02' } }],
    });
    await createSync({ client, data, save: () => {}, now: () => new Date('2026-07-03T00:00:00Z') }).syncOnce();
    expect(data.marks['2026-07-02|fajr'].status).toBe('on_time');
    expect(data.tracked['2026-07-02']).toEqual({ times: { fajr: '03:02' }, dirty: false });
    expect(data.sync.lastPulledAt).toBe('2026-07-02T09:30:00Z');
    expect(client.gtCalls[0]).toMatchObject({ table: 'prayer_marks', col: 'synced_at' });
  });
  it('без новых строк курсор не двигается', async () => {
    const data = { marks: {}, tracked: {}, sync: { lastPulledAt: '2026-07-02T09:30:00Z' } };
    await createSync({ client: fakeClient(), data, save: () => {} }).syncOnce();
    expect(data.sync.lastPulledAt).toBe('2026-07-02T09:30:00Z');
  });
  it('строка, выгруженная другим устройством позже с более ранним updated_at, подтягивается', async () => {
    const data = { marks: {}, tracked: {}, sync: { lastPulledAt: '2026-07-02T12:10:00Z' } };
    const client = fakeClient({
      marksRows: [{ date: '2026-07-02', prayer: 'asr', status: 'on_time', marked_at: 'x', updated_at: '2026-07-02T12:00:00Z', synced_at: '2026-07-02T12:30:00Z', deleted: false }],
    });
    await createSync({ client, data, save: () => {} }).syncOnce();
    expect(data.marks['2026-07-02|asr'].status).toBe('on_time');
  });
  it('забирает больше 1000 строк постранично (отметки и дни)', async () => {
    const marksRows = [];
    for (let i = 0; i < 2500; i++) {
      const d = new Date(Date.UTC(2020, 0, 1) + i * 86400000).toISOString().slice(0, 10);
      marksRows.push({ date: d, prayer: 'fajr', status: 'on_time', marked_at: 'x', updated_at: '2026-07-02T01:00:00Z', synced_at: `2026-07-02T01:${String(i % 60).padStart(2, '0')}:00Z`, deleted: false });
    }
    const daysRows = [];
    for (let i = 0; i < 1500; i++) {
      const d = new Date(Date.UTC(2020, 0, 1) + i * 86400000).toISOString().slice(0, 10);
      daysRows.push({ date: d, times: { fajr: '03:00' } });
    }
    const data = { marks: {}, tracked: {}, sync: { lastPulledAt: null } };
    await createSync({ client: fakeClient({ marksRows, daysRows }), data, save: () => {} }).syncOnce();
    expect(Object.keys(data.marks)).toHaveLength(2500);
    expect(Object.keys(data.tracked)).toHaveLength(1500);
  });
  it('правка, сделанная во время пуша, остаётся dirty', async () => {
    const data = { marks: { '2026-07-01|asr': dirtyMark() }, tracked: {}, sync: { lastPulledAt: null } };
    const client = fakeClient({
      onUpsert: (table) => {
        if (table !== 'prayer_marks') return;
        data.marks['2026-07-01|asr'] = dirtyMark({ status: 'late', updatedAt: '2026-07-01T10:00:05.000Z' });
      },
    });
    await createSync({ client, data, save: () => {} }).syncOnce();
    expect(data.marks['2026-07-01|asr']).toMatchObject({ status: 'late', dirty: true });
  });
});
