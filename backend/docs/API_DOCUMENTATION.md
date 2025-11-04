# Multi-Tenant API Documentation

## Overview

This document provides comprehensive API documentation for the multi-tenant school management system. All API endpoints support tenant-aware operations with proper data isolation and security.

## Base URL

- **Production**: `https://yourdomain.com/api`
- **Tenant Subdomain**: `https://{tenant-slug}.yourdomain.com/api`
- **Custom Domain**: `https://{custom-domain}/api`

## Authentication

### JWT Token Authentication

All API requests require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Tenant Identification

The API supports multiple methods for tenant identification:

1. **Subdomain**: `https://tenant-slug.yourdomain.com/api`
2. **Header**: `X-Tenant-ID: tenant-slug`
3. **JWT Token**: Tenant information embedded in token
4. **Custom Domain**: `https://custom-domain.com/api`

## Common Headers

```
Content-Type: application/json
Authorization: Bearer <jwt-token>
X-Tenant-ID: <tenant-slug> (optional if using subdomain)
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "tenantId": "tenant-uuid",
    "requestId": "req-uuid"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details
    }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req-uuid"
  }
}
```

## Authentication Endpoints

### Login

**POST** `/auth/login`

Authenticate user and obtain JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "refreshToken": "refresh-token-here",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "User Name",
      "role": "user"
    },
    "tenant": {
      "id": "tenant-uuid",
      "slug": "tenant-slug",
      "name": "Tenant Name"
    }
  }
}
```

### Refresh Token

**POST** `/auth/refresh`

Refresh JWT token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh-token-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "new-jwt-token-here",
    "refreshToken": "new-refresh-token-here"
  }
}
```

### Logout

**POST** `/auth/logout`

Invalidate current session.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

## Tenant Management Endpoints

### Get Current Tenant

**GET** `/tenants/current`

Get information about the current tenant.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tenant-uuid",
    "slug": "tenant-slug",
    "name": "Tenant Name",
    "domain": "custom-domain.com",
    "subdomain": "tenant-slug",
    "status": "active",
    "settings": {
      "features": {
        "inventory": true,
        "contracts": true
      },
      "branding": {
        "logo": "https://example.com/logo.png",
        "primaryColor": "#007bff"
      }
    },
    "limits": {
      "maxUsers": 100,
      "maxSchools": 50
    }
  }
}
```

### List Tenants (System Admin Only)

**GET** `/tenants`

List all tenants in the system.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20)
- `status` (string): Filter by status
- `search` (string): Search by name or slug

**Response:**
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "tenant-uuid",
        "slug": "tenant-slug",
        "name": "Tenant Name",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

### Create Tenant (System Admin Only)

**POST** `/tenants`

Create a new tenant.

**Request Body:**
```json
{
  "name": "New Tenant",
  "slug": "new-tenant",
  "subdomain": "new-tenant",
  "domain": "new-tenant.com",
  "settings": {
    "features": {
      "inventory": true,
      "contracts": true
    }
  },
  "limits": {
    "maxUsers": 100,
    "maxSchools": 50
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-tenant-uuid",
    "slug": "new-tenant",
    "name": "New Tenant",
    "status": "active"
  }
}
```

### Update Tenant

**PUT** `/tenants/{tenantId}`

Update tenant information.

**Request Body:**
```json
{
  "name": "Updated Tenant Name",
  "settings": {
    "features": {
      "inventory": true,
      "contracts": false
    }
  }
}
```

### Delete Tenant (System Admin Only)

**DELETE** `/tenants/{tenantId}`

Delete a tenant and all associated data.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Tenant deleted successfully"
  }
}
```

## Tenant Configuration Endpoints

### Get Tenant Configuration

**GET** `/tenants/{tenantId}/config`

