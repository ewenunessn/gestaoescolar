/**
 * Unit tests for tenant inventory error handling
 * Tests error middleware and error response formatting
 */

import { Request, Response } from 'express';
import { 
  TenantOwnershipError,
  TenantInventoryLimitError,
  CrossTenantInventoryAccessError,
  TenantContextMissingError,
  TenantInventoryAccessDeniedError,
  TenantInventoryValidationError
} from '../../../src/services/tenantInventoryValidator';
import { handleTenantInventoryError } from '../../../src/middleware/tenantErrorMiddleware';

describe('Tenant Inventory Error Handling', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: { 'x-tenant-id': 'test-tenant-123' },
      user: { id: 1, tenant: { id: 'test-tenant-123' } },
      path: '/api/estoque-escola',
      method: 'GET'
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {}
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('TenantOwnershipError Handling', () => {
    it('should handle school ownership error with 403 status', () => {
      const error = new TenantOwnershipError('School', 123, 'test-tenant-123');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Acesso negado: recurso não pertence à sua organização",
        code: 'TENANT_OWNERSHIP_ERROR',
        details: {
          entityType: 'School',
          entityId: 123,
          tenantId: 'test-tenant-123'
        }
      });
    });

    it('should handle product ownership error with localized message', () => {
      const error = new TenantOwnershipError('Product', 456, 'test-tenant-123');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Acesso negado: recurso não pertence à sua organização",
        code: 'TENANT_OWNERSHIP_ERROR',
        details: {
          entityType: 'Product',
          entityId: 456,
          tenantId: 'test-tenant-123'
        }
      });
    });

    it('should handle inventory item ownership error', () => {
      const error = new TenantOwnershipError('InventoryItem', 789, 'test-tenant-123');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'TENANT_OWNERSHIP_ERROR',
          details: expect.objectContaining({
            entityType: 'InventoryItem',
            entityId: 789
          })
        })
      );
    });
  });

  describe('TenantInventoryLimitError Handling', () => {
    it('should handle inventory limit exceeded with 429 status', () => {
      const error = new TenantInventoryLimitError('products', 150, 100, 'test-tenant-123');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Limite de inventário da organização excedido",
        code: 'TENANT_INVENTORY_LIMIT_ERROR',
        details: {
          limitType: 'products',
          current: 150,
          maximum: 100,
          tenantId: 'test-tenant-123'
        }
      });
    });

    it('should handle school limit exceeded', () => {
      const error = new TenantInventoryLimitError('schools', 25, 20, 'test-tenant-123');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'TENANT_INVENTORY_LIMIT_ERROR',
          details: expect.objectContaining({
            limitType: 'schools',
            current: 25,
            maximum: 20
          })
        })
      );
    });

    it('should handle batch limit exceeded', () => {
      const error = new TenantInventoryLimitError('batches', 500, 300, 'test-tenant-123');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            limitType: 'batches',
            current: 500,
            maximum: 300
          })
        })
      );
    });
  });

  describe('CrossTenantInventoryAccessError Handling', () => {
    it('should handle cross-tenant access attempt with 403 status', () => {
      const error = new CrossTenantInventoryAccessError('transfer', 123);
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Acesso negado: operação entre organizações não permitida",
        code: 'CROSS_TENANT_INVENTORY_ACCESS',
        details: {
          operation: 'transfer',
          resourceId: 123
        }
      });
    });

    it('should handle cross-tenant movement attempt', () => {
      const error = new CrossTenantInventoryAccessError('movement', 456);
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CROSS_TENANT_INVENTORY_ACCESS',
          details: expect.objectContaining({
            operation: 'movement',
            resourceId: 456
          })
        })
      );
    });
  });

  describe('TenantContextMissingError Handling', () => {
    it('should handle missing tenant context with 400 status', () => {
      const error = new TenantContextMissingError();
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Contexto de organização não encontrado. Faça login novamente.",
        code: 'TENANT_CONTEXT_MISSING',
        details: {
          suggestion: "Verifique se você está logado e tente novamente"
        }
      });
    });
  });

  describe('TenantInventoryAccessDeniedError Handling', () => {
    it('should handle access denied with 403 status', () => {
      const error = new TenantInventoryAccessDeniedError('create', 'insufficient permissions');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Acesso negado ao inventário",
        code: 'TENANT_INVENTORY_ACCESS_DENIED',
        details: {
          operation: 'create',
          reason: 'insufficient permissions'
        }
      });
    });

    it('should handle different operations', () => {
      const error = new TenantInventoryAccessDeniedError('delete', 'user role restriction');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            operation: 'delete',
            reason: 'user role restriction'
          })
        })
      );
    });
  });

  describe('TenantInventoryValidationError Handling', () => {
    it('should handle validation errors with 400 status', () => {
      const validationErrors = [
        'Quantidade deve ser maior que zero',
        'Produto é obrigatório',
        'Escola deve pertencer ao tenant'
      ];
      const error = new TenantInventoryValidationError(validationErrors);
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Dados de inventário inválidos",
        code: 'TENANT_INVENTORY_VALIDATION_ERROR',
        details: {
          validationErrors: validationErrors,
          errorCount: 3
        }
      });
    });

    it('should handle single validation error', () => {
      const validationErrors = ['Data de validade inválida'];
      const error = new TenantInventoryValidationError(validationErrors);
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            validationErrors: validationErrors,
            errorCount: 1
          })
        })
      );
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle unknown errors with 500 status', () => {
      const error = new Error('Unknown database error');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: "Erro interno do servidor",
        code: 'INTERNAL_SERVER_ERROR'
      });
    });

    it('should include error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Database connection failed');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            error: 'Database connection failed'
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Sensitive database error');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          details: expect.objectContaining({
            error: expect.any(String)
          })
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Logging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log tenant ownership errors', () => {
      const error = new TenantOwnershipError('School', 123, 'test-tenant-123');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Tenant inventory error:",
        expect.objectContaining({
          name: 'TenantOwnershipError',
          code: 'TENANT_OWNERSHIP_ERROR'
        })
      );
    });

    it('should log validation errors with details', () => {
      const validationErrors = ['Invalid data'];
      const error = new TenantInventoryValidationError(validationErrors);
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Tenant inventory error:",
        expect.objectContaining({
          name: 'TenantInventoryValidationError',
          validationErrors: validationErrors
        })
      );
    });

    it('should log generic errors', () => {
      const error = new Error('Generic error');
      
      handleTenantInventoryError(error, mockResponse as Response);

      expect(consoleSpy).toHaveBeenCalledWith(
        "❌ Tenant inventory error:",
        expect.objectContaining({
          message: 'Generic error'
        })
      );
    });
  });

  describe('Error Response Consistency', () => {
    it('should always include success: false in error responses', () => {
      const errors = [
        new TenantOwnershipError('School', 1, 'tenant-1'),
        new TenantInventoryLimitError('products', 100, 50, 'tenant-1'),
        new CrossTenantInventoryAccessError('transfer', 1),
        new TenantContextMissingError(),
        new TenantInventoryAccessDeniedError('create', 'no permission'),
        new TenantInventoryValidationError(['Invalid data']),
        new Error('Generic error')
      ];

      errors.forEach(error => {
        jest.clearAllMocks();
        handleTenantInventoryError(error, mockResponse as Response);
        
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false
          })
        );
      });
    });

    it('should always include a message in error responses', () => {
      const errors = [
        new TenantOwnershipError('School', 1, 'tenant-1'),
        new TenantInventoryLimitError('products', 100, 50, 'tenant-1'),
        new CrossTenantInventoryAccessError('transfer', 1),
        new TenantContextMissingError(),
        new TenantInventoryAccessDeniedError('create', 'no permission'),
        new TenantInventoryValidationError(['Invalid data']),
        new Error('Generic error')
      ];

      errors.forEach(error => {
        jest.clearAllMocks();
        handleTenantInventoryError(error, mockResponse as Response);
        
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.any(String)
          })
        );
      });
    });

    it('should always include a code in error responses', () => {
      const errors = [
        new TenantOwnershipError('School', 1, 'tenant-1'),
        new TenantInventoryLimitError('products', 100, 50, 'tenant-1'),
        new CrossTenantInventoryAccessError('transfer', 1),
        new TenantContextMissingError(),
        new TenantInventoryAccessDeniedError('create', 'no permission'),
        new TenantInventoryValidationError(['Invalid data']),
        new Error('Generic error')
      ];

      errors.forEach(error => {
        jest.clearAllMocks();
        handleTenantInventoryError(error, mockResponse as Response);
        
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: expect.any(String)
          })
        );
      });
    });
  });
});