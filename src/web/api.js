// Веб-версия виджета (iPhone/Safari, «На экран Домой»): тот же интерфейс window.waqt, что в Electron,
// но данные и отметки лежат в localStorage браузера.
import { fetchYear } from '../core/times.js';
import { buildSnapshot } from '../core/snapshot.js';
import { computeState } from '../core/state.js';
import { windowsForDate } from '../core/windows.js';
import { dateOf } from '../core/tz.js';
import { setMark, decideStatus, markLateIfMissed } from '../core/marks.js';
import { dueReminder } from '../core/reminders.js';
import { normalizeLang, LANGS } from '../core/i18n.js';

const KEY = { times: 'waqt.times', marks: 'waqt.marks', lang: 'waqt.lang' };

export function createWebApi({ storage, names = [], fetchFn, now = () => new Date(), playChime = () => {} }) {
  const read = (k, d) => {
    try { return JSON.parse(storage.getItem(k)) ?? d; } catch { return d; }
  };
  const write = (k, v) => {
    try { storage.setItem(k, JSON.stringify(v)); } catch { /* хранилище недоступно (приватный режим) */ }
  };
  let days = read(KEY.times, {});
  let marks = read(KEY.marks, {});
  let lang = normalizeLang(read(KEY.lang, 'ru'));
  const fired = new Set();
  const langCbs = [];
  let stateCb = () => {};

  const snapshot = () => buildSnapshot(days, marks, now(), names);

  function tick() {
    const snap = snapshot();
    stateCb(snap);
    const due = dueReminder({ snap, fired });
    if (due) {
      fired.add(due.key);
      playChime(due.minutes);
    }
  }

  async function refresh() {
    const today = dateOf(now());
    const year = Number(today.slice(0, 4));
    const years = today >= `${year}-12-25` ? [year, year + 1] : [year];
    let ok = false;
    for (const y of years) {
      try {
        Object.assign(days, await fetchYear(y, fetchFn));
        ok = true;
      } catch { /* нет сети — остаёмся на кэше */ }
    }
    if (ok) write(KEY.times, days);
    return ok;
  }

  const setLang = async (l) => {
    lang = normalizeLang(l);
    write(KEY.lang, lang);
    for (const cb of langCbs) cb(lang);
    return lang;
  };

  const api = {
    onState: (cb) => { stateCb = cb; },
    onChime: () => {},
    onAzan: () => {},
    onSync: () => {},
    onView: () => {},
    onOpenHistoryRequest: () => {},
    onMode: (cb) => cb('web'),
    onLang: (cb) => { langCbs.push(cb); },
    onSettings: () => {},
    getSettings: async () => ({ lang, viewMode: 'full', modes: [] }),
    setLang,
    // В вебе кнопка настроек переключает язык по кругу.
    openSettings: async () => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]),
    openHistory: async () => {},
    async mark() {
      const t = now();
      const s = computeState(days, t);
      if (s.phase !== 'prayer') return false;
      const w = windowsForDate(days, s.date).find((x) => x.prayer === s.prayer);
      const status = decideStatus(w, t);
      if (!status) return false;
      marks = setMark(marks, s.date, s.prayer, status, t.toISOString());
      write(KEY.marks, marks);
      tick();
      return true;
    },
    async markMissed(date, prayer) {
      const t = now();
      const w = windowsForDate(days, date).find((x) => x.prayer === prayer);
      const next = w && markLateIfMissed(marks, w, t, t.toISOString());
      if (!next) return false;
      marks = next;
      write(KEY.marks, marks);
      tick();
      return true;
    },
  };

  return { api, tick, refresh, snapshot };
}