Get tenant configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "features": {
      "inventory": true,
      "contracts": true,
      "deliveries": true,
      "reports": true
    },
    "branding": {
      "logo": "https://example.com/logo.png",
      "primaryColor": "#007bff",
      "secondaryColor": "#6c757d"
    },
    "notifications": {
      "email": true,
      "sms": false,
      "push": true
    },
    "limits": {
      "maxUsers": 100,
      "maxSchools": 50,
      "maxProducts": 1000
    }
  }
}
```

### Update Tenant Configuration

**PUT** `/tenants/{tenantId}/config`

Update tenant configuration.

**Request Body:**
```json
{
  "features": {
    "inventory": true,
    "contracts": false
  },
  "branding": {
    "primaryColor": "#1e3a8a"
  }
}
```

### Get Configuration Category

**GET** `/tenants/{tenantId}/config/{category}`

Get specific configuration category.

**Response:**
```json
{
  "success": true,
  "data": {
    "inventory": true,
    "contracts": true,
    "deliveries": true,
    "reports": true
  }
}
```

### Update Configuration Category

**PUT** `/tenants/{tenantId}/config/{category}`

Update specific configuration category.

**Request Body:**
```json
{
  "inventory": true,
  "contracts": false,
  "analytics": true
}
```

## User Management Endpoints

### List Tenant Users

**GET** `/tenants/{tenantId}/users`

List users in the tenant.

**Query Parameters:**
- `page` (integer): Page number
- `limit` (integer): Items per page
- `role` (string): Filter by role
- `status` (string): Filter by status
- `search` (string): Search by name or email

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "User Name",
        "role": "user",
        "status": "active",
        "lastLogin": "2024-01-01T00:00:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

### Add User to Tenant

**POST** `/tenants/{tenantId}/users`

Add a user to the tenant.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "role": "user",
  "schoolId": "school-uuid",
  "sendInvitation": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "user",
    "status": "pending"
  }
}
```

### Update User Role

**PUT** `/tenants/{tenantId}/users/{userId}`

Update user role in the tenant.

**Request Body:**
```json
{
  "role": "school_admin",
  "status": "active"
}
```

### Remove User from Tenant

**DELETE** `/tenants/{tenantId}/users/{userId}`

