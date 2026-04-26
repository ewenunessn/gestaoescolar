const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  getBackendPort,
  getBackendUrls,
  getRendererBackendUrls,
  shouldBlockRendererForBackend,
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

test('uses localhost backend URLs for desktop development renderer', () => {
  assert.deepEqual(getRendererBackendUrls({ env: {}, isDev: true }), {
    baseURL: 'http://localhost:3000/api',
    healthURL: 'http://localhost:3000/health',
  });
});

test('uses packaged backend URLs for packaged renderer', () => {
  assert.deepEqual(getRendererBackendUrls({ env: {}, isDev: false }), {
    baseURL: 'http://127.0.0.1:3131/api',
    healthURL: 'http://127.0.0.1:3131/health',
  });
});

test('does not block renderer loading while packaged backend warms up', () => {
  assert.equal(shouldBlockRendererForBackend({ isDev: false }), false);
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

test('loads desktop env files without overriding explicit process env', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nutrilog-env-'));
  const envPath = path.join(dir, 'nutrilog.env');
  fs.writeFileSync(envPath, [
    '# desktop database config',
    'DATABASE_URL=postgresql://example/db',
    'JWT_SECRET="from-file"',
    'EMPTY_VALUE=',
  ].join('\n'));

  const env = createBackendEnv({ JWT_SECRET: 'from-process' }, 3131, [envPath]);

  assert.equal(env.DATABASE_URL, 'postgresql://example/db');
  assert.equal(env.JWT_SECRET, 'from-process');
  assert.equal(env.EMPTY_VALUE, '');
});
