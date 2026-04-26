const path = require('path');

function buildAboutDialogOptions({
  appName = 'NutriLog',
  version = '0.0.0',
  electronVersion = process.versions.electron || '',
} = {}) {
  return {
    type: 'info',
    title: `Sobre o ${appName}`,
    buttons: ['Fechar'],
    defaultId: 0,
    message: appName,
    detail: `Versao ${version}\nElectron ${electronVersion}\nSistema de Gestao Escolar`,
  };
}

function getDesktopLogsPath(userDataPath) {
  return path.join(userDataPath, 'logs');
}

async function openDesktopLogsFolder({ shell, userDataPath }) {
  return shell.openPath(getDesktopLogsPath(userDataPath));
}

function reloadDesktopWindow(window) {
  if (!window || window.isDestroyed?.()) return;
  if (typeof window.reload === 'function') {
    window.reload();
    return;
  }
  window.webContents?.reload?.();
}

function toggleDesktopDevTools(window) {
  window?.webContents?.toggleDevTools?.();
}

module.exports = {
  buildAboutDialogOptions,
  getDesktopLogsPath,
  openDesktopLogsFolder,
  reloadDesktopWindow,
  toggleDesktopDevTools,
};
