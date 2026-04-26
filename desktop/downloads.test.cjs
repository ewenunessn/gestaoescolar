const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDownloadSaveDialogOptions,
  getDownloadCompletedPayload,
  registerDownloadSaveDialog,
  saveGeneratedFile,
} = require('./downloads.cjs');

test('builds a save dialog for generated PDFs', () => {
  assert.deepEqual(buildDownloadSaveDialogOptions({
    fileName: 'cardapio-abril.pdf',
    mimeType: 'application/pdf',
  }), {
    title: 'Salvar arquivo gerado',
    defaultPath: 'cardapio-abril.pdf',
    buttonLabel: 'Salvar',
    filters: [
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ],
  });
});

test('uses a safe fallback file name when download does not provide one', () => {
  assert.equal(buildDownloadSaveDialogOptions({ fileName: '' }).defaultPath, 'arquivo-gerado');
});

test('reports the saved file path back to the renderer', () => {
  assert.deepEqual(getDownloadCompletedPayload('C:\\Users\\Ewerton\\Desktop\\cardapio.pdf'), {
    fileName: 'cardapio.pdf',
    filePath: 'C:\\Users\\Ewerton\\Desktop\\cardapio.pdf',
  });
});

test('sets the selected save path and notifies the renderer when completed', () => {
  let willDownloadHandler;
  const defaultSession = {
    on: (eventName, handler) => {
      assert.equal(eventName, 'will-download');
      willDownloadHandler = handler;
    },
  };
  const webContents = {
    sent: [],
    send(channel, payload) {
      this.sent.push({ channel, payload });
    },
  };
  const item = {
    savePath: '',
    doneHandler: null,
    getFilename: () => 'cardapio.pdf',
    getMimeType: () => 'application/pdf',
    setSavePath(filePath) {
      this.savePath = filePath;
    },
    cancel() {
      this.cancelled = true;
    },
    once(eventName, handler) {
      assert.equal(eventName, 'done');
      this.doneHandler = handler;
    },
  };

  registerDownloadSaveDialog({
    defaultSession,
    BrowserWindow: { fromWebContents: () => null },
    dialog: { showSaveDialogSync: () => 'C:\\Users\\Ewerton\\Desktop\\cardapio.pdf' },
  });

  willDownloadHandler({}, item, webContents);
  item.doneHandler({}, 'completed');

  assert.equal(item.savePath, 'C:\\Users\\Ewerton\\Desktop\\cardapio.pdf');
  assert.deepEqual(webContents.sent, [{
    channel: 'desktop-download-complete',
    payload: {
      fileName: 'cardapio.pdf',
      filePath: 'C:\\Users\\Ewerton\\Desktop\\cardapio.pdf',
    },
  }]);
});

test('saves a generated PDF payload through the native save dialog', async () => {
  const writes = [];
  const sender = {
    sent: [],
    send(channel, payload) {
      this.sent.push({ channel, payload });
    },
  };

  const result = await saveGeneratedFile({
    BrowserWindow: { fromWebContents: () => null },
    dialog: {
      showSaveDialog: async () => ({
        canceled: false,
        filePath: 'C:\\Users\\Ewerton\\Desktop\\cardapio.pdf',
      }),
    },
    fs: {
      writeFile: async (filePath, buffer) => {
        writes.push({ filePath, text: buffer.toString('utf8') });
      },
    },
    sender,
    payload: {
      fileName: 'cardapio.pdf',
      mimeType: 'application/pdf',
      data: Buffer.from('pdf-data').toString('base64'),
      encoding: 'base64',
    },
  });

  assert.deepEqual(writes, [{
    filePath: 'C:\\Users\\Ewerton\\Desktop\\cardapio.pdf',
    text: 'pdf-data',
  }]);
  assert.deepEqual(result, {
    canceled: false,
    fileName: 'cardapio.pdf',
    filePath: 'C:\\Users\\Ewerton\\Desktop\\cardapio.pdf',
  });
  assert.deepEqual(sender.sent, [{
    channel: 'desktop-download-complete',
    payload: {
      fileName: 'cardapio.pdf',
      filePath: 'C:\\Users\\Ewerton\\Desktop\\cardapio.pdf',
    },
  }]);
});
