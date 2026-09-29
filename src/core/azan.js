const DEFAULT_GRACE_MS = 30000;

// Азан в момент начала окна намаза. Если приложение запущено или ПК проснулся
// позже, чем через graceMs после начала, азан не играет «задним числом».
export function dueAzan({ snap, fired, graceMs = DEFAULT_GRACE_MS }) {
  if (snap.phase !== 'prayer') return null;
  if (snap.elapsedMs < 0 || snap.elapsedMs >= graceMs) return null;
  const key = `${snap.date}|${snap.prayer}|azan`;
  return fired.has(key) ? null : { key };
}
