const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;
let backendProcess = null;

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

function startBackend() {
  if (backendProcess) return;

  const backendEntry = isDev
    ? path.join(__dirname, '..', 'backend', 'src', 'index.ts')
    : path.join(__dirname, '..', 'backend', 'dist', 'index.js');

  const command = isDev
    ? path.join(__dirname, '..', 'backend', 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')
    : process.execPath;

  const args = [backendEntry];
  const env = {
    ...process.env,
    PORT: process.env.PORT || '3000',
    HOST: '127.0.0.1',
  };

  backendProcess = spawn(
    command,
    args,
    {
      cwd: path.join(__dirname, '..', 'backend'),
      env,
      silent: true,
      stdio: 'ignore',
    },
  );

  backendProcess.on('exit', () => {
    backendProcess = null;
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#171b24',
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const entry = resolveRendererEntry();
  if (entry.url) {
    window.loadURL(entry.url);
  } else if (entry.file) {
    window.loadFile(entry.file);
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  if (!isDev) {
    startBackend();
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});
