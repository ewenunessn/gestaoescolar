# Backend Go

Base project for rebuilding the backend in Go with PostgreSQL as the initial database.

## Requirements

- Go 1.22 or newer
- PostgreSQL

## Local Setup

Create a local environment file:

```bash
cp .env.example .env
```

Edit `DATABASE_URL` in `.env`, then install dependencies and run the API:

```bash
go mod tidy
go run ./cmd/api
```

The API listens on `APP_PORT`, which defaults to `8080`.

## Endpoints

- `GET /health`
- `GET /ready`
- `GET /api/v1/example`

All `/api/v1` endpoints require `X-Tenant-ID`. The initial development tenant created by migrations is:

```text
00000000-0000-4000-8000-000000000001
```

### Schools

- `GET /api/v1/schools?active=true&search=term&limit=50&cursor=123`
- `GET /api/v1/schools/{id}`
- `POST /api/v1/schools`
- `PUT /api/v1/schools/{id}`
- `DELETE /api/v1/schools/{id}`

Create payload:

```json
{
  "name": "Municipal School",
  "code": "INEP-001",
  "city": "Macapa",
  "address": "Main Street",
  "mapsAddress": "Main Street, Macapa",
  "phone": "(96) 0000-0000",
  "email": "school@example.com",
  "managerName": "School Manager",
  "administrationType": "municipal",
  "active": true
}
```

Allowed `administrationType` values are `municipal`, `state`, `federal`, and `private`.

### Education Modalities

- `GET /api/v1/education-modalities?active=true&search=term&limit=50&cursor=123`
- `GET /api/v1/education-modalities/{id}`
- `POST /api/v1/education-modalities`
- `PUT /api/v1/education-modalities/{id}`
- `DELETE /api/v1/education-modalities/{id}`

Create payload:

```json
{
  "name": "Elementary School",
  "description": "Students from early grades",
  "active": true
}
```

### School Education Modalities

- `GET /api/v1/schools/{schoolId}/education-modalities?limit=50&cursor=123`
- `POST /api/v1/schools/{schoolId}/education-modalities`
- `PUT /api/v1/schools/{schoolId}/education-modalities/{id}`
- `DELETE /api/v1/schools/{schoolId}/education-modalities/{id}`

Create payload:

```json
{
  "educationModalityId": 1,
  "studentCount": 120,
  "active": true
}
```

### Products

- `GET /api/v1/products?active=true&search=term&limit=50&cursor=123`
- `POST /api/v1/products`
- `GET /api/v1/products/{id}`
- `PUT /api/v1/products/{id}`
- `DELETE /api/v1/products/{id}`

### Suppliers

- `GET /api/v1/suppliers?active=true&supplierType=family_farming&search=term&limit=50&cursor=123`
- `POST /api/v1/suppliers`
- `GET /api/v1/suppliers/{id}`
- `PUT /api/v1/suppliers/{id}`
- `DELETE /api/v1/suppliers/{id}`

Allowed `supplierType` values are `family_farming`, `cooperative`, `conventional`, `individual`, and `other`.

### Contracts

- `GET /api/v1/contracts?active=true&status=active&supplierId=1&search=term&limit=50&cursor=123`
- `POST /api/v1/contracts`
- `GET /api/v1/contracts/{id}`
- `PUT /api/v1/contracts/{id}`
- `DELETE /api/v1/contracts/{id}`

Contracts are linked to suppliers by `supplierId` within the same tenant.

### Contract Products

- `GET /api/v1/contracts/{contractId}/products?limit=50&cursor=123`
- `POST /api/v1/contracts/{contractId}/products`
- `GET /api/v1/contracts/{contractId}/products/{id}`
- `PUT /api/v1/contracts/{contractId}/products/{id}`
- `DELETE /api/v1/contracts/{contractId}/products/{id}`

Create payload:

```json
{
  "productId": 1,
  "quantity": "3.00",
  "unitPrice": "12.50",
  "notes": "Monthly supply",
  "active": true
}
```

Contract products are linked to contracts and products by `tenant_id`, so a tenant cannot attach products from another tenant.

