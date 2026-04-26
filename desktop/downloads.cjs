const path = require('path');
const nodeFs = require('fs/promises');

function getSafeDownloadFileName(fileName) {
  const baseName = path.basename(String(fileName || '').trim());
  return baseName || 'arquivo-gerado';
}

function getDownloadFilters({ fileName, mimeType } = {}) {
  const lowerName = String(fileName || '').toLowerCase();
  const lowerMime = String(mimeType || '').toLowerCase();

  if (lowerMime.includes('pdf') || lowerName.endsWith('.pdf')) {
    return [
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ];
  }

  if (lowerMime.includes('spreadsheet') || lowerName.endsWith('.xlsx')) {
    return [
      { name: 'Excel', extensions: ['xlsx'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ];
  }

  if (lowerMime.includes('csv') || lowerName.endsWith('.csv')) {
    return [
      { name: 'CSV', extensions: ['csv'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ];
  }

  return [{ name: 'Todos os arquivos', extensions: ['*'] }];
}

function buildDownloadSaveDialogOptions({ fileName, mimeType } = {}) {
  const safeFileName = getSafeDownloadFileName(fileName);

  return {
    title: 'Salvar arquivo gerado',
    defaultPath: safeFileName,
    buttonLabel: 'Salvar',
    filters: getDownloadFilters({ fileName: safeFileName, mimeType }),
  };
}

function getDownloadCompletedPayload(filePath) {
  return {
    fileName: path.basename(filePath),
    filePath,
  };
}

function showSaveDialogSync(dialog, parentWindow, options) {
  if (parentWindow && !parentWindow.isDestroyed?.()) {
    return dialog.showSaveDialogSync(parentWindow, options);
  }

  return dialog.showSaveDialogSync(options);
}

function showSaveDialog(dialog, parentWindow, options) {
  if (parentWindow && !parentWindow.isDestroyed?.()) {
    return dialog.showSaveDialog(parentWindow, options);
  }

  return dialog.showSaveDialog(options);
}

async function saveGeneratedFile({
  BrowserWindow,
  dialog,
  fs = nodeFs,
  sender,
  payload,
}) {
  const fileName = getSafeDownloadFileName(payload?.fileName);
  const mimeType = payload?.mimeType || '';
  const parentWindow = BrowserWindow.fromWebContents(sender);
  const result = await showSaveDialog(
    dialog,
    parentWindow,
    buildDownloadSaveDialogOptions({ fileName, mimeType }),
  );

  if (result.canceled || !result.filePath) {
    sender.send('desktop-download-cancelled', { fileName });
    return { canceled: true, fileName };
  }

  try {
    const encoding = payload?.encoding === 'base64' ? 'base64' : undefined;
    const buffer = Buffer.from(String(payload?.data || ''), encoding);
    await fs.writeFile(result.filePath, buffer);

    const completedPayload = getDownloadCompletedPayload(result.filePath);
    sender.send('desktop-download-complete', completedPayload);
    return {
      canceled: false,
      ...completedPayload,
    };
  } catch (error) {
    sender.send('desktop-download-failed', { fileName, state: 'failed' });
    throw error;
  }
}

function registerDownloadSaveDialog({ defaultSession, BrowserWindow, dialog }) {
  defaultSession.on('will-download', (_event, item, webContents) => {
    const fileName = getSafeDownloadFileName(item.getFilename());
    const mimeType = typeof item.getMimeType === 'function' ? item.getMimeType() : '';
    const parentWindow = BrowserWindow.fromWebContents(webContents);
    const filePath = showSaveDialogSync(
      dialog,
      parentWindow,
      buildDownloadSaveDialogOptions({ fileName, mimeType }),
    );

    if (!filePath) {
      item.cancel();
      webContents.send('desktop-download-cancelled', { fileName });
      return;
    }

    item.setSavePath(filePath);
    item.once('done', (_doneEvent, state) => {
      if (state === 'completed') {
        webContents.send('desktop-download-complete', getDownloadCompletedPayload(filePath));
      } else if (state !== 'cancelled') {
        webContents.send('desktop-download-failed', { fileName, state });
      }
    });
  });
}

module.exports = {
  buildDownloadSaveDialogOptions,
  getDownloadCompletedPayload,
  getDownloadFilters,
  getSafeDownloadFileName,
  registerDownloadSaveDialog,
  saveGeneratedFile,
};
