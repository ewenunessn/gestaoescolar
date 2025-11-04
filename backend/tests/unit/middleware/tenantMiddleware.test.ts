/**
 * Unit tests for tenant middleware
 */

import { Request, Response, NextFunction } from 'express';
import { tenantMiddleware, requireTenant, optionalTenant, noTenant, hasPermission } from '../../../src/middleware/tenantMiddleware';
import { tenantResolver } from '../../../src/services/tenantResolver';
import { testDb } from '../../helpers/testDatabase';

// Mock the database and tenant resolver
jest.mock('../../../src/database');
jest.mock('../../../src/services/tenantResolver');

describe('TenantMiddleware', () => {
  let mockRequest: Partial<Request> & { path: string };
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockTenantResolver: jest.Mocked<typeof tenantResolver>;

  beforeEach(() => {
    mockRequest = {
      get: jest.fn(),
      path: '/api/test'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    mockTenantResolver = tenantResolver as jest.Mocked<typeof tenantResolver>;
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe('tenantMiddleware', () => {
    it('should resolve tenant by subdomain', async () => {
      const testTenant = await testDb.createTestTenant({
        subdomain: 'test-subdomain'
      });

      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'host') return 'test-subdomain.example.com';
        return undefined;
      });

      mockTenantResolver.resolve.mockResolvedValue({
        tenant: testTenant,
        method: 'subdomain',
        error: undefined
      });

      const middleware = tenantMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTenantResolver.resolve).toHaveBeenCalledWith('subdomain', 'test-subdomain');
      expect(mockRequest.tenant).toEqual(testTenant);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should resolve tenant by header', async () => {
      const testTenant = await testDb.createTestTenant();

      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'host') return 'example.com';
        if (header === 'X-Tenant-ID') return testTenant.id;
        return undefined;
      });

      mockTenantResolver.resolve.mockResolvedValue({
        tenant: testTenant,
        method: 'header',
        error: undefined
      });

      const middleware = tenantMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTenantResolver.resolve).toHaveBeenCalledWith('header', testTenant.id);
      expect(mockRequest.tenant).toEqual(testTenant);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should resolve tenant by JWT token', async () => {
      const testTenant = await testDb.createTestTenant();

      (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'host') return 'example.com';
        if (header === 'Authorization') return 'Bearer valid-jwt-token';
        return undefined;
      });

      mockTenantResolver.resolve.mockResolvedValue({
        tenant: testTenant,
        method: 'token',
        error: undefined
      });

      const middleware = tenantMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTenantResolver.resolve).toHaveBeenCalledWith('token', 'valid-jwt-token');
      expect(mockRequest.tenant).toEqual(testTenant);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip tenant resolution for excluded paths', async () => {
      mockRequest.path = '/health';

      const middleware = tenantMiddleware();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockTenantResolver.resolve).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return error when tenant is required but not found', async () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      mockTenantResolver.resolve.mockResolvedValue({
        tenant: null,
        method: null,
        error: 'Tenant not found'
      });

      const middleware = tenantMiddleware({ required: true, fallbackToDefault: false });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'TENANT_NOT_FOUND',
        message: expect.stringContaining('Tenant não identificado'),
        details: expect.any(Object)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use fallback tenant when enabled', async () => {
      const fallbackTenant = await testDb.createTestTenant({
        id: '00000000-0000-0000-0000-000000000000'
      });

      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      mockTenantResolver.resolve
        .mockResolvedValueOnce({ tenant: null, method: null, error: undefined })
        .mockResolvedValueOnce({ tenant: fallbackTenant, method: 'header' as any, error: undefined });

      const middleware = tenantMiddleware({ fallbackToDefault: true });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.tenant).toEqual(fallbackTenant);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireTenant', () => {
    it('should require tenant and not use fallback', async () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      mockTenantResolver.resolve.mockResolvedValue({
        tenant: null,
        method: null,
        error: undefined
      });

      const middleware = requireTenant();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalTenant', () => {
    it('should not require tenant and use fallback', async () => {
      const fallbackTenant = await testDb.createTestTenant({
        id: '00000000-0000-0000-0000-000000000000'
      });

      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      mockTenantResolver.resolve
        .mockResolvedValueOnce({ tenant: null, method: null, error: undefined })
        .mockResolvedValueOnce({ tenant: fallbackTenant, method: 'header' as any, error: undefined });

      const middleware = optionalTenant();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('noTenant', () => {
    it('should clear tenant context', async () => {
      mockRequest.tenant = await testDb.createTestTenant();
      mockRequest.tenantContext = { 
        tenantId: 'test', 
        tenant: mockRequest.tenant, 
        permissions: [], 
        settings: {
          features: { inventory: true, contracts: true, deliveries: true, reports: true },
          branding: {},
          notifications: { email: true, sms: false, push: false },
          integrations: {}
        }, 
        limits: {
          maxUsers: 100,
          maxSchools: 50,
          maxProducts: 1000,
          storageLimit: 1024,
          apiRateLimit: 1000,
          maxContracts: 100,
          maxOrders: 500
        }
      };

      const middleware = noTenant();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.tenant).toBeUndefined();
      expect(mockRequest.tenantContext).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', () => {
      mockRequest.tenantContext = {
        tenantId: 'test',
        tenant: {} as any,
        permissions: ['schools:read', 'products:create'],
        settings: {
          features: { inventory: true, contracts: true, deliveries: true, reports: true },
          branding: {},
          notifications: { email: true, sms: false, push: false },
          integrations: {}
        },
        limits: {
          maxUsers: 100,
          maxSchools: 50,
          maxProducts: 1000,
          storageLimit: 1024,
          apiRateLimit: 1000,
          maxContracts: 100,
          maxOrders: 500
        }
      };

      expect(hasPermission(mockRequest as Request, 'schools:read')).toBe(true);
      expect(hasPermission(mockRequest as Request, 'products:create')).toBe(true);
    });

    it('should return false when user does not have permission', () => {
      mockRequest.tenantContext = {
        tenantId: 'test',
        tenant: {} as any,
        permissions: ['schools:read'],
        settings: {
          features: { inventory: true, contracts: true, deliveries: true, reports: true },
          branding: {},
          notifications: { email: true, sms: false, push: false },
          integrations: {}
        },
        limits: {
          maxUsers: 100,
          maxSchools: 50,
          maxProducts: 1000,
          storageLimit: 1024,
          apiRateLimit: 1000,
          maxContracts: 100,
          maxOrders: 500
        }
      };

      expect(hasPermission(mockRequest as Request, 'products:delete')).toBe(false);
    });

    it('should return false when no tenant context', () => {
      expect(hasPermission(mockRequest as Request, 'schools:read')).toBe(false);
    });
  });
});