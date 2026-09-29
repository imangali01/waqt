import { markKey } from './marks.js';

export function rowToMark(row) {
  return {
    status: row.status,
    markedAt: row.marked_at,
    updatedAt: row.updated_at,
    deleted: Boolean(row.deleted),
    dirty: false,
  };
}

export function markToRow(userId, key, m) {
  const [date, prayer] = key.split('|');
  return {
    user_id: userId,
    date,
    prayer,
    status: m.status ?? 'late',
    marked_at: m.markedAt,
    updated_at: m.updatedAt,
    deleted: Boolean(m.deleted),
  };
}

export function applyRemote(marks, rows) {
  const out = { ...marks };
  for (const r of rows) {
    const key = markKey(r.date, r.prayer);
    const local = out[key];
    if (!local || Date.parse(r.updated_at) > Date.parse(local.updatedAt)) out[key] = rowToMark(r);
  }
  return out;
}

export const dirtyEntries = (marks) => Object.entries(marks).filter(([, m]) => m.dirty);

export function createSync({ client, data, save, now = () => new Date() }) {
  async function syncOnce() {
    const { data: sess } = await client.auth.getSession();
    const user = sess?.session?.user;
    if (!user) return { ok: false, reason: 'no-session' };

    const pulledAt = now().toISOString();
    const since = data.sync.lastPulledAt ?? '1970-01-01T00:00:00Z';

    const marksRes = await client.from('prayer_marks').select('*').gt('updated_at', since);
    if (marksRes.error) return { ok: false, reason: marksRes.error.message };
    const daysRes = await client.from('prayer_days').select('date,times');
    if (daysRes.error) return { ok: false, reason: daysRes.error.message };

    data.marks = applyRemote(data.marks, marksRes.data);
    for (const d of daysRes.data) {
      if (!data.tracked[d.date]) data.tracked[d.date] = { times: d.times, dirty: false };
    }

    const dirtyMarks = dirtyEntries(data.marks);
    if (dirtyMarks.length) {
      const { error } = await client
        .from('prayer_marks')
        .upsert(dirtyMarks.map(([k, m]) => markToRow(user.id, k, m)), { onConflict: 'user_id,date,prayer' });
      if (error) { save(); return { ok: false, reason: error.message }; }
      for (const [k, m] of dirtyMarks) {
        if (data.marks[k] && data.marks[k].updatedAt === m.updatedAt) data.marks[k] = { ...data.marks[k], dirty: false };
      }
    }

    const dirtyDays = Object.entries(data.tracked).filter(([, v]) => v.dirty);
    if (dirtyDays.length) {
      const { error } = await client
        .from('prayer_days')
        .upsert(dirtyDays.map(([date, v]) => ({ user_id: user.id, date, times: v.times })), { onConflict: 'user_id,date' });
      if (error) { save(); return { ok: false, reason: error.message }; }
      for (const [date] of dirtyDays) data.tracked[date] = { ...data.tracked[date], dirty: false };
    }

    data.sync.lastPulledAt = pulledAt;
    save();
    return { ok: true };
  }
  return { syncOnce };
}
