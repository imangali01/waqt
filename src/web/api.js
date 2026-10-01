// Веб-версия виджета (iPhone/Safari, «На экран Домой»): тот же интерфейс window.waqt, что в Electron,
// но данные и отметки лежат в localStorage браузера.
import { fetchYear } from '../core/times.js';
import { buildSnapshot } from '../core/snapshot.js';
import { computeState } from '../core/state.js';
import { windowsForDate } from '../core/windows.js';
import { dateOf, addDays } from '../core/tz.js';
import { buildHistory } from '../core/history.js';
import { setMark, clearMark, decideStatus, markLateIfMissed, historyAction, trackDay, getMark, statusOfWindow } from '../core/marks.js';
import { dueReminder } from '../core/reminders.js';
import { normalizeLang, LANGS } from '../core/i18n.js';
import { createSync } from '../core/sync.js';

const KEY = { times: 'waqt.times', marks: 'waqt.marks', data: 'waqt.data', lang: 'waqt.lang' };

export function createWebApi({ storage, names = [], fetchFn, client = null, demo = false, now = () => new Date(), playChime = () => {}, onSync = () => {} }) {
  const read = (k, d) => {
    try { return JSON.parse(storage.getItem(k)) ?? d; } catch { return d; }
  };
  const write = (k, v) => {
    try { storage.setItem(k, JSON.stringify(v)); } catch { /* хранилище недоступно (приватный режим) */ }
  };
  let days = read(KEY.times, {});
  // Локальные данные в том же виде, что в Electron-версии, чтобы работал общий core/sync.js.
  const data = {
    marks: {}, tracked: {}, sync: { lastPulledAt: null },
    ...read(KEY.data, { marks: read(KEY.marks, {}) }),
  };
  // Демо (лендинг) живёт только в памяти и не трогает данные настоящего приложения.
  const saveData = () => { if (!demo) write(KEY.data, data); };
  let lang = normalizeLang(read(KEY.lang, 'ru'));
  const fired = new Set();
  const langCbs = [];
  let stateCb = () => {};

  const snapshot = () => buildSnapshot(days, data.marks, now(), names);

  function tick() {
    if (trackDay(data.tracked, days, dateOf(now()))) { saveData(); scheduleSync(); }
    const snap = snapshot();
    stateCb(snap);
    const due = dueReminder({ snap, fired });
    if (due) {
      fired.add(due.key);
      playChime(due.minutes);
    }
  }

  // Для примера на лендинге: все прошедшие намазы последних 40 дней прочитаны вовремя.
  function seedDemo() {
    const t = now();
    const today = dateOf(t);
    for (let i = 0; i < 40; i++) {
      const date = addDays(today, -i);
      for (const w of windowsForDate(days, date)) {
        if (w.end <= t && !getMark(data.marks, date, w.prayer)) {
          data.marks = setMark(data.marks, date, w.prayer, 'on_time', w.start.toISOString());
        }
      }
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
    if (ok && demo) seedDemo();
    return ok;
  }

  let sync = client ? createSync({ client, data, save: saveData }) : null;
  // Клиент Supabase подключается позже (он грузится из сети и не должен задерживать показ таймера).
  const attachClient = (c) => { sync = createSync({ client: c, data, save: saveData }); };
  let syncTimer;
  async function syncNow() {
    if (!sync) return { ok: false, reason: 'no-client' };
    try {
      const res = await sync.syncOnce();
      onSync(res);
      return res;
    } catch (e) {
      const res = { ok: false, reason: String(e.message ?? e) };
      onSync(res);
      return res;
    }
  }
  function scheduleSync() {
    if (!sync) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, 500);
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
    async getDay(date = dateOf(now())) {
      const t = now();
      const hm = (d) => new Date(d.getTime() + 5 * 3600e3).toISOString().slice(11, 16);
      return windowsForDate(days, date).map((w) => ({
        prayer: w.prayer, start: hm(w.start), end: hm(w.end),
        status: statusOfWindow(w, getMark(data.marks, w.date, w.prayer), t),
      }));
    },
    async getTimes(date = dateOf(now())) {
      return days[date] ?? null;
    },
    async getHistory(startDate, count) {
      return buildHistory({ days, tracked: data.tracked, marks: data.marks, now: now(), startDate, count });
    },
    async toggleCell(date, prayer) {
      const t = now();
      const cell = buildHistory({ days, tracked: data.tracked, marks: data.marks, now: t, startDate: date, count: 1 })[0].cells.find((c) => c.prayer === prayer);
      const action = historyAction(cell?.status);
      if (action === 'late' || action === 'on_time') data.marks = setMark(data.marks, date, prayer, action, t.toISOString());
      else if (action === 'clear') data.marks = clearMark(data.marks, date, prayer, t.toISOString());
      else return false;
      saveData();
      scheduleSync();
      tick();
      return true;
    },
    async mark() {
      const t = now();
      const s = computeState(days, t);
      if (s.phase !== 'prayer') return false;
      const w = windowsForDate(days, s.date).find((x) => x.prayer === s.prayer);
      const status = decideStatus(w, t);
      if (!status) return false;
      data.marks = setMark(data.marks, s.date, s.prayer, status, t.toISOString());
      saveData();
      scheduleSync();
      tick();
      return true;
    },
    async markMissed(date, prayer) {
      const t = now();
      const w = windowsForDate(days, date).find((x) => x.prayer === prayer);
      const next = w && markLateIfMissed(data.marks, w, t, t.toISOString());
      if (!next) return false;
      data.marks = next;
      saveData();
      scheduleSync();
      tick();
      return true;
    },
  };

  return { api, tick, refresh, snapshot, syncNow, attachClient };
}
