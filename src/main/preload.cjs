const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('waqt', {
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s)),
});
