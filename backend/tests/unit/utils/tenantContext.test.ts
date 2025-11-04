/**
 * Unit tests for tenant context utilities
 */

import { DatabaseTenantContext, tenantContext, validateTenantActive, getCurrentTenantInfo } from '../../../src/utils/tenantContext';
import { testDb } from '../../helpers/testDatabase';

// Mock the database
jest.mock('../../../src/database');
const db = require('../../../src/database');

describe('TenantContext', () => {
  let contextManager: DatabaseTenantContext;

  beforeEach(() => {
    contextManager = new DatabaseTenantContext();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe('DatabaseTenantContext', () => {
    describe('setTenantContext', () => {
      it('should set tenant context using RLS function', async () => {
        const tenantId = 'test-tenant-id';
        db.query.mockResolvedValue({ rows: [] });

        await contextManager.setTenantContext(tenantId);

        expect(db.query).toHaveBeenCalledWith('SELECT set_tenant_context($1)', [tenantId]);
      });

      it('should handle errors when setting context', async () => {
        const tenantId = 'test-tenant-id';
        db.query.mockRejectedValue(new Error('Database error'));

        await expect(contextManager.setTenantContext(tenantId))
          .rejects.toThrow('Erro ao definir contexto do tenant test-tenant-id');
      });
    });

    describe('getCurrentTenantId', () => {
      it('should get current tenant ID', async () => {
        const tenantId = 'current-tenant-id';
        db.query.mockResolvedValue({
          rows: [{ tenant_id: tenantId }]
        });

        const result = await contextManager.getCurrentTenantId();

        expect(result).toBe(tenantId);
        expect(db.query).toHaveBeenCalledWith('SELECT get_current_tenant_id() as tenant_id');
      });

      it('should return null when no tenant context', async () => {
        db.query.mockResolvedValue({
          rows: [{ tenant_id: null }]
        });

        const result = await contextManager.getCurrentTenantId();

        expect(result).toBeNull();
      });

      it('should handle errors gracefully', async () => {
        db.query.mockRejectedValue(new Error('Database error'));

        const result = await contextManager.getCurrentTenantId();

        expect(result).toBeNull();
      });
    });

    describe('clearTenantContext', () => {
      it('should clear tenant context', async () => {
        db.query.mockResolvedValue({ rows: [] });

        await contextManager.clearTenantContext();

        expect(db.query).toHaveBeenCalledWith('SELECT clear_tenant_context()');
      });

      it('should handle errors gracefully', async () => {
        db.query.mockRejectedValue(new Error('Database error'));

        // Should not throw
        await contextManager.clearTenantContext();

        expect(db.query).toHaveBeenCalled();
      });
    });

    describe('executeWithTenant', () => {
      it('should execute operation with tenant context', async () => {
        const tenantId = 'execution-tenant';
        const previousTenantId = 'previous-tenant';
        const operationResult = 'operation-result';

        // Mock getting current tenant ID
        db.query
          .mockResolvedValueOnce({ rows: [{ tenant_id: previousTenantId }] }) // getCurrentTenantId
          .mockResolvedValueOnce({ rows: [] }) // setTenantContext
          .mockResolvedValueOnce({ rows: [] }); // restore context

        const operation = jest.fn().mockResolvedValue(operationResult);

        const result = await contextManager.executeWithTenant(tenantId, operation);

        expect(result).toBe(operationResult);
        expect(operation).toHaveBeenCalled();
        expect(db.query).toHaveBeenCalledWith('SELECT set_tenant_context($1)', [tenantId]);
        expect(db.query).toHaveBeenCalledWith('SELECT set_tenant_context($1)', [previousTenantId]);
      });

      it('should restore context even if operation fails', async () => {
        const tenantId = 'execution-tenant';
        const previousTenantId = 'previous-tenant';

        db.query
          .mockResolvedValueOnce({ rows: [{ tenant_id: previousTenantId }] }) // getCurrentTenantId
          .mockResolvedValueOnce({ rows: [] }) // setTenantContext
          .mockResolvedValueOnce({ rows: [] }); // restore context

        const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

        await expect(contextManager.executeWithTenant(tenantId, operation))
          .rejects.toThrow('Operation failed');

        // Should still restore context
        expect(db.query).toHaveBeenCalledWith('SELECT set_tenant_context($1)', [previousTenantId]);
      });

      it('should clear context when no previous tenant', async () => {
        const tenantId = 'execution-tenant';

        db.query
          .mockResolvedValueOnce({ rows: [{ tenant_id: null }] }) // getCurrentTenantId
          .mockResolvedValueOnce({ rows: [] }) // setTenantContext
          .mockResolvedValueOnce({ rows: [] }); // clearTenantContext

        const operation = jest.fn().mockResolvedValue('result');

        await contextManager.executeWithTenant(tenantId, operation);

        expect(db.query).toHaveBeenCalledWith('SELECT clear_tenant_context()');
      });
    });
  });

  describe('validateTenantActive', () => {
    it('should return true for active tenant', async () => {
      const tenantId = 'active-tenant';
      db.query.mockResolvedValue({
        rows: [{ status: 'active' }]
      });

      const result = await validateTenantActive(tenantId);

      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT status FROM tenants'),
        [tenantId]
      );
    });

    it('should return false for inactive tenant', async () => {
      const tenantId = 'inactive-tenant';
      db.query.mockResolvedValue({
        rows: [{ status: 'inactive' }]
      });

      const result = await validateTenantActive(tenantId);

      expect(result).toBe(false);
    });

    it('should return false for non-existent tenant', async () => {
      const tenantId = 'non-existent';
      db.query.mockResolvedValue({
        rows: []
      });

      const result = await validateTenantActive(tenantId);

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      const tenantId = 'error-tenant';
      db.query.mockRejectedValue(new Error('Database error'));

      const result = await validateTenantActive(tenantId);

      expect(result).toBe(false);
    });
  });

  describe('getCurrentTenantInfo', () => {
    it('should return tenant info when context is set', async () => {
      const tenantId = 'info-tenant';
      const tenantInfo = {
        id: tenantId,
        slug: 'info-slug',
        name: 'Info Tenant',
        status: 'active',
        settings: { feature: true },
        limits: { maxUsers: 100 }
      };

      db.query
        .mockResolvedValueOnce({ rows: [{ tenant_id: tenantId }] }) // getCurrentTenantId
        .mockResolvedValueOnce({ rows: [tenantInfo] }); // tenant info query

      const result = await getCurrentTenantInfo();

      expect(result).toEqual(tenantInfo);
    });

    it('should return null when no tenant context', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ tenant_id: null }] });

      const result = await getCurrentTenantInfo();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      db.query.mockRejectedValue(new Error('Database error'));

      const result = await getCurrentTenantInfo();

      expect(result).toBeNull();
    });
  });

  describe('singleton instance', () => {
    it('should use the same instance', () => {
      expect(tenantContext).toBeInstanceOf(DatabaseTenantContext);
    });
  });
});