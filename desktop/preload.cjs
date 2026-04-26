const { contextBridge, ipcRenderer, shell } = require('electron');

const apiBaseURL = process.env.DESKTOP_API_BASE_URL || 'http://127.0.0.1:3131/api';
const healthURL = process.env.DESKTOP_HEALTH_URL || 'http://127.0.0.1:3131/health';

contextBridge.exposeInMainWorld('desktopShell', {
  isDesktop: true,
  isDev: process.env.ELECTRON_IS_DEV === '1',
  platform: process.platform,
  apiBaseURL,
  healthURL,
  openExternal: (url) => shell.openExternal(String(url)),
  showItemInFolder: (filePath) => shell.showItemInFolder(String(filePath)),
  openLogsFolder: () => ipcRenderer.invoke('desktop-open-logs-folder'),
  reloadApp: () => ipcRenderer.send('desktop-reload-app'),
  toggleDevTools: () => ipcRenderer.send('desktop-toggle-devtools'),
  showAboutDialog: () => ipcRenderer.invoke('desktop-show-about'),
  saveGeneratedFile: (payload) => ipcRenderer.invoke('desktop-save-generated-file', payload),
  onDownloadComplete: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('desktop-download-complete', listener);
    return () => ipcRenderer.removeListener('desktop-download-complete', listener);
  },
  onDownloadCancelled: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('desktop-download-cancelled', listener);
    return () => ipcRenderer.removeListener('desktop-download-cancelled', listener);
  },
  onDownloadFailed: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('desktop-download-failed', listener);
    return () => ipcRenderer.removeListener('desktop-download-failed', listener);
  },
  setTitleBarTheme: (mode) => {
    ipcRenderer.send('desktop-titlebar-theme', mode === 'light' ? 'light' : 'dark');
  },
});
