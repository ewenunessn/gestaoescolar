# Schools Go CRUD Design

## Goal

Add a `schools` module to `backend-go` using English names for code, routes, database objects, and JSON payloads.

## API Contract

The module exposes a REST CRUD API under `/api/v1/schools`:

- `GET /api/v1/schools?active=true&search=term&limit=50&cursor=123`
- `GET /api/v1/schools/{id}`
- `POST /api/v1/schools`
- `PUT /api/v1/schools/{id}`
- `DELETE /api/v1/schools/{id}`

List endpoints use cursor pagination instead of offset pagination. Delete is a soft delete that sets `active=false`.

## Naming

Database names use lowercase `snake_case`. Go and JSON names use English domain terms:

- `schools`
- `name`
- `code`
- `address`
- `city`
- `maps_address` / `mapsAddress`
- `phone`
- `email`
- `manager_name` / `managerName`
- `administration_type` / `administrationType`
- `active`
- `created_at` / `createdAt`
- `updated_at` / `updatedAt`

## Architecture

The module lives in `internal/modules/schools` and keeps handler, service, repository, models, and domain errors close together. The HTTP router mounts the module through a small registration function, while the main entrypoint wires the PostgreSQL-backed repository into the router.

The service owns request validation and defaulting. The repository owns SQL and maps PostgreSQL uniqueness errors into domain errors. The handler owns JSON parsing, status codes, and response envelopes.

## Database

The migration creates `public.schools` with:

- `bigint generated always as identity` primary key.
- Required `name`, `code`, and `city`.
- Case-insensitive unique code index.
- `administration_type` check constraint.
- `active` soft-delete flag.
- `timestamptz` timestamps.
- Indexes for active listing, code lookup, and trigram search.

The local `.env` points `DATABASE_URL` at the requested Neon PostgreSQL connection string and remains ignored by Git.
