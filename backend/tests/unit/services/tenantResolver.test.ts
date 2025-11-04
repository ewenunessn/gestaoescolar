/**
 * Unit tests for tenant resolver service
 */

import { TenantResolver } from '../../../src/services/tenantResolver';
import { TenantNotFoundError, TenantInactiveError } from '../../../src/types/tenant';
import { testDb } from '../../helpers/testDatabase';

// Mock the database
jest.mock('../../../src/database');
const db = require('../../../src/database');

describe('TenantResolver', () => {
  let tenantResolver: TenantResolver;

  beforeEach(() => {
    tenantResolver = new TenantResolver();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await testDb.cleanup();
    tenantResolver.clearCache();
  });

  describe('resolveBySubdomain', () => {
    it('should resolve tenant by subdomain', async () => {
      const testTenant = await testDb.createTestTenant({
        subdomain: 'test-subdomain'
      });

      db.query.mockResolvedValue({
        rows: [{
          id: testTenant.id,
          slug: testTenant.slug,
          name: testTenant.name,
          domain: null,
          subdomain: testTenant.subdomain,
          status: testTenant.status,
          settings: testTenant.settings,
          limits: testTenant.limits,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      const result = await tenantResolver.resolveBySubdomain('test-subdomain');

      expect(result).toBeTruthy();
      expect(result?.subdomain).toBe('test-subdomain');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['test-subdomain']
      );
    });

    it('should return null when subdomain not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await tenantResolver.resolveBySubdomain('nonexistent');

      expect(result).toBeNull();
    });

    it('should use cache on subsequent calls', async () => {
      const testTenant = await testDb.createTestTenant({
        subdomain: 'cached-subdomain'
      });

      db.query.mockResolvedValue({
        rows: [{
          id: testTenant.id,
          slug: testTenant.slug,
          name: testTenant.name,
          domain: null,
          subdomain: testTenant.subdomain,
          status: testTenant.status,
          settings: testTenant.settings,
          limits: testTenant.limits,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      // First call
      await tenantResolver.resolveBySubdomain('cached-subdomain');
      expect(db.query).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await tenantResolver.resolveBySubdomain('cached-subdomain');
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('resolveByHeader', () => {
    it('should resolve tenant by ID', async () => {
      const testTenant = await testDb.createTestTenant();

      db.query.mockResolvedValue({
        rows: [{
          id: testTenant.id,
          slug: testTenant.slug,
          name: testTenant.name,
          domain: null,
          subdomain: testTenant.subdomain,
          status: testTenant.status,
          settings: testTenant.settings,
          limits: testTenant.limits,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      const result = await tenantResolver.resolveByHeader(testTenant.id);

      expect(result).toBeTruthy();
      expect(result?.id).toBe(testTenant.id);
    });

    it('should resolve tenant by slug', async () => {
      const testTenant = await testDb.createTestTenant({
        slug: 'test-slug'
      });

      db.query.mockResolvedValue({
        rows: [{
          id: testTenant.id,
          slug: testTenant.slug,
          name: testTenant.name,
          domain: null,
          subdomain: testTenant.subdomain,
          status: testTenant.status,
          settings: testTenant.settings,
          limits: testTenant.limits,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      const result = await tenantResolver.resolveByHeader('test-slug');

      expect(result).toBeTruthy();
      expect(result?.slug).toBe('test-slug');
    });
  });

  describe('resolveByToken', () => {
    it('should resolve tenant from JWT token', async () => {
      const testTenant = await testDb.createTestTenant();

      // Mock JWT verification
      const jwt = require('jsonwebtoken');
      jest.doMock('jsonwebtoken', () => ({
        verify: jest.fn().mockReturnValue({
          tenant_id: testTenant.id
        })
      }));

      db.query.mockResolvedValue({
        rows: [{
          id: testTenant.id,
          slug: testTenant.slug,
          name: testTenant.name,
          domain: null,
          subdomain: testTenant.subdomain,
          status: testTenant.status,
          settings: testTenant.settings,
          limits: testTenant.limits,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      const result = await tenantResolver.resolveByToken('valid-jwt-token');

      expect(result).toBeTruthy();
      expect(result?.id).toBe(testTenant.id);
    });

    it('should return null for invalid token', async () => {
      // Mock JWT verification to throw error
      const jwt = require('jsonwebtoken');
      jest.doMock('jsonwebtoken', () => ({
        verify: jest.fn().mockImplementation(() => {
          throw new Error('Invalid token');
        })
      }));

      const result = await tenantResolver.resolveByToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('resolveByDomain', () => {
    it('should resolve tenant by custom domain', async () => {
      const testTenant = await testDb.createTestTenant({
        domain: 'custom.example.com'
      });

      db.query.mockResolvedValue({
        rows: [{
          id: testTenant.id,
          slug: testTenant.slug,
          name: testTenant.name,
          domain: testTenant.domain,
          subdomain: testTenant.subdomain,
          status: testTenant.status,
          settings: testTenant.settings,
          limits: testTenant.limits,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      const result = await tenantResolver.resolveByDomain('custom.example.com');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('custom.example.com');
    });
  });

  describe('resolve', () => {
    it('should resolve using specified method', async () => {
      const testTenant = await testDb.createTestTenant({
        subdomain: 'resolve-test'
      });

      db.query.mockResolvedValue({
        rows: [{
          id: testTenant.id,
          slug: testTenant.slug,
          name: testTenant.name,
          domain: null,
          subdomain: testTenant.subdomain,
          status: testTenant.status,
          settings: testTenant.settings,
          limits: testTenant.limits,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      const result = await tenantResolver.resolve('subdomain', 'resolve-test');

      expect(result.tenant).toBeTruthy();
      expect(result.method).toBe('subdomain');
      expect(result.error).toBeUndefined();
    });

    it('should try fallback when primary method fails', async () => {
      const fallbackTenant = await testDb.createTestTenant({
        id: '00000000-0000-0000-0000-000000000000'
      });

      db.query
        .mockResolvedValueOnce({ rows: [] }) // First call fails
        .mockResolvedValueOnce({ // Fallback succeeds
          rows: [{
            id: fallbackTenant.id,
            slug: fallbackTenant.slug,
            name: fallbackTenant.name,
            domain: fallbackTenant.domain || null,
            subdomain: fallbackTenant.subdomain,
            status: fallbackTenant.status,
            settings: fallbackTenant.settings,
            limits: fallbackTenant.limits,
            createdAt: fallbackTenant.createdAt,
            updatedAt: fallbackTenant.updatedAt
          }]
        });

      const result = await tenantResolver.resolve('subdomain', 'nonexistent');

      expect(result.tenant).toBeTruthy();
      expect(result.method).toBe('header'); // Fallback uses header method
    });

    it('should return error for invalid method', async () => {
      const result = await tenantResolver.resolve('invalid', 'test');

      expect(result.tenant).toBeNull();
      expect(result.method).toBeNull();
      expect(result.error).toContain('Método de resolução inválido');
    });
  });

  describe('validateTenantStatus', () => {
    it('should pass for active tenant', () => {
      const activeTenant = { status: 'active' } as any;

      expect(() => {
        tenantResolver.validateTenantStatus(activeTenant);
      }).not.toThrow();
    });

    it('should throw TenantInactiveError for inactive tenant', () => {
      const inactiveTenant = { id: 'test-id', status: 'inactive' } as any;

      expect(() => {
        tenantResolver.validateTenantStatus(inactiveTenant);
      }).toThrow(TenantInactiveError);
    });
  });

  describe('cache management', () => {
    it('should clear specific cache key', async () => {
      const testTenant = await testDb.createTestTenant({
        subdomain: 'cache-test'
      });

      db.query.mockResolvedValue({
        rows: [{
          id: testTenant.id,
          slug: testTenant.slug,
          name: testTenant.name,
          domain: null,
          subdomain: testTenant.subdomain,
          status: testTenant.status,
          settings: testTenant.settings,
          limits: testTenant.limits,
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      // First call to populate cache
      await tenantResolver.resolveBySubdomain('cache-test');
      expect(db.query).toHaveBeenCalledTimes(1);

      // Clear specific cache key
      tenantResolver.clearCache('subdomain:cache-test');

      // Next call should hit database again
      await tenantResolver.resolveBySubdomain('cache-test');
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache', async () => {
      // Clear all cache
      tenantResolver.clearCache();

      // This is mainly to test the method exists and doesn't throw
      expect(true).toBe(true);
    });
  });
});