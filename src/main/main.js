import { app, BrowserWindow, ipcMain, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { createJsonFile } from './json-file.js';
import { createData } from './app-data.js';
import { animateBounds } from './animate.js';
import { needsAutostart } from './autostart.js';
import { clampToDisplays, viewSize, normalizeViewMode, VIEW_MODES } from './widget-bounds.js';
import { createSupabaseSync } from './supabase-sync.js';
import { createTray } from './tray.js';
import { createDialog, secureWebPreferences } from './dialog-window.js';
import { createTimesSource } from '../core/times.js';
import { buildSnapshot } from '../core/snapshot.js';
import { startRefresh } from '../core/refresh.js';
import { computeState } from '../core/state.js';
import { setMark, clearMark, decideStatus, historyAction, trackDay, markLateIfMissed } from '../core/marks.js';
import { buildHistory } from '../core/history.js';
import { windowsForDate } from '../core/prayer-windows.js';
import { dateOf } from '../core/tz.js';
import { dueReminder } from '../core/reminders.js';
import { dueAzan } from '../core/azan.js';
import { normalizeLang, t } from '../core/i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userData = app.getPath('userData');
try {
  Object.assign(process.env, parseEnv(fs.readFileSync(path.join(app.getAppPath(), '.env'), 'utf8')));
} catch { /* .env нет — синхронизация выключена */ }
const timesSource = createTimesSource({ file: createJsonFile(path.join(userData, 'times.json')) });

const store = createData(createJsonFile(path.join(userData, 'data.json')));
const nowDate = () => new Date(Date.now() + Number(process.env.WAQT_SHIFT_MS ?? 0));

let win;
let tray;
let quitting = false;
let historyOpen = false;
let widgetBounds = null;
let viewMode = normalizeViewMode(store.data.settings.viewMode);
let lang = normalizeLang(store.data.settings.lang);

const supa = createSupabaseSync({
  userData, appPath: app.getAppPath(), env: process.env, store,
  onResult: (res) => win?.webContents.send('sync', res),
});
const scheduleSync = () => supa?.scheduleSync();

const fired = new Set();
let names = [];
try {
  names = JSON.parse(fs.readFileSync(path.join(__dirname, '../../assets/names.json'), 'utf8'));
} catch { /* имён нет — блок не показывается */ }

const settings = createDialog('settings.html', () => ({ width: 380, height: 570, useContentSize: true, title: t(lang, 'win.settings') }));
const login = createDialog('login.html', () => ({ width: 340, height: 330, title: t(lang, 'login.title') }));

function createWindow() {
  const size = viewSize(viewMode);
  const pos = clampToDisplays(store.data.window, screen.getAllDisplays(), size);
  win = new BrowserWindow({
    ...size, icon: path.join(__dirname, '../../assets/tray.png'), frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, hasShadow: false, show: true, skipTaskbar: true,
    ...(pos ?? {}),
    webPreferences: {
      ...secureWebPreferences(),
      backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  let moveTimer;
  win.on('moved', () => {
    if (historyOpen) return;
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      const [x, y] = win.getPosition();
      store.data.window = { x, y };
      store.save();
    }, 300);
  });
  win.on('close', (e) => {
    if (!quitting) { e.preventDefault(); win.hide(); }
  });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  win.webContents.on('did-finish-load', () => win.webContents.send('mode', viewMode, VIEW_MODES));
}

let switching = false;
async function setViewMode(mode) {
  mode = normalizeViewMode(mode);
  if (mode === viewMode || historyOpen || switching) return false;
  switching = true;
  const from = win.getBounds();
  const size = viewSize(mode);
  // Не даём окну вылезти за рабочую область при росте.
  const a = screen.getDisplayMatching(from).workArea;
  const to = {
    x: Math.min(Math.max(from.x, a.x), a.x + a.width - size.width),
    y: Math.min(Math.max(from.y, a.y), a.y + a.height - size.height),
    ...size,
  };
  viewMode = mode;
  store.data.settings.viewMode = mode;
  store.save();
  // Растём — сначала раскладка, потом окно; сжимаемся — сначала окно, потом раскладка.
  if (size.height * size.width > from.height * from.width) win.webContents.send('mode', mode, VIEW_MODES);
  win.setResizable(true);
  await animateBounds(win, from, to);
  win.setResizable(false);
  if (size.height * size.width <= from.height * from.width) win.webContents.send('mode', mode, VIEW_MODES);
  store.data.window = { x: to.x, y: to.y };
  store.save();
  tray.rebuildMenu();
  switching = false;
  return true;
}

ipcMain.handle('view:set', async (_e, mode) => {
  const ok = await setViewMode(mode);
  settings.window?.webContents.send('settings', { viewMode });
  return ok;
});
ipcMain.handle('settings:get', () => ({ viewMode, modes: VIEW_MODES, lang }));
ipcMain.handle('lang:set', (_e, l) => {
  lang = normalizeLang(l);
  store.data.settings.lang = lang;
  store.save();
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('lang', lang);
  settings.window?.setTitle(t(lang, 'win.settings'));
  login.window?.setTitle(t(lang, 'login.title'));
  tray.rebuildMenu();
  return lang;
});
ipcMain.handle('settings:open', () => settings.open());

ipcMain.handle('mark:current', () => {
  const now = nowDate();
  const s = computeState(timesSource.getDays(), now);
  if (s.phase !== 'prayer') return false;
  const w = windowsForDate(timesSource.getDays(), s.date).find((x) => x.prayer === s.prayer);
  const status = decideStatus(w, now);
  if (!status) return false;
  store.data.marks = setMark(store.data.marks, s.date, s.prayer, status, now.toISOString());
  store.save();
  scheduleSync();
  return true;
});

ipcMain.handle('mark:unmark', () => {
  const now = nowDate();
  const s = computeState(timesSource.getDays(), now);
  if (s.phase !== 'prayer') return false;
  const marks = clearMark(store.data.marks, s.date, s.prayer, now.toISOString());
  if (marks === store.data.marks) return false;
  store.data.marks = marks;
  store.save();
  scheduleSync();
  return true;
});

ipcMain.handle('mark:missed', (_e, date, prayer) => {
  const now = nowDate();
  const w = windowsForDate(timesSource.getDays(), date).find((x) => x.prayer === prayer);
  const marks = w && markLateIfMissed(store.data.marks, w, now, now.toISOString());
  if (!marks) return false;
  store.data.marks = marks;
  store.save();
  scheduleSync();
  return true;
});

ipcMain.handle('history:open', async () => {
  if (historyOpen) return;
  historyOpen = true;
  widgetBounds = win.getBounds();
  const area = screen.getDisplayMatching(widgetBounds).workArea;
  // Фиксированный размер раскрытого окна (ужимается только если экран меньше).
  const w = Math.min(1200, area.width);
  const h = Math.min(500, area.height);
  const target = {
    x: area.x + Math.round((area.width - w) / 2),
    y: area.y + Math.round((area.height - h) / 2),
    width: w, height: h,
  };
  win.setAlwaysOnTop(false);
  win.setResizable(true);
  await animateBounds(win, widgetBounds, target);
  win.webContents.send('view', 'history');
});

ipcMain.handle('history:close', async () => {
  if (!historyOpen) return;
  win.webContents.send('view', 'widget');
  await animateBounds(win, win.getBounds(), widgetBounds);
  win.setResizable(false);
  win.setAlwaysOnTop(true, 'screen-saver');
  historyOpen = false;
});

const historyArgs = (startDate, count) => ({
  days: timesSource.getDays(), tracked: store.data.tracked, marks: store.data.marks,
  now: nowDate(), startDate, count,
});

ipcMain.handle('history:get', (_e, startDate, count) => buildHistory(historyArgs(startDate, count)));

ipcMain.handle('history:toggle', (_e, date, prayer) => {
  const now = nowDate();
  const cell = buildHistory(historyArgs(date, 1))[0].cells.find((c) => c.prayer === prayer);
  const action = historyAction(cell?.status);
  if (action === 'late' || action === 'on_time') store.data.marks = setMark(store.data.marks, date, prayer, action, now.toISOString());
  else if (action === 'clear') store.data.marks = clearMark(store.data.marks, date, prayer, now.toISOString());
  else return false;
  store.save();
  scheduleSync();
  return true;
});

ipcMain.handle('auth:login', async (_e, email, password) => {
  if (!supa) return { ok: false, error: t(lang, 'login.noconfig') };
  const error = await supa.login(email, password);
  if (error) return { ok: false, error: /invalid login/i.test(error) ? t(lang, 'login.badcreds') : error };
  return { ok: true };
});

function tick() {
  const now = nowDate();
  if (trackDay(store.data.tracked, timesSource.getDays(), dateOf(now))) { store.save(); scheduleSync(); }
  const snap = buildSnapshot(timesSource.getDays(), store.data.marks, now, names);
  win.webContents.send('state', snap);
  // Пока страница грузится, звук потерялся бы, а ключ уже считался бы сыгранным.
  if (win.webContents.isLoading()) return;
  const due = dueReminder({ snap, fired });
  if (due) {
    fired.add(due.key);
    win.webContents.send('chime', due.minutes);
  }
  const azan = dueAzan({ snap, fired });
  if (azan) {
    fired.add(azan.key);
    win.webContents.send('azan');
  }
}

app.whenReady().then(async () => {
  if (!gotLock) return;
  createWindow();
  tray = createTray({
    iconPath: path.join(__dirname, '../../assets/tray.png'),
    getLang: () => lang,
    onToggle: toggleWidget,
    onSettings: () => settings.open(),
    onHistory: () => { showWidget(); win.webContents.send('open-history-request'); },
    onLogin: () => login.open(),
    onQuit: () => { quitting = true; app.quit(); },
  });
  if (process.platform === 'darwin') {
    // На macOS виджет — без иконки в Dock, поверх всех окон и на всех рабочих столах.
    app.dock?.hide();
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  setupAutostart();
  startRefresh({
    refresh: () => timesSource.refresh(new Date()),
    isMissing: () => Object.keys(timesSource.getDays()).length === 0,
    everyMs: 5 * 3600e3,
    retryMs: 60e3,
  });
  setInterval(tick, 1000);
  tick();
  // Синхронизация стартует после таймера и не блокирует его (сеть может быть недоступна).
  if (supa) {
    if (!supa.hasSession()) login.open();
    supa.start();
  }
});

app.on('before-quit', () => { quitting = true; });

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.on('second-instance', () => showWidget());
app.on('activate', () => showWidget());

function showWidget() {
  if (!win) return;
  win.show();
  if (!historyOpen) win.setAlwaysOnTop(true, 'screen-saver');
}

function toggleWidget() {
  if (win.isVisible()) win.hide(); else showWidget();
}

function setupAutostart() {
  // Только для установленного приложения: в dev-режиме не трогаем автозагрузку Windows.
  if (!needsAutostart({ packaged: app.isPackaged, settings: store.data.settings, exePath: process.execPath })) return;
  app.setLoginItemSettings({ openAtLogin: true });
  store.data.settings.autostartPath = process.execPath;
  store.save();
}
