# Tenant Management API Documentation

## Overview

This document describes the comprehensive tenant management API endpoints that provide full CRUD operations, provisioning, configuration management, and user management for multi-tenant architecture.

## Base URL

All tenant management endpoints are prefixed with `/api/tenants`

## Authentication

Most tenant management endpoints require system administrator privileges and use the `noTenant()` middleware, meaning they operate outside of tenant context for administrative purposes.

## Endpoints

### 1. Tenant CRUD Operations

#### List All Tenants
```
GET /api/tenants
```

**Query Parameters:**
- `status` (optional): Filter by status (active, inactive, suspended)
- `search` (optional): Search by name or slug
- `createdAfter` (optional): Filter by creation date (ISO string)
- `createdBefore` (optional): Filter by creation date (ISO string)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "tenant-slug",
      "name": "Tenant Name",
      "domain": "https://tenant.example.com",
      "subdomain": "tenant",
      "status": "active",
      "settings": {...},
      "limits": {...},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### Get Tenant by ID
```
GET /api/tenants/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "tenant-slug",
    "name": "Tenant Name",
    "domain": "https://tenant.example.com",
    "subdomain": "tenant",
    "status": "active",
    "settings": {
      "features": {
        "inventory": true,
        "contracts": true,
        "deliveries": true,
        "reports": true,
        "mobile": true,
        "analytics": false
      },
      "branding": {
        "primaryColor": "#007bff",
        "secondaryColor": "#6c757d"
      },
      "notifications": {
        "email": true,
        "sms": false,
        "push": true
      }
    },
    "limits": {
      "maxUsers": 100,
      "maxSchools": 50,
      "maxProducts": 1000,
      "storageLimit": 1024,
      "apiRateLimit": 100
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Create New Tenant
```
POST /api/tenants
```

**Request Body:**
```json
{
  "slug": "new-tenant",
  "name": "New Tenant Name",
  "domain": "https://newtenant.example.com",
  "subdomain": "newtenant",
  "settings": {
    "features": {
      "inventory": true,
      "contracts": false
    }
  },
  "limits": {
    "maxUsers": 50,
    "maxSchools": 25
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant criado com sucesso",
  "data": {
    "id": "new-uuid",
    "slug": "new-tenant",
    "name": "New Tenant Name",
    ...
  }
}
```

#### Update Tenant
```
PUT /api/tenants/:id
```

**Request Body:**
```json
{
  "name": "Updated Tenant Name",
  "status": "active",
  "settings": {
    "features": {
      "analytics": true
    }
  }
}
```

#### Delete Tenant
```
DELETE /api/tenants/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant removido com sucesso"
}
```

### 2. Tenant Provisioning

#### Provision New Tenant
```
POST /api/tenants/provision
```

**Request Body:**
```json
{
  "tenant": {
    "slug": "new-client",
    "name": "New Client Organization",
    "subdomain": "newclient"
  },
  "adminUser": {
    "nome": "Admin User",
    "email": "admin@newclient.com",
    "senha": "securepassword"
  },
  "initialData": {
    "schools": [
      {
        "nome": "School 1",
        "endereco": "Address 1",
        "telefone": "123456789",
        "email": "school1@newclient.com"
      }
    ],
    "products": [
      {
        "nome": "Product 1",
        "descricao": "Description",
        "unidade": "kg",
        "categoria": "Category"
      }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant provisionado com sucesso",
  "data": {
    "tenant": {...},
    "adminUser": {...},
    "errors": [],
    "warnings": []
  }
}
```

#### Deprovision Tenant
```
POST /api/tenants/:id/deprovision
```

**Request Body:**
```json
{
  "confirm": "DELETE"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant 'Tenant Name' desprovisionado com sucesso"
}
```

### 3. Tenant Configuration Management

#### Get Tenant Configurations
```
GET /api/tenants/:id/configurations?category=features
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "config-id",
      "tenantId": "tenant-id",
      "category": "features",
      "key": "inventory",
      "value": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### Set Tenant Configuration
```
POST /api/tenants/:id/configurations
```

**Request Body:**
```json
{
  "category": "features",
  "key": "analytics",
  "value": true
}
```

#### Update Tenant Configuration
```
PUT /api/tenants/:id/configurations/:configId
```

**Request Body:**
```json
{
  "value": false
}
```

#### Delete Tenant Configuration
```
DELETE /api/tenants/:id/configurations/:configId
```

### 4. Tenant User Management

#### Get Tenant Users
```
GET /api/tenants/:id/users
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "tenant-user-id",
      "tenantId": "tenant-id",
      "userId": 123,
      "role": "tenant_admin",
      "status": "active",
      "userName": "User Name",
      "userEmail": "user@example.com",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

#### Add User to Tenant
```
POST /api/tenants/:id/users
```

**Request Body:**
```json
{
  "userId": 123,
  "role": "user",
  "status": "active"
}
```

#### Update Tenant User
```
PUT /api/tenants/:id/users/:userId
```

**Request Body:**
```json
{
  "role": "tenant_admin",
  "status": "active"
}
```

#### Remove User from Tenant
```
DELETE /api/tenants/:id/users/:userId
```

### 5. Tenant Statistics

#### Get Tenant Statistics
```
GET /api/tenants/:id/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 25,
    "totalSchools": 10,
    "totalProducts": 150,
    "totalContracts": 5,
    "totalOrders": 100,
    "storageUsed": "256 MB",
    "lastActivity": "2024-01-01T12:00:00Z"
  }
}
```

### 6. Tenant Status Management

#### Toggle Tenant Status
```
PATCH /api/tenants/:id/status
```

**Request Body:**
```json
{
  "status": "suspended"
}
```

**Valid Status Values:**
- `active`: Tenant is fully operational
- `inactive`: Tenant is temporarily disabled
- `suspended`: Tenant is suspended due to policy violations

### 7. Utility Endpoints

#### Test Tenant Resolution
```
GET /api/tenants/test-resolution?method=subdomain&identifier=tenant-slug
```

**Query Parameters:**
- `method`: Resolution method (subdomain, header, token, domain)
- `identifier`: The identifier to resolve

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant": {...},
    "method": "subdomain",
    "cached": false
  }
}
```

