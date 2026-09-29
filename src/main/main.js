import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJsonFile } from '../core/store.js';
import { createTimesSource } from '../core/times.js';
import { buildSnapshot } from '../core/snapshot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const userData = app.getPath('userData');
const timesSource = createTimesSource({ file: createJsonFile(path.join(userData, 'times.json')) });

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

// [ipc]

function tick() {
  const now = new Date();
  const snap = buildSnapshot(timesSource.getDays(), now);
  win.webContents.send('state', snap);
  // [tick]
}

app.whenReady().then(async () => {
  createWindow();
  // [startup]
  await timesSource.refresh(new Date());
  setInterval(tick, 1000);
  tick();
});

app.on('window-all-closed', () => app.quit());
