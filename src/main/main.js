import { app, BrowserWindow, ipcMain } from 'electron';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userData = app.getPath('userData');
const timesSource = createTimesSource({ file: createJsonFile(path.join(userData, 'times.json')) });

const store = createData(createJsonFile(path.join(userData, 'data.json')));
const nowDate = () => new Date(Date.now() + Number(process.env.WAQT_SHIFT_MS ?? 0));

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 200, height: 200, frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, hasShadow: false, show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
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
  const snap = buildSnapshot(timesSource.getDays(), store.data.marks, now);
  win.webContents.send('state', snap);
  // [tick]
}

app.whenReady().then(async () => {
  createWindow();
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

app.on('window-all-closed', () => app.quit());