#### Get Current Tenant Context
```
GET /api/tenants/context
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant": {...},
    "tenantContext": {...},
    "hasContext": true
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "errors": ["Validation error 1", "Validation error 2"]
}
```

## Common HTTP Status Codes

- `200`: Success
- `201`: Created successfully
- `400`: Bad request (validation errors)
- `404`: Resource not found
- `409`: Conflict (duplicate slug/subdomain)
- `500`: Internal server error

## Security Considerations

1. **Administrative Access**: All tenant management endpoints require system administrator privileges
2. **Tenant Isolation**: Regular tenant operations are automatically scoped to the current tenant
3. **Audit Logging**: All tenant operations are logged for audit purposes
4. **Data Validation**: All inputs are validated using Zod schemas
5. **Confirmation Required**: Destructive operations like deprovisioning require explicit confirmation

## Rate Limiting

Tenant management endpoints may be subject to rate limiting based on the system configuration. Check the `X-RateLimit-*` headers in responses for current limits.

## Examples

### Complete Tenant Setup Flow

1. **Create Tenant**:
```bash
curl -X POST /api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "acme-corp",
    "name": "ACME Corporation",
    "subdomain": "acme"
  }'
```

2. **Provision with Initial Data**:
```bash
curl -X POST /api/tenants/provision \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": {...},
    "adminUser": {...},
    "initialData": {...}
  }'
```

3. **Configure Features**:
```bash
curl -X POST /api/tenants/{id}/configurations \
  -H "Content-Type: application/json" \
  -d '{
    "category": "features",
    "key": "analytics",
    "value": true
  }'
```

4. **Add Users**:
```bash
curl -X POST /api/tenants/{id}/users \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "role": "user"
  }'
```

This comprehensive API provides all necessary functionality for complete tenant lifecycle management in a multi-tenant SaaS application.