import { BrowserWindow } from 'electron';
import path from 'node:path';

const dirname = import.meta.dirname;

// Безопасные настройки renderer для всех окон приложения.
export const secureWebPreferences = () => ({
  preload: path.join(dirname, 'preload.cjs'),
  contextIsolation: true, nodeIntegration: false, sandbox: true,
});

// Небольшое окно поверх виджета (настройки, вход). Одно на тип: повторный вызов фокусирует открытое.
export function createDialog(page, options) {
  let win = null;
  return {
    open() {
      if (win) { win.focus(); return; }
      win = new BrowserWindow({
        resizable: false, autoHideMenuBar: true, alwaysOnTop: true, ...options(),
        webPreferences: secureWebPreferences(),
      });
      win.loadFile(path.join(dirname, '../renderer', page));
      win.on('closed', () => { win = null; });
    },
    get window() { return win; },
  };
}
