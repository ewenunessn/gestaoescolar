const { app, BrowserWindow, dialog, ipcMain, session, shell } = require('electron');
const path = require('path');
const {
  getRendererBackendUrls,
  shouldBlockRendererForBackend,
  startBackend,
  stopBackend,
  waitForBackendHealth,
} = require('./backend-service.cjs');
const { registerDownloadSaveDialog, saveGeneratedFile } = require('./downloads.cjs');
const {
  applyTitleBarTheme,
  getBrowserWindowAppearanceOptions,
} = require('./window-appearance.cjs');
const {
  buildAboutDialogOptions,
  openDesktopLogsFolder,
  reloadDesktopWindow,
  toggleDesktopDevTools,
} = require('./window-actions.cjs');

const isDev = !app.isPackaged && process.env.ELECTRON_FORCE_PACKAGED !== '1';
process.env.ELECTRON_IS_DEV = isDev ? '1' : '0';
let backendHandle = null;
let mainWindow = null;
const INITIAL_WINDOW_BOUNDS = {
  width: 1480,
  height: 920,
};

app.setName('NutriLog');

function resolveRendererEntry() {
  if (process.env.ELECTRON_RENDERER_URL) {
    return { url: process.env.ELECTRON_RENDERER_URL };
  }

  if (isDev) {
    return { url: 'http://127.0.0.1:5173' };
  }

  return {
    file: path.join(__dirname, '..', 'frontend', 'dist', 'index.html'),
  };
}

function configureDesktopUrls() {
  const urls = getRendererBackendUrls({ env: process.env, isDev });
  process.env.DESKTOP_API_BASE_URL = process.env.DESKTOP_API_BASE_URL || urls.baseURL;
  process.env.DESKTOP_HEALTH_URL = process.env.DESKTOP_HEALTH_URL || urls.healthURL;
  return urls;
}

function resolveDesktopEnvFiles() {
  if (isDev) {
    return [path.join(__dirname, '..', 'backend', '.env')];
  }

  return [
    path.join(path.dirname(process.execPath), 'nutrilog.env'),
    path.join(app.getPath('userData'), 'nutrilog.env'),
  ];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderStartupError(window, error) {
  const escapedMessage = escapeHtml(error?.message || error);

  window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Falha ao iniciar NutriLog</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #171b24;
            color: #f4f6fb;
            font-family: Arial, sans-serif;
          }
          main {
            width: min(680px, calc(100vw - 48px));
            border: 1px solid #30394a;
            border-radius: 8px;
            padding: 28px;
            background: #1f2531;
          }
          h1 {
            margin: 0 0 12px;
            font-size: 24px;
          }
          p {
            color: #c8d0df;
            line-height: 1.5;
          }
          code {
            display: block;
            white-space: pre-wrap;
            margin-top: 18px;
            padding: 14px;
            border-radius: 6px;
            background: #11151d;
            color: #ffb4b4;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Nao foi possivel iniciar o aplicativo</h1>
          <p>O backend local nao ficou disponivel. Verifique as variaveis de banco de dados e tente abrir o aplicativo novamente.</p>
          <code>${escapedMessage}</code>
        </main>
      </body>
    </html>
  `)}`);
}

function restoreVisibleWindow(window) {
  if (!window || window.isDestroyed()) return;

  if (window.isMinimized()) {
    window.restore();
  }

  let bounds = window.getBounds();
  if (bounds.width < 900 || bounds.height < 650) {
    window.setSize(INITIAL_WINDOW_BOUNDS.width, INITIAL_WINDOW_BOUNDS.height);
    bounds = window.getBounds();
  }

  if (bounds.x <= -30000 || bounds.y <= -30000) {
    window.center();
  }

  window.show();

  if (process.platform === 'win32') {
    window.moveTop();
  }

  window.focus();
}

function revealMainWindow(window) {
  restoreVisibleWindow(window);
  setTimeout(() => restoreVisibleWindow(window), 100);
  setTimeout(() => restoreVisibleWindow(window), 500);
}

function startBackendWarmup(window) {
  const urls = configureDesktopUrls();
  if (isDev || backendHandle) return Promise.resolve(urls);

  backendHandle = startBackend({
    appRoot: path.join(__dirname, '..'),
    isDev,
    envFiles: resolveDesktopEnvFiles(),
    logDir: path.join(app.getPath('userData'), 'logs'),
  });

  backendHandle.process.on('exit', () => {
    backendHandle = null;
  });

  return waitForBackendHealth(backendHandle.urls.healthURL, { timeoutMs: 90000 })
    .then(() => backendHandle?.urls || urls)
    .catch((error) => {
      console.error('Backend desktop startup failed:', error);
      if (!window.isDestroyed()) {
        renderStartupError(window, error);
      }
      return null;
    });
}

async function createWindow() {
  const appWindow = new BrowserWindow({
    width: INITIAL_WINDOW_BOUNDS.width,
    height: INITIAL_WINDOW_BOUNDS.height,
    minWidth: 1200,
    minHeight: 760,
    title: 'NutriLog',
    ...getBrowserWindowAppearanceOptions(process.platform, 'dark'),
    autoHideMenuBar: true,
    center: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = appWindow;

  appWindow.on('closed', () => {
    if (mainWindow === appWindow) {
      mainWindow = null;
    }
  });

  appWindow.once('ready-to-show', () => {
    revealMainWindow(appWindow);
  });

  try {
    const backendReady = startBackendWarmup(appWindow);
    const entry = resolveRendererEntry();

    if (entry.url) {
      await appWindow.loadURL(entry.url);
    } else if (entry.file) {
      await appWindow.loadFile(entry.file);
    }

    revealMainWindow(appWindow);

    if (shouldBlockRendererForBackend({ isDev })) {
      await backendReady;
    }
  } catch (error) {
    renderStartupError(appWindow, error);
  }

  appWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.on('desktop-titlebar-theme', (event, mode) => {
  const window = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  applyTitleBarTheme(window, mode, process.platform);
});

ipcMain.on('desktop-reload-app', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  reloadDesktopWindow(window);
});

ipcMain.on('desktop-toggle-devtools', (event) => {
  if (!isDev) return;

  const window = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  toggleDesktopDevTools(window);
});

ipcMain.handle('desktop-open-logs-folder', async () => openDesktopLogsFolder({
  shell,
  userDataPath: app.getPath('userData'),
}));

ipcMain.handle('desktop-show-about', async (event) => {
  const window = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  return dialog.showMessageBox(window, buildAboutDialogOptions({
    appName: app.getName(),
    version: app.getVersion(),
    electronVersion: process.versions.electron,
  }));
});

ipcMain.handle('desktop-save-generated-file', async (event, payload) => saveGeneratedFile({
  BrowserWindow,
  dialog,
  sender: event.sender,
  payload,
}));

app.whenReady().then(() => {
  registerDownloadSaveDialog({
    defaultSession: session.defaultSession,
    BrowserWindow,
    dialog,
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      revealMainWindow(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendHandle) {
    stopBackend(backendHandle.process);
    backendHandle = null;
  }
});
