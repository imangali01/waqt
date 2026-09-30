import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJsonFile } from '../core/store.js';
import { createTimesSource } from '../core/times.js';
import { buildSnapshot } from '../core/snapshot.js';
import { startRefresh } from '../core/refresh.js';
import { createData } from '../core/data.js';
import { computeState } from '../core/state.js';
import { setMark, clearMark, decideStatus, historyAction, trackDay, markLateIfMissed } from '../core/marks.js';
import { buildHistory } from '../core/history.js';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { parseEnv } from 'node:util';
import { createSync } from '../core/sync.js';
import { hasStoredSession } from '../core/auth-state.js';
import { animateBounds } from './animate.js';
import { windowsForDate } from '../core/windows.js';
import { dateOf } from '../core/tz.js';
import { dueReminder } from '../core/reminders.js';
import { dueAzan } from '../core/azan.js';
import { clampToDisplays, viewSize, normalizeViewMode } from '../core/window-state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userData = app.getPath('userData');
try {
  Object.assign(process.env, parseEnv(fs.readFileSync(path.join(app.getAppPath(), '.env'), 'utf8')));
} catch { /* .env нет — синхронизация выключена */ }
const timesSource = createTimesSource({ file: createJsonFile(path.join(userData, 'times.json')) });

const store = createData(createJsonFile(path.join(userData, 'data.json')));
const nowDate = () => new Date(Date.now() + Number(process.env.WAQT_SHIFT_MS ?? 0));

const authFile = createJsonFile(path.join(userData, 'auth.json'));
const authStorage = {
  getItem: (k) => authFile.read({})[k] ?? null,
  setItem: (k, v) => authFile.write({ ...authFile.read({}), [k]: v }),
  removeItem: (k) => { const o = authFile.read({}); delete o[k]; authFile.write(o); },
};
const client = process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    realtime: { transport: WebSocket },
  })
  : null;
const sync = client ? createSync({ client, data: store.data, save: store.save }) : null;
let syncTimer;
let loginWin = null;

const fired = new Set();
let names = [];
try {
  names = JSON.parse(fs.readFileSync(path.join(__dirname, '../../assets/names.json'), 'utf8'));
} catch { /* имён нет — блок не показывается */ }

let win;
let tray;
let quitting = false;
let historyOpen = false;
let widgetBounds = null;
let viewMode = normalizeViewMode(store.data.settings.viewMode);

function createWindow() {
  const size = viewSize(viewMode);
  const pos = clampToDisplays(store.data.window, screen.getAllDisplays(), size);
  win = new BrowserWindow({
    ...size, frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, hasShadow: false, show: true, skipTaskbar: true,
    ...(pos ?? {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
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
  win.webContents.on('did-finish-load', () => win.webContents.send('mode', viewMode));
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
  if (size.height > from.height) win.webContents.send('mode', mode);
  win.setResizable(true);
  await animateBounds(win, from, to);
  win.setResizable(false);
  if (size.height <= from.height) win.webContents.send('mode', mode);
  store.data.window = { x: to.x, y: to.y };
  store.save();
  buildTrayMenu();
  switching = false;
  return true;
}

ipcMain.handle('view:set', (_e, mode) => setViewMode(mode));

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
  if (action === 'late') store.data.marks = setMark(store.data.marks, date, prayer, 'late', now.toISOString());
  else if (action === 'clear') store.data.marks = clearMark(store.data.marks, date, prayer, now.toISOString());
  else return false;
  store.save();
  scheduleSync();
  return true;
});

async function runSync() {
  if (!sync) return;
  try {
    const res = await sync.syncOnce();
    win?.webContents.send('sync', res);
  } catch (e) {
    win?.webContents.send('sync', { ok: false, reason: String(e.message ?? e) });
  }
}

function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(runSync, 3000);
}

function openLogin() {
  if (loginWin) { loginWin.focus(); return; }
  loginWin = new BrowserWindow({
    width: 340, height: 330, resizable: false, autoHideMenuBar: true, title: 'Вход в Waqt', alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  loginWin.loadFile(path.join(__dirname, '../renderer/login.html'));
  loginWin.on('closed', () => { loginWin = null; });
}

ipcMain.handle('auth:login', async (_e, email, password) => {
  if (!client) return { ok: false, error: 'Supabase не настроен (.env)' };
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: /invalid login/i.test(error.message) ? 'Неверный email или пароль' : error.message };
  }
  runSync();
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
  // [tick]
}

app.whenReady().then(async () => {
  if (!gotLock) return;
  createWindow();
  createTray();
  setupAutostart();
  // [startup]
  startRefresh({
    refresh: () => timesSource.refresh(new Date()),
    isMissing: () => Object.keys(timesSource.getDays()).length === 0,
    everyMs: 5 * 3600e3,
    retryMs: 60e3,
  });
  setInterval(tick, 1000);
  tick();
  // Синхронизация стартует после таймера и не блокирует его (сеть может быть недоступна).
  if (client) {
    if (!hasStoredSession(authFile.read({}))) openLogin();
    runSync();
    setInterval(runSync, 5 * 60e3);
  }
});

app.on('before-quit', () => { quitting = true; });

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.on('second-instance', () => showWidget());

function showWidget() {
  if (!win) return;
  win.show();
  if (!historyOpen) win.setAlwaysOnTop(true, 'screen-saver');
}

function toggleWidget() {
  if (win.isVisible()) win.hide(); else showWidget();
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '../../assets/tray.png')));
  tray.setToolTip('Waqt');
  buildTrayMenu();
  tray.on('click', toggleWidget);
}

function buildTrayMenu() {
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Показать / Скрыть', click: toggleWidget },
    { label: 'Вид окна', submenu: [
      { label: 'Обычный 200×200', type: 'radio', checked: viewMode === 'full', click: () => setViewMode('full') },
      { label: 'Компактный 200×100', type: 'radio', checked: viewMode === 'compact', click: () => setViewMode('compact') },
    ] },
    { label: 'История', click: () => { showWidget(); win.webContents.send('open-history-request'); } },
    { label: 'Войти в аккаунт', click: openLogin },
    { label: 'Выйти', click: () => { quitting = true; app.quit(); } },
  ]));
}

function setupAutostart() {
  // Только для установленного приложения: в dev-режиме не трогаем автозагрузку Windows.
  if (!app.isPackaged || store.data.settings.autostartSet) return;
  app.setLoginItemSettings({ openAtLogin: true });
  store.data.settings.autostartSet = true;
  store.save();
}
