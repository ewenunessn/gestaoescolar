const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAboutDialogOptions,
  getDesktopLogsPath,
  openDesktopLogsFolder,
  reloadDesktopWindow,
  toggleDesktopDevTools,
} = require('./window-actions.cjs');

test('builds the desktop about dialog content', () => {
  assert.deepEqual(buildAboutDialogOptions({
    appName: 'NutriLog',
    version: '1.0.0',
    electronVersion: '37.2.1',
  }), {
    type: 'info',
    title: 'Sobre o NutriLog',
    buttons: ['Fechar'],
    defaultId: 0,
    message: 'NutriLog',
    detail: 'Versao 1.0.0\nElectron 37.2.1\nSistema de Gestao Escolar',
  });
});

test('resolves the desktop logs folder from userData', () => {
  assert.equal(
    getDesktopLogsPath('C:\\Users\\Ewerton\\AppData\\Roaming\\NutriLog'),
    'C:\\Users\\Ewerton\\AppData\\Roaming\\NutriLog\\logs',
  );
});

test('opens the desktop logs folder through the shell bridge', async () => {
  const calls = [];
  const shell = {
    openPath: async (target) => {
      calls.push(target);
      return '';
    },
  };

  await openDesktopLogsFolder({
    shell,
    userDataPath: 'C:\\Users\\Ewerton\\AppData\\Roaming\\NutriLog',
  });

  assert.deepEqual(calls, ['C:\\Users\\Ewerton\\AppData\\Roaming\\NutriLog\\logs']);
});

test('reloads the current desktop window when requested', () => {
  let reloadCount = 0;

  reloadDesktopWindow({
    isDestroyed: () => false,
    reload: () => {
      reloadCount += 1;
    },
  });

  assert.equal(reloadCount, 1);
});

test('toggles devtools through the current window webContents', () => {
  let toggleCount = 0;

  toggleDesktopDevTools({
    webContents: {
      toggleDevTools: () => {
        toggleCount += 1;
      },
    },
  });

  assert.equal(toggleCount, 1);
});
