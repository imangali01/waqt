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
import { setMark, decideStatus, trackDay } from '../core/marks.js';
import { windowsForDate } from '../core/windows.js';
import { dateOf } from '../core/tz.js';
import { dueReminder } from '../core/reminders.js';
import { clampToDisplays } from '../core/window-state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userData = app.getPath('userData');
const timesSource = createTimesSource({ file: createJsonFile(path.join(userData, 'times.json')) });

const store = createData(createJsonFile(path.join(userData, 'data.json')));
const nowDate = () => new Date(Date.now() + Number(process.env.WAQT_SHIFT_MS ?? 0));

const fired = new Set();
let names = [];
try {
  names = JSON.parse(fs.readFileSync(path.join(__dirname, '../../assets/names.json'), 'utf8'));
} catch { /* имён нет — блок не показывается */ }

let win;
let tray;
let quitting = false;

function createWindow() {
  const pos = clampToDisplays(store.data.window, screen.getAllDisplays());
  win = new BrowserWindow({
    width: 200, height: 200, frame: false, transparent: true, resizable: false,
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
}

ipcMain.handle('mark:current', () => {
  const now = nowDate();
  const s = computeState(timesSource.getDays(), now);
  if (s.phase !== 'prayer') return false;
  const w = windowsForDate(timesSource.getDays(), s.date).find((x) => x.prayer === s.prayer);
  const status = decideStatus(w, now);
  if (!status) return false;
  store.data.marks = setMark(store.data.marks, s.date, s.prayer, status, now.toISOString());
  store.save();
  return true;
});

ipcMain.handle('mark:missed', (_e, date, prayer) => {
  const now = nowDate();
  const w = windowsForDate(timesSource.getDays(), date).find((x) => x.prayer === prayer);
  if (!w || now < w.end) return false;
  store.data.marks = setMark(store.data.marks, date, prayer, 'late', now.toISOString());
  store.save();
  return true;
});

function tick() {
  const now = nowDate();
  if (trackDay(store.data.tracked, timesSource.getDays(), dateOf(now))) store.save();
  const snap = buildSnapshot(timesSource.getDays(), store.data.marks, now, names);
  win.webContents.send('state', snap);
  const due = dueReminder({ snap, fired });
  if (due) {
    fired.add(due.key);
    win.webContents.send('chime', due.minutes);
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
});

app.on('before-quit', () => { quitting = true; });

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
app.on('second-instance', () => showWidget());

function showWidget() {
  if (!win) return;
  win.show();
  win.setAlwaysOnTop(true, 'screen-saver');
}

function toggleWidget() {
  if (win.isVisible()) win.hide(); else showWidget();
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '../../assets/tray.png')));
  tray.setToolTip('Waqt');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Показать / Скрыть', click: toggleWidget },
    { label: 'История', click: () => { showWidget(); /* [tray-history] */ } },
    { label: 'Выйти', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', toggleWidget);
}

function setupAutostart() {
  // Только для установленного приложения: в dev-режиме не трогаем автозагрузку Windows.
  if (!app.isPackaged || store.data.settings.autostartSet) return;
  app.setLoginItemSettings({ openAtLogin: true });
  store.data.settings.autostartSet = true;
  store.save();
}
