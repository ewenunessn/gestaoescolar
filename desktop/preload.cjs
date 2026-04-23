const { contextBridge, shell } = require('electron');

contextBridge.exposeInMainWorld('desktopShell', {
  openExternal: (url) => shell.openExternal(url),
});
