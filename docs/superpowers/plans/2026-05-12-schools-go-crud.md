# Schools Go CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PostgreSQL-backed CRUD API for schools to the Go backend.

**Architecture:** The `schools` module contains HTTP handlers, service validation, repository SQL, models, and domain errors. The central router receives a `schools.Service` interface and mounts `/api/v1/schools`.

**Tech Stack:** Go, chi, pgxpool, PostgreSQL, Neon.

---

### Task 1: Tests

**Files:**
- Create: `backend-go/internal/modules/schools/service_test.go`
- Create: `backend-go/internal/modules/schools/handler_test.go`

- [x] **Step 1: Write service validation tests**

Validate required fields, default `active=true`, string trimming, and list limit capping.

- [x] **Step 2: Write handler tests**

Validate successful create response and malformed/invalid request responses.

### Task 2: Module Implementation

**Files:**
- Create: `backend-go/internal/modules/schools/errors.go`
- Create: `backend-go/internal/modules/schools/handler.go`
- Create: `backend-go/internal/modules/schools/model.go`
- Create: `backend-go/internal/modules/schools/module.go`
- Create: `backend-go/internal/modules/schools/repository.go`
- Create: `backend-go/internal/modules/schools/service.go`
- Modify: `backend-go/internal/http/router.go`
- Modify: `backend-go/cmd/api/main.go`

- [ ] **Step 1: Implement models and errors**
- [ ] **Step 2: Implement service validation**
- [ ] **Step 3: Implement repository SQL**
- [ ] **Step 4: Implement HTTP handlers**
- [ ] **Step 5: Wire routes into the central router**

### Task 3: Database

**Files:**
- Create: `backend-go/migrations/000002_create_schools.up.sql`
- Create: `backend-go/migrations/000002_create_schools.down.sql`
- Create: `backend-go/.env`

- [ ] **Step 1: Add migration**
- [ ] **Step 2: Configure local `.env` with the Neon `DATABASE_URL`**
- [ ] **Step 3: Apply migration using an available PostgreSQL client**

### Task 4: Verification

- [ ] **Step 1: Run Go verification**

Run:

```bash
go test ./...
```

Expected: passes when Go is installed.

- [ ] **Step 2: Confirm migration result**

Query `information_schema.columns` for `public.schools`.
