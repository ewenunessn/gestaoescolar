const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { spawn } = require('child_process');

const DEFAULT_BACKEND_PORT = 3131;

function parsePort(value) {
  const port = Number.parseInt(value, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return port;
}

function getBackendPort(env = process.env) {
  return parsePort(env.DESKTOP_BACKEND_PORT) || DEFAULT_BACKEND_PORT;
}

function getBackendUrls(port) {
  const origin = `http://127.0.0.1:${port}`;
  return {
    baseURL: `${origin}/api`,
    healthURL: `${origin}/health`,
  };
}

function getRendererBackendUrls({ env = process.env, isDev = false } = {}) {
  if (isDev) {
    return {
      baseURL: env.DESKTOP_API_BASE_URL || env.VITE_API_URL || 'http://localhost:3000/api',
      healthURL: env.DESKTOP_HEALTH_URL || env.VITE_HEALTH_URL || 'http://localhost:3000/health',
    };
  }

  return getBackendUrls(getBackendPort(env));
}

function shouldBlockRendererForBackend() {
  return false;
}

function resolveBackendEntry({ appRoot, isDev }) {
  return path.join(appRoot, 'backend', isDev ? 'src' : 'dist', isDev ? 'index.ts' : 'index.js');
}

function resolveBackendCommand({ appRoot, isDev, electronExecPath, platform = process.platform }) {
  if (!isDev) return electronExecPath;

  return path.join(
    appRoot,
    'backend',
    'node_modules',
    '.bin',
    platform === 'win32' ? 'tsx.cmd' : 'tsx',
  );
}

function stripEnvQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function readEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};

  const env = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key) continue;
    env[key] = stripEnvQuotes(value);
  }

  return env;
}

function readEnvFiles(filePaths = []) {
  return filePaths.reduce((merged, filePath) => ({
    ...merged,
    ...readEnvFile(filePath),
  }), {});
}

function createBackendEnv(baseEnv = process.env, port = DEFAULT_BACKEND_PORT, envFiles = []) {
  const fileEnv = readEnvFiles(envFiles);

  return {
    ...fileEnv,
    ...baseEnv,
    PORT: String(port),
    HOST: '127.0.0.1',
    NODE_ENV: baseEnv.NODE_ENV || 'desktop',
    DESKTOP_APP: '1',
    ELECTRON_RUN_AS_NODE: '1',
  };
}

function requestHealth(healthURL, timeoutMs) {
  return new Promise((resolve, reject) => {
    const parsedURL = new URL(healthURL);
    const client = parsedURL.protocol === 'https:' ? https : http;
    const request = client.get(parsedURL, (response) => {
      response.resume();
      if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
        resolve();
        return;
      }
      reject(new Error(`Health check returned HTTP ${response.statusCode}`));
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Health check timed out after ${timeoutMs}ms`));
    });
    request.on('error', reject);
  });
}

async function waitForBackendHealth(healthURL, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const intervalMs = options.intervalMs || 500;
  const requestTimeoutMs = options.requestTimeoutMs || 2000;
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await requestHealth(healthURL, requestTimeoutMs);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`Backend did not become healthy at ${healthURL}: ${lastError?.message || 'timeout'}`);
}

function createLogStreams(logDir) {
  if (!logDir) return null;

  fs.mkdirSync(logDir, { recursive: true });
  return {
    stdout: fs.createWriteStream(path.join(logDir, 'backend.log'), { flags: 'a' }),
    stderr: fs.createWriteStream(path.join(logDir, 'backend-error.log'), { flags: 'a' }),
  };
}

function startBackend(options) {
  const appRoot = options.appRoot;
  const isDev = Boolean(options.isDev);
  const port = getBackendPort(options.env || process.env);
  const urls = getBackendUrls(port);
  const backendEntry = resolveBackendEntry({ appRoot, isDev });
  const command = resolveBackendCommand({
    appRoot,
    isDev,
    electronExecPath: options.electronExecPath || process.execPath,
    platform: options.platform || process.platform,
  });
  const backendEnv = createBackendEnv(options.env || process.env, port, options.envFiles || []);
  const logStreams = createLogStreams(options.logDir);

  const child = spawn(command, [backendEntry], {
    cwd: path.join(appRoot, 'backend'),
    env: backendEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  if (logStreams) {
    child.stdout?.pipe(logStreams.stdout);
    child.stderr?.pipe(logStreams.stderr);
    child.once('close', () => {
      logStreams.stdout.end();
      logStreams.stderr.end();
    });
  }

  return {
    process: child,
    port,
    urls,
    stop: () => stopBackend(child),
  };
}

function stopBackend(child) {
  if (!child || child.killed) return;
  child.kill();
}

module.exports = {
  DEFAULT_BACKEND_PORT,
  getBackendPort,
  getBackendUrls,
  getRendererBackendUrls,
  shouldBlockRendererForBackend,
  resolveBackendEntry,
  resolveBackendCommand,
  createBackendEnv,
  readEnvFile,
  readEnvFiles,
  waitForBackendHealth,
  startBackend,
  stopBackend,
};