Remove user from the tenant.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "User removed from tenant successfully"
  }
}
```

## School Management Endpoints

### List Schools

**GET** `/schools`

List schools in the current tenant.

**Query Parameters:**
- `page` (integer): Page number
- `limit` (integer): Items per page
- `status` (string): Filter by status
- `search` (string): Search by name or code

**Response:**
```json
{
  "success": true,
  "data": {
    "schools": [
      {
        "id": "school-uuid",
        "codigo": "ESC001",
        "nome": "School Name",
        "endereco": "School Address",
        "telefone": "(11) 1234-5678",
        "email": "school@example.com",
        "status": "ativo",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "pages": 2
    }
  }
}
```

### Create School

**POST** `/schools`

Create a new school.

**Request Body:**
```json
{
  "codigo": "ESC002",
  "nome": "New School",
  "endereco": "New School Address",
  "telefone": "(11) 9876-5432",
  "email": "newschool@example.com"
}
```

### Get School Details

**GET** `/schools/{schoolId}`

Get detailed information about a school.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "school-uuid",
    "codigo": "ESC001",
    "nome": "School Name",
    "endereco": "School Address",
    "telefone": "(11) 1234-5678",
    "email": "school@example.com",
    "status": "ativo",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### Update School

**PUT** `/schools/{schoolId}`

Update school information.

**Request Body:**
```json
{
  "nome": "Updated School Name",
  "telefone": "(11) 1111-2222",
  "email": "updated@example.com"
}
```

### Delete School

**DELETE** `/schools/{schoolId}`

Delete a school.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "School deleted successfully"
  }
}
```

## Product Management Endpoints

### List Products

**GET** `/products`

List products in the current tenant.

**Query Parameters:**
- `page` (integer): Page number
- `limit` (integer): Items per page
- `categoria` (string): Filter by category
- `status` (string): Filter by status
- `search` (string): Search by name or code

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product-uuid",
        "codigo": "PROD001",
        "nome": "Product Name",
        "categoria": "Category",
        "unidade": "UN",
        "preco": 10.50,
        "status": "ativo",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

### Create Product

**POST** `/products`

Create a new product.

**Request Body:**
```json
{
  "codigo": "PROD002",
  "nome": "New Product",
  "categoria": "Category",
  "unidade": "KG",
  "preco": 15.75,
  "descricao": "Product description"
}
```

### Get Product Details

**GET** `/products/{productId}`

Get detailed information about a product.

### Update Product

**PUT** `/products/{productId}`

Update product information.

### Delete Product

**DELETE** `/products/{productId}`

Delete a product.

## Inventory Management Endpoints

### Get School Inventory

**GET** `/schools/{schoolId}/inventory`

Get inventory for a specific school.

**Response:**
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "id": "inventory-uuid",
        "produto": {
          "id": "product-uuid",
          "nome": "Product Name",
          "unidade": "UN"
        },
        "quantidade": 100,
        "quantidade_minima": 20,
        "validade": "2024-12-31",
        "lote": "LOT001",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Update Inventory

**PUT** `/schools/{schoolId}/inventory/{productId}`

Update inventory for a product in a school.

**Request Body:**
```json
{
  "quantidade": 150,
  "quantidade_minima": 25,
  "validade": "2024-12-31",
  "lote": "LOT002"
}
```

### Add Inventory Entry

**POST** `/schools/{schoolId}/inventory`

Add new inventory entry.

**Request Body:**
```json
{
  "produto_id": "product-uuid",
  "quantidade": 50,
  "tipo_movimentacao": "entrada",
  "observacoes": "Initial stock"
}
```

## Contract Management Endpoints

### List Contracts

**GET** `/contracts`

List contracts in the current tenant.

**Response:**
```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": "contract-uuid",
        "numero": "CONT001",
        "fornecedor": "Supplier Name",
        "valor_total": 10000.00,
        "data_inicio": "2024-01-01",
        "data_fim": "2024-12-31",
        "status": "ativo"
      }
    ]
  }
}
```

### Create Contract

**POST** `/contracts`

Create a new contract.

### Get Contract Details

**GET** `/contracts/{contractId}`

Get detailed contract information.

### Update Contract

**PUT** `/contracts/{contractId}`

Update contract information.

## Order Management Endpoints

### List Orders

**GET** `/orders`

List orders in the current tenant.

### Create Order

**POST** `/orders`

Create a new order.

**Request Body:**
```json
{
  "escola_id": "school-uuid",
  "contrato_id": "contract-uuid",
  "items": [
    {
      "produto_id": "product-uuid",
      "quantidade": 10,
      "preco_unitario": 5.50
    }
  ],
  "observacoes": "Order notes"
}
```

### Get Order Details

**GET** `/orders/{orderId}`

Get detailed order information.

### Update Order Status

**PUT** `/orders/{orderId}/status`

Update order status.

**Request Body:**
```json
{
  "status": "aprovado",
  "observacoes": "Approved by manager"
}
```

## Delivery Management Endpoints

### List Deliveries

**GET** `/deliveries`

List deliveries in the current tenant.

### Create Delivery

**POST** `/deliveries`

Create a new delivery.

### Get Delivery Details

**GET** `/deliveries/{deliveryId}`

Get detailed delivery information.

### Update Delivery Status

**PUT** `/deliveries/{deliveryId}/status`

Update delivery status.

## Reporting Endpoints

### Get Dashboard Data

**GET** `/reports/dashboard`

Get dashboard summary data.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSchools": 25,
      "totalProducts": 150,
      "totalContracts": 5,
      "pendingOrders": 12
    },
    "charts": {
      "inventoryByCategory": [
        {"category": "Alimentação", "value": 1500},
        {"category": "Material Escolar", "value": 800}
      ],
      "ordersThisMonth": [
        {"date": "2024-01-01", "count": 5},
        {"date": "2024-01-02", "count": 8}
      ]
    }
  }
}
```

### Generate Report

**POST** `/reports/generate`

Generate a custom report.

**Request Body:**
```json
{
  "type": "inventory",
  "filters": {
    "school_ids": ["school-uuid"],
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  },
  "format": "pdf"
}
```

## Monitoring Endpoints

### Health Check

**GET** `/health`

Check system health.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "1.0.0",
    "tenant": "tenant-slug",
    "services": {
      "database": "healthy",
      "redis": "healthy",
      "storage": "healthy"
    }
  }
}
```

