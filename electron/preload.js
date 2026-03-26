const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Informações do app
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Atualizações
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Listeners de eventos
  onUpdateDownloading: (callback) => {
    ipcRenderer.on('update-downloading', callback);
  },
  
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, percent) => {
      callback(percent);
    });
  },
  
  // Remover listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
