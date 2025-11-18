// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getDevices: () => ipcRenderer.invoke('get-devices'),
  install: (deviceId, keybind) => ipcRenderer.invoke('generate-files', { deviceId, keybind }),
});
