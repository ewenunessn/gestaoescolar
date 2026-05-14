# Backend Go Base Design

## Goal

Create a new `backend-go` project as a clean base for rebuilding the backend in Go, starting with PostgreSQL support only.

## Architecture

The project uses a small modular Go service layout. The HTTP entrypoint lives in `cmd/api`, shared infrastructure lives under `internal`, and future business modules live under `internal/modules/<module-name>`.

The base uses:

- `chi` for HTTP routing and middleware.
- `pgxpool` for PostgreSQL connections.
- SQL migration files in `migrations/`.
- Environment-based configuration with an optional local `.env` loader.

## Initial Behavior

The first version exposes:

- `GET /health` for process health.
- `GET /ready` for PostgreSQL readiness.
- `GET /api/v1/example` as a copyable module example.

## Module Pattern

Each future module should keep its handler, service, and repository code close together inside `internal/modules/<module-name>`. A module should expose a small registration function so the central router can mount it without knowing its internals.

## Out Of Scope

This scaffold does not include authentication, authorization, ORM setup, domain migrations, background jobs, file storage, Supabase SDKs, or copied business logic from the existing Node backend.

## Verification

The intended verification command is:

```bash
go test ./...
```

This environment currently does not have the `go` executable available, so the command must be run after Go is installed and available on `PATH`.