### System Metrics

**GET** `/metrics`

Get system metrics (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "performance": {
      "avgResponseTime": 150,
      "requestsPerMinute": 1200,
      "errorRate": 0.01
    },
    "resources": {
      "cpuUsage": 45.2,
      "memoryUsage": 68.5,
      "diskUsage": 32.1
    }
  }
}
```

## Error Codes

### Authentication Errors

- `AUTH_INVALID_CREDENTIALS`: Invalid email or password
- `AUTH_TOKEN_EXPIRED`: JWT token has expired
- `AUTH_TOKEN_INVALID`: Invalid JWT token format
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions

### Tenant Errors

- `TENANT_NOT_FOUND`: Tenant does not exist
- `TENANT_INACTIVE`: Tenant is inactive or suspended
- `TENANT_LIMIT_EXCEEDED`: Tenant limit has been exceeded
- `CROSS_TENANT_ACCESS`: Attempted cross-tenant access

### Validation Errors

- `VALIDATION_FAILED`: Request validation failed
- `REQUIRED_FIELD_MISSING`: Required field is missing
- `INVALID_FORMAT`: Field format is invalid
- `DUPLICATE_VALUE`: Value already exists

### System Errors

- `INTERNAL_SERVER_ERROR`: Internal server error
- `DATABASE_ERROR`: Database operation failed
- `EXTERNAL_SERVICE_ERROR`: External service unavailable

## Rate Limiting

API requests are rate limited per tenant:

- **Default Limit**: 1000 requests per hour per tenant
- **Burst Limit**: 100 requests per minute
- **Headers**: Rate limit information is included in response headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response Format:**
```json
{
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## Filtering and Sorting

List endpoints support filtering and sorting:

**Query Parameters:**
- `search`: Text search across relevant fields
- `sort`: Sort field (prefix with `-` for descending)
- `filter[field]`: Filter by field value

**Example:**
```
GET /products?search=rice&sort=-createdAt&filter[categoria]=food&page=1&limit=20
```

## Webhooks

The system supports webhooks for real-time notifications:

### Webhook Events

- `tenant.created`: New tenant created
- `tenant.updated`: Tenant configuration updated
- `user.added`: User added to tenant
- `order.created`: New order created
- `delivery.completed`: Delivery completed

### Webhook Configuration

Configure webhooks in tenant settings:

```json
{
  "webhooks": {
    "url": "https://your-system.com/webhook",
    "secret": "webhook-secret",
    "events": ["order.created", "delivery.completed"]
  }
}
```

## SDK and Libraries

### JavaScript/Node.js

```javascript
const TenantAPI = require('@escola-management/api-client');

const client = new TenantAPI({
  baseURL: 'https://yourdomain.com/api',
  tenantId: 'your-tenant-slug',
  token: 'your-jwt-token'
});

// List schools
const schools = await client.schools.list();

// Create product
const product = await client.products.create({
  nome: 'New Product',
  categoria: 'Food'
});
```

### Python

```python
from escola_management import TenantAPI

client = TenantAPI(
    base_url='https://yourdomain.com/api',
    tenant_id='your-tenant-slug',
    token='your-jwt-token'
)

# List schools
schools = client.schools.list()

# Create product
product = client.products.create({
    'nome': 'New Product',
    'categoria': 'Food'
})
```

## Testing

### Test Environment

- **Base URL**: `https://test.yourdomain.com/api`
- **Test Tenant**: `test-tenant`
- **Test Credentials**: Provided separately

### Postman Collection

Import the Postman collection for easy API testing:
- [Download Collection](./postman/escola-management-api.json)

### API Examples

See the `examples/` directory for complete API usage examples in various programming languages.

For additional support and documentation updates, contact the development team or refer to the main documentation at [Multi-Tenant Architecture Documentation](./MULTI_TENANT_ARCHITECTURE.md).