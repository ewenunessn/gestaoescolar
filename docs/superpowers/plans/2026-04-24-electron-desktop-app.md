# Electron Desktop App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the existing React/Vite + Express platform as a Windows desktop app using Electron, with Electron starting the local backend and the backend connecting to the configured central PostgreSQL database.

**Architecture:** Electron main owns the native window and backend child process. The preload bridge exposes desktop metadata and local API URLs to the renderer. The frontend detects the desktop shell and routes Axios/health calls to `127.0.0.1`; web production keeps the hosted backend.

**Tech Stack:** Electron, Node child process, React/Vite, Express, PostgreSQL, electron-builder, Node built-in test runner.

---

## File Structure

- Modify `desktop/main.cjs`: delegate backend startup to a service module, wait for health, show a startup failure page, and load renderer.
- Create `desktop/backend-service.cjs`: pure helpers plus backend child process lifecycle.
- Create `desktop/backend-service.test.cjs`: Node tests for URL/port/path behavior.
- Modify `desktop/preload.cjs`: expose `isDesktop`, `apiBaseURL`, `healthURL`, `platform`, and `openExternal`.
- Modify `frontend/src/config/api.ts`: support the desktop environment and local backend URLs.
- Modify `frontend/src/vite-env.d.ts`: declare the desktop preload global.
- Modify `backend/src/config/config.ts`: set permissive CORS only when `DESKTOP_APP=1`.
- Modify `backend/src/index.ts`: preserve boolean CORS origin values instead of converting `true` to `"true"`.
- Modify `package.json`: add `main`, package scripts, desktop tests, and `electron-builder` config.

## Task 1: Desktop Backend Service

**Files:**
- Create: `desktop/backend-service.test.cjs`
- Create: `desktop/backend-service.cjs`
- Modify: `desktop/main.cjs`

- [ ] **Step 1: Write failing tests**

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test desktop/backend-service.test.cjs`

Expected: FAIL because `desktop/backend-service.cjs` does not exist yet.

- [ ] **Step 3: Implement backend service**

Create `desktop/backend-service.cjs` with exported helpers, `startBackend`, `stopBackend`, and `waitForBackendHealth`. Use `process.execPath` with `ELECTRON_RUN_AS_NODE=1` in packaged mode.

- [ ] **Step 4: Wire main process**

Update `desktop/main.cjs` to use the service module, set `process.env.DESKTOP_API_BASE_URL` and `process.env.DESKTOP_HEALTH_URL`, wait for backend health before loading `frontend/dist/index.html`, and render an inline error page when startup fails.

- [ ] **Step 5: Verify tests pass**

Run: `node --test desktop/backend-service.test.cjs`

Expected: PASS.

## Task 2: Renderer Desktop API Detection

**Files:**
- Modify: `desktop/preload.cjs`
- Modify: `frontend/src/config/api.ts`
- Modify: `frontend/src/vite-env.d.ts`

- [ ] **Step 1: Write failing frontend type/build expectation**

Run: `npm run build:desktop --prefix frontend`

Expected before implementation: desktop build succeeds but API config still defaults to hosted production URL for `file://` desktop mode.

- [ ] **Step 2: Expose desktop metadata in preload**

`desktopShell` should expose:

```js
{
  isDesktop: true,
  platform: process.platform,
  apiBaseURL: process.env.DESKTOP_API_BASE_URL || 'http://127.0.0.1:3131/api',
  healthURL: process.env.DESKTOP_HEALTH_URL || 'http://127.0.0.1:3131/health',
  openExternal: (url) => shell.openExternal(url),
}
```

- [ ] **Step 3: Use desktop metadata in frontend config**

`frontend/src/config/api.ts` should detect `window.desktopShell?.isDesktop` before Vercel/localhost checks and return desktop URLs from the preload bridge.

- [ ] **Step 4: Add TypeScript declarations**

Add `Window.desktopShell` shape to `frontend/src/vite-env.d.ts`.

- [ ] **Step 5: Verify frontend build**

Run: `npm run build:desktop --prefix frontend`

Expected: PASS.

## Task 3: Backend Desktop CORS

**Files:**
- Modify: `backend/src/config/config.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Identify current failure**

Desktop renderer loaded from `file://` will call `http://127.0.0.1:<port>/api`; current non-Vercel CORS only lists localhost browser origins.

- [ ] **Step 2: Set desktop CORS mode**

In `config.ts`, when `DESKTOP_APP === '1'`, set `backend.cors.origin` to `true`.

- [ ] **Step 3: Preserve boolean origin**

In `index.ts`, replace the string-only normalizer with one that keeps boolean `true`:

```ts
const rawOrigin = config.backend.cors.origin;
const corsOrigin = typeof rawOrigin === 'boolean'
  ? rawOrigin
  : Array.isArray(rawOrigin)
    ? rawOrigin.filter((o): o is string => typeof o === 'string')
    : [String(rawOrigin)];
```

- [ ] **Step 4: Verify backend build**

Run: `npm run build --prefix backend`

Expected: PASS.

## Task 4: Packaging Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add scripts**

Add:

```json
"desktop:test": "node --test desktop/*.test.cjs",
"desktop:pack": "npm run desktop:build && electron-builder --dir",
"desktop:dist": "npm run desktop:build && electron-builder --win --x64"
```

- [ ] **Step 2: Add Electron entry**

Set:

```json
"main": "desktop/main.cjs"
```

- [ ] **Step 3: Add electron-builder config**

Configure Windows output, app id, product name, included files, and unpacked backend runtime.

- [ ] **Step 4: Install builder dependency**

Run: `npm install --save-dev electron-builder`

Expected: package files update with `electron-builder`.

## Task 5: Verification

**Files:**
- All modified files above.

- [ ] **Step 1: Run desktop tests**

Run: `npm run desktop:test`

Expected: PASS.

- [ ] **Step 2: Run backend build**

Run: `npm run build --prefix backend`

Expected: PASS.

- [ ] **Step 3: Run frontend desktop build**

Run: `npm run build:desktop --prefix frontend`

Expected: PASS.

- [ ] **Step 4: Run packaging dry build**

Run: `npm run desktop:pack`

Expected: Electron app directory is created under `release/` or the configured output directory. If dependency download or code signing assets are unavailable, record the exact blocker.

## Self-Review

- Spec coverage: desktop shell, backend lifecycle, centralized database, renderer API routing, CORS, packaging, and verification are covered.
- Placeholder scan: no TBD/TODO placeholders are present.
- Type consistency: desktop API names are consistent across preload and frontend config.
