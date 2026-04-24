const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  getBackendPort,
  getBackendUrls,
  resolveBackendEntry,
  createBackendEnv,
} = require('./backend-service.cjs');

test('uses desktop backend port from DESKTOP_BACKEND_PORT first', () => {
  assert.equal(getBackendPort({ DESKTOP_BACKEND_PORT: '4123', PORT: '3000' }), 4123);
});

test('falls back to stable desktop backend port', () => {
  assert.equal(getBackendPort({}), 3131);
});

test('builds loopback API and health URLs', () => {
  assert.deepEqual(getBackendUrls(3131), {
    baseURL: 'http://127.0.0.1:3131/api',
    healthURL: 'http://127.0.0.1:3131/health',
  });
});

test('resolves packaged backend entry from app root', () => {
  const appRoot = path.join('C:', 'app');
  assert.equal(
    resolveBackendEntry({ appRoot, isDev: false }),
    path.join(appRoot, 'backend', 'dist', 'index.js'),
  );
});

test('creates node-compatible backend environment for Electron child process', () => {
  const env = createBackendEnv({ FOO: 'bar' }, 3131);
  assert.equal(env.FOO, 'bar');
  assert.equal(env.PORT, '3131');
  assert.equal(env.HOST, '127.0.0.1');
  assert.equal(env.DESKTOP_APP, '1');
  assert.equal(env.ELECTRON_RUN_AS_NODE, '1');
});
