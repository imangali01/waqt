export const THRESHOLDS_MIN = [20, 15, 10, 5];
const DEFAULT_GRACE_MS = 30000;

export function dueReminder({ snap, fired, graceMs = DEFAULT_GRACE_MS }) {
  if (snap.phase !== 'prayer' || snap.marked) return null;
  for (const minutes of THRESHOLDS_MIN) {
    const limit = minutes * 60000;
    if (snap.remainingMs <= limit && snap.remainingMs > limit - graceMs) {
      const key = `${snap.date}|${snap.prayer}|${minutes}`;
      if (!fired.has(key)) return { key, minutes };
    }
  }
  return null;
}
