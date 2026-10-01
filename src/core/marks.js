export const markKey = (date, prayer) => `${date}|${prayer}`;

export function getMark(marks, date, prayer) {
  const m = marks[markKey(date, prayer)];
  return m && !m.deleted ? m : null;
}

export function setMark(marks, date, prayer, status, nowIso) {
  return {
    ...marks,
    [markKey(date, prayer)]: { status, markedAt: nowIso, updatedAt: nowIso, deleted: false, dirty: true },
  };
}

export function clearMark(marks, date, prayer, nowIso) {
  const key = markKey(date, prayer);
  if (!marks[key] || marks[key].deleted) return marks;
  return { ...marks, [key]: { status: null, markedAt: marks[key].markedAt, updatedAt: nowIso, deleted: true, dirty: true } };
}

export function mergeMarks(local, remote) {
  const out = { ...local };
  for (const [key, r] of Object.entries(remote)) {
    const l = out[key];
    if (!l || Date.parse(r.updatedAt) > Date.parse(l.updatedAt)) out[key] = r;
  }
  return out;
}

export function decideStatus(window, now) {
  if (now < window.start) return null;
  return now < window.end ? 'on_time' : 'late';
}

export function statusOfWindow(window, mark, now) {
  if (mark) return mark.status;
  if (now >= window.end) return 'missed';
  if (now < window.start) return 'upcoming';
  return 'pending';
}

export function historyAction(status) {
  if (status === 'on_time') return 'clear';
  if (status === 'late') return 'on_time';
  if (status === 'missed' || status === 'nodata') return 'late';
  return null;
}

export function trackDay(tracked, days, date) {
  if (tracked[date] || !days[date]) return false;
  tracked[date] = { times: days[date], dirty: true };
  return true;
}

// Пропущенный намаз (окно закончилось, отметки нет) → late. Иначе null: ничего менять не нужно.
export function markLateIfMissed(marks, window, now, nowIso) {
  if (now < window.end) return null;
  if (getMark(marks, window.date, window.prayer)) return null;
  return setMark(marks, window.date, window.prayer, 'late', nowIso);
}