### Financial Modalities

- `GET /api/v1/financial-modalities?active=true&search=term&limit=50&cursor=123`
- `POST /api/v1/financial-modalities`
- `GET /api/v1/financial-modalities/{id}`
- `PUT /api/v1/financial-modalities/{id}`
- `DELETE /api/v1/financial-modalities/{id}`

Create payload:

```json
{
  "name": "PNAE Federal",
  "code": "PNAE-FED",
  "description": "Federal school meals funding",
  "fundingSource": "FNDE",
  "monthlyAmount": "5000.00",
  "paymentCode": "PDDE-2026",
  "paidInstallments": 3,
  "active": true
}
```

### Contract Balance Ledger

- `GET /api/v1/contracts/{contractId}/balance-entries?limit=50&cursor=123`
- `POST /api/v1/contracts/{contractId}/balance-entries`
- `GET /api/v1/contracts/{contractId}/balance-entries/{id}`
- `GET /api/v1/contracts/{contractId}/balance-summary`

Create payload:

```json
{
  "contractProductId": 1,
  "controlType": "item_financial_modality",
  "financialModalityId": 1,
  "entryType": "consumption",
  "quantity": "10.00",
  "amount": "250.00",
  "occurredAt": "2026-05-12",
  "description": "School delivery consumption",
  "referenceDocument": "NF-123"
}
```

Allowed `controlType` values are `item` and `item_financial_modality`.
Allowed `entryType` values are `initial_balance`, `consumption`, `reversal`, and `addendum`.
Ledger entries are append-only; corrections should be registered as `reversal` or `addendum` entries.

### Preparations

- `GET /api/v1/preparations?active=true&search=term&limit=50&cursor=123`
- `POST /api/v1/preparations`
- `GET /api/v1/preparations/{id}`
- `PUT /api/v1/preparations/{id}`
- `DELETE /api/v1/preparations/{id}`

Create payload:

```json
{
  "name": "Rice and Beans",
  "description": "Lunch preparation",
  "preparationType": "lunch",
  "active": true
}
```

### Preparation Products

- `GET /api/v1/preparations/{preparationId}/products?limit=50&cursor=123`
- `POST /api/v1/preparations/{preparationId}/products`
- `GET /api/v1/preparations/{preparationId}/products/{id}`
- `PUT /api/v1/preparations/{preparationId}/products/{id}`
- `DELETE /api/v1/preparations/{preparationId}/products/{id}`

General per capita payload:

```json
{
  "productId": 1,
  "perCapitaAmount": "80.00",
  "perCapitaUnit": "g",
  "active": true
}
```

Education modality per capita payload:

```json
{
  "productId": 1,
  "educationModalityId": 2,
  "perCapitaAmount": "120.00",
  "perCapitaUnit": "ml",
  "active": true
}
```

Allowed `perCapitaUnit` values are `g` and `ml`. When `educationModalityId` is omitted, the per capita is general for that product in the preparation.

List responses use an envelope instead of returning a raw array:

```json
{
  "data": [],
  "meta": {
    "limit": 50,
    "nextCursor": null,
    "hasMore": false
  }
}
```

## Project Layout

```text
cmd/api/                  API process entrypoint
internal/config/          Environment configuration
internal/database/        PostgreSQL connection setup
internal/http/            Router and HTTP server setup
internal/modules/         Future business modules
internal/platform/        Shared platform helpers
migrations/               SQL migration files
```

## Adding A Module

Create a folder under `internal/modules/<module-name>` and expose a `RegisterRoutes` function. Mount it from `internal/http/router.go` under `/api/v1`.

Suggested module shape:

```text
internal/modules/escolas/
  handler.go
  service.go
  repository.go
  module.go
```

Keep module internals private and expose only route registration or interfaces needed by other modules.

## Migrations

Migration files are plain SQL. This scaffold does not lock the project into a migration runner yet. You can apply them with your preferred tool, such as `migrate`, `goose`, or `psql`.

## Verification

Run:

```bash
go test ./...
```

This project uses Go modules. Install Go or add it to `PATH` before running verification locally.
