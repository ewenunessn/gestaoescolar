# Backend Go Base Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a new `backend-go` scaffold for a modular Go backend with PostgreSQL support.

**Architecture:** The API starts from `cmd/api/main.go`, loads environment configuration, opens a PostgreSQL pool, builds a chi router, and starts an HTTP server. Infrastructure stays under `internal`, while future business domains use `internal/modules/<module>`.

**Tech Stack:** Go, chi, pgxpool, godotenv, SQL migrations.

---

### Task 1: Define Config And HTTP Contract

**Files:**
- Create: `backend-go/internal/config/config_test.go`
- Create: `backend-go/internal/http/router_test.go`

- [x] **Step 1: Write config tests**

Create tests for default config values, missing `DATABASE_URL`, and invalid `APP_PORT`.

- [x] **Step 2: Write router tests**

Create tests for `/health` success and `/ready` failure when PostgreSQL is unavailable.

### Task 2: Implement Scaffold

**Files:**
- Create: `backend-go/go.mod`
- Create: `backend-go/cmd/api/main.go`
- Create: `backend-go/internal/config/config.go`
- Create: `backend-go/internal/database/postgres.go`
- Create: `backend-go/internal/http/router.go`
- Create: `backend-go/internal/http/server.go`
- Create: `backend-go/internal/modules/example/module.go`
- Create: `backend-go/internal/platform/logger/logger.go`
- Create: `backend-go/migrations/000001_init_schema.up.sql`
- Create: `backend-go/migrations/000001_init_schema.down.sql`
- Create: `backend-go/.env.example`
- Create: `backend-go/.gitignore`
- Create: `backend-go/Makefile`
- Create: `backend-go/README.md`

- [ ] **Step 1: Add Go module and dependencies**

Use module path `github.com/ewenunessn/gestaoescolar/backend-go`.

- [ ] **Step 2: Implement configuration**

Read `APP_ENV`, `SERVICE_NAME`, `APP_PORT`, `DATABASE_URL`, and `SHUTDOWN_TIMEOUT`.

- [ ] **Step 3: Implement HTTP router**

Mount health, readiness, and example module routes.

- [ ] **Step 4: Implement PostgreSQL pool creation**

Use `pgxpool.NewWithConfig` and validate the connection with `Ping`.

- [ ] **Step 5: Add docs and local commands**

Document `.env`, `go test ./...`, `go run ./cmd/api`, and migration usage.

### Task 3: Verify

- [ ] **Step 1: Run formatting**

Run:

```bash
gofmt -w .
```

- [ ] **Step 2: Run tests**

Run:

```bash
go test ./...
```

Expected: all tests pass after Go is installed and dependencies are available.
