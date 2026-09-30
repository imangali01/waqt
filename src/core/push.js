import { prayerName, normalizeLang } from './i18n.js';

// Серверные push-напоминания (телефон). Те же пороги, что у звука на компьютере:
// 20/15/10 мин, каждую минуту в последние 5 минут, каждые 30 секунд в последние 2.
export const PUSH_THRESHOLDS_MIN = [20, 15, 10, 5, 4, 3, 2, 1.5, 1, 0.5];
const START_GRACE_MS = 45000;
// Сервер опрашивается каждые 30 секунд, окно с запасом; при пересечении окон берётся ближайший порог.
const DEFAULT_GRACE_MS = 45000;

export function duePush({ snap, sent, graceMs = DEFAULT_GRACE_MS }) {
  if (snap.phase !== 'prayer') return null;

  const startKey = `${snap.date}|${snap.prayer}|start`;
  if (snap.elapsedMs >= 0 && snap.elapsedMs < START_GRACE_MS && !sent.has(startKey)) {
    return { key: startKey, kind: 'start' };
  }

  if (snap.marked) return null;
  // От меньшего порога к большему: при перекрытии окон нужен тот, что ближе к концу намаза.
  for (const minutes of [...PUSH_THRESHOLDS_MIN].sort((a, b) => a - b)) {
    const limit = minutes * 60000;
    if (snap.remainingMs <= limit && snap.remainingMs > limit - graceMs) {
      const key = `${snap.date}|${snap.prayer}|left|${minutes}`;
      if (!sent.has(key)) return { key, kind: 'left', minutes };
    }
  }
  return null;
}

const TEXT = {
  ru: {
    min: 'мин', sec: 'с',
    left: (p, left) => `${p}: осталось ${left}`, leftBody: 'Отметьте намаз прочитанным',
    start: (p) => `Время намаза: ${p}`, startBody: 'Наступило время намаза',
  },
  kk: {
    min: 'мин', sec: 'сек',
    left: (p, left) => `${p}: ${left} қалды`, leftBody: 'Намазды оқып белгілеңіз',
    start: (p) => `Намаз уақыты: ${p}`, startBody: 'Намаз уақыты кірді',
  },
  ar: {
    min: 'د', sec: 'ث',
    left: (p, left) => `${p}: متبقي ${left}`, leftBody: 'ضع علامة على الصلاة',
    start: (p) => `حان وقت ${p}`, startBody: 'دخل وقت الصلاة',
  },
};

function leftLabel(x, minutes) {
  const total = Math.round(minutes * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return [m ? `${m} ${x.min}` : '', s ? `${s} ${x.sec}` : ''].filter(Boolean).join(' ');
}

export function pushMessage({ kind, minutes, prayer, lang }) {
  const l = normalizeLang(lang);
  const x = TEXT[l];
  const p = prayerName(l, prayer);
  if (kind === 'start') return { title: x.start(p), body: x.startBody, tag: `waqt-${prayer}` };
  return { title: x.left(p, leftLabel(x, minutes)), body: x.leftBody, tag: `waqt-${prayer}` };
}
