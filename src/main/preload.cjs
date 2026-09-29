const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('waqt', {
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
  onChime: (cb) => ipcRenderer.on('chime', (_e, m) => cb(m)),
  mark: () => ipcRenderer.invoke('mark:current'),
  markMissed: (date, prayer) => ipcRenderer.invoke('mark:missed', date, prayer),
});
