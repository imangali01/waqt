import { dateOf, addDays } from './tz.js';
import { windowsForDate } from './windows.js';

const pad = (n) => String(n).padStart(2, '0');

const MIN = 60000;

const hmOf = (d) => new Date(d.getTime() + 5 * 3600e3).toISOString().slice(11, 16);
const secondsOf = (ms) => pad(Math.floor(Math.max(0, ms) / 1000) % 60);

export function levelFor(ms) {
  if (ms < 15 * MIN) return 'critical';
  if (ms < 30 * MIN) return 'warn';
  return 'normal';
}

export function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}:${pad(m)}`;
}

function allWindows(days, now) {
  const today = dateOf(now);
  return [-1, 0, 1]
    .flatMap((d) => windowsForDate(days, addDays(today, d)))
    .sort((a, b) => a.start - b.start);
}

export function computeState(days, now) {
  const windows = allWindows(days, now);
  const current = windows.find((w) => w.start <= now && now < w.end);
  if (current) {
    const remainingMs = current.end - now;
    return { phase: 'prayer', prayer: current.prayer, date: current.date, remainingMs, level: levelFor(remainingMs), text: formatRemaining(remainingMs), seconds: secondsOf(remainingMs), atText: hmOf(current.end), progress: remainingMs / (current.end - current.start) };
  }
  const next = windows.find((w) => w.start > now);
  if (next) {
    const remainingMs = next.start - now;
    return { phase: 'gap', prayer: next.prayer, date: next.date, remainingMs, level: 'normal', text: formatRemaining(remainingMs), seconds: secondsOf(remainingMs), atText: hmOf(next.start), progress: null };
  }
  return { phase: 'nodata' };
}
