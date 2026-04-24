# Electron Desktop App Design

## Context

The project already has a first Electron shell in `desktop/main.cjs` and `desktop/preload.cjs`, plus root scripts for desktop development and build. The frontend is a React/Vite SPA, and the backend is an Express/TypeScript API that connects to PostgreSQL through `DATABASE_URL`, `POSTGRES_URL`, `NEON_DATABASE_URL`, or local `DB_*` variables.

The approved direction is to package the platform as a desktop application while keeping the database centralized. Electron owns the desktop window and starts a local backend process. The renderer keeps using HTTP APIs, but targets the backend running on `127.0.0.1`.

## Goals

- Run the web platform inside a native desktop window.
- Start and stop the backend with the desktop app lifecycle.
- Keep database data centralized in PostgreSQL/Neon instead of introducing local offline sync.
- Preserve the current browser/Vercel deployment path.
- Add a repeatable build path for a Windows desktop installer or unpacked app.

## Non-Goals

- No offline-first database in this iteration.
- No bidirectional sync engine.
- No rewrite of frontend routing or backend modules.
- No desktop-only redesign of business screens.

## Architecture

Electron is split into three layers:

1. Main process: creates the `BrowserWindow`, starts the backend child process in packaged mode, waits for the local API health endpoint, and shuts the child process down on quit.
2. Preload bridge: exposes a narrow `desktopShell` API to the renderer for desktop-only capabilities such as opening external URLs and reading desktop metadata.
3. Renderer: the existing Vite build. In desktop mode it resolves the API base URL to the local backend, while production web builds keep using the hosted backend URL.

The backend remains an Express app. In desktop mode it listens on loopback only and receives environment values from Electron. The database still comes from environment configuration, so deployments can use Neon or another managed PostgreSQL instance.

## Data Flow

Development:

1. `npm run desktop:dev` starts frontend dev server and backend dev server.
2. Electron loads `http://127.0.0.1:5173`.
3. Vite proxies API calls to the local backend.

Packaged app:

1. Electron starts.
2. Main process starts `backend/dist/index.js` as a child process.
3. Main process waits for `http://127.0.0.1:<port>/health`.
4. Electron loads `frontend/dist/index.html`.
5. Renderer calls `http://127.0.0.1:<port>/api`.
6. Backend connects to the configured PostgreSQL database.

## Error Handling

- If the backend does not become healthy, the app shows a desktop startup failure page instead of a blank window.
- Backend logs are written to a desktop logs directory for diagnosis.
- External links open in the system browser.
- The renderer has no Node integration and can access desktop features only through the preload bridge.

## Packaging

Use `electron-builder` at the root package. The package must include:

- `desktop/**`
- `frontend/dist/**`
- `backend/dist/**`
- the backend runtime dependencies needed by `backend/dist/index.js`

The first target should be Windows NSIS and an unpacked directory build. Later targets for macOS/Linux can be added once the Windows path is stable.

## Testing

- Build backend with `npm run build --prefix backend`.
- Build frontend desktop bundle with `npm run build:desktop --prefix frontend`.
- Start Electron locally with the packaged-mode path where feasible.
- Verify the desktop renderer uses the local backend URL.
- Verify the app quits the backend child process.

## Open Decisions

- Installer branding assets: icon, product name, publisher, and signing certificate.
- Whether app updates should be manual downloads or an auto-update channel.
- Whether desktop credentials should remain in `localStorage` or move to a desktop-backed secure store in a later iteration.
