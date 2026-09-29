const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('waqt', {
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
  onChime: (cb) => ipcRenderer.on('chime', (_e, m) => cb(m)),
  onAzan: (cb) => ipcRenderer.on('azan', () => cb()),
  onView: (cb) => ipcRenderer.on('view', (_e, v) => cb(v)),
  onOpenHistoryRequest: (cb) => ipcRenderer.on('open-history-request', () => cb()),
  mark: () => ipcRenderer.invoke('mark:current'),
  markMissed: (date, prayer) => ipcRenderer.invoke('mark:missed', date, prayer),
  openHistory: () => ipcRenderer.invoke('history:open'),
  closeHistory: () => ipcRenderer.invoke('history:close'),
  getHistory: (startDate, count) => ipcRenderer.invoke('history:get', startDate, count),
  login: (email, password) => ipcRenderer.invoke('auth:login', email, password),
  onSync: (cb) => ipcRenderer.on('sync', (_e, s) => cb(s)),
  toggleCell: (date, prayer) => ipcRenderer.invoke('history:toggle', date, prayer),
});
