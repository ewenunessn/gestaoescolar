import { 
  DatabaseTenantInventoryValidator,
  TenantOwnershipError,
  TenantInventoryLimitError,
  CrossTenantInventoryAccessError,
  TenantContextMissingError,
  TenantInventoryAccessDeniedError,
  TenantInventoryValidationError
} from '../../../src/services/tenantInventoryValidator';

// Use the global mock database
const mockDb = global.mockDb;

describe('TenantInventoryValidator', () => {
  let validator: DatabaseTenantInventoryValidator;
  const testTenantId = 'test-tenant-123';
  const otherTenantId = 'other-tenant-456';

  beforeEach(() => {
    validator = new DatabaseTenantInventoryValidator();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('extractTenantFromRequest', () => {
    it('should extract tenant ID from header', () => {
      const req = {
        headers: { 'x-tenant-id': testTenantId },
        user: null
      } as any;

      const result = validator.extractTenantFromRequest(req);
      expect(result).toBe(testTenantId);
    });

    it('should extract tenant ID from user object', () => {
      const req = {
        headers: {},
        user: { tenant: { id: testTenantId } }
      } as any;

      const result = validator.extractTenantFromRequest(req);
      expect(result).toBe(testTenantId);
    });

    it('should throw TenantContextMissingError when no tenant context', () => {
      const req = {
        headers: {},
        user: null
      } as any;

      expect(() => validator.extractTenantFromRequest(req))
        .toThrow(TenantContextMissingError);
    });
  });

  describe('validateSchoolTenantOwnership', () => {
    it('should pass validation for valid school ownership', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      await expect(validator.validateSchoolTenantOwnership(1, testTenantId))
        .resolves.not.toThrow();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM escolas'),
        [1, testTenantId]
      );
    });

    it('should throw TenantOwnershipError for invalid school ownership', async () => {
      mockDb.query.mockResolvedValue({
        rows: []
      });

      await expect(validator.validateSchoolTenantOwnership(1, testTenantId))
        .rejects.toThrow(TenantOwnershipError);
    });
  });

  describe('validateProductTenantOwnership', () => {
    it('should pass validation for valid product ownership', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      await expect(validator.validateProductTenantOwnership(1, testTenantId))
        .resolves.not.toThrow();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM produtos'),
        [1, testTenantId]
      );
    });

    it('should throw TenantOwnershipError for invalid product ownership', async () => {
      mockDb.query.mockResolvedValue({
        rows: []
      });

      await expect(validator.validateProductTenantOwnership(1, testTenantId))
        .rejects.toThrow(TenantOwnershipError);
    });
  });

  describe('validateInventoryItemTenantOwnership', () => {
    it('should pass validation for valid inventory item ownership', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      await expect(validator.validateInventoryItemTenantOwnership(1, testTenantId))
        .resolves.not.toThrow();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT ee.id'),
        [1, testTenantId]
      );
    });

    it('should throw TenantOwnershipError for invalid inventory item ownership', async () => {
      mockDb.query.mockResolvedValue({
        rows: []
      });

      await expect(validator.validateInventoryItemTenantOwnership(1, testTenantId))
        .rejects.toThrow(TenantOwnershipError);
    });
  });

  describe('validateBulkTenantOwnership', () => {
    it('should pass validation for valid bulk school ownership', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }, { id: 2 }, { id: 3 }]
      });

      await expect(validator.validateBulkTenantOwnership('escola', [1, 2, 3], testTenantId))
        .resolves.not.toThrow();
    });

    it('should throw TenantOwnershipError for partial bulk ownership', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }, { id: 2 }] // Missing id: 3
      });

      await expect(validator.validateBulkTenantOwnership('escola', [1, 2, 3], testTenantId))
        .rejects.toThrow(TenantOwnershipError);
    });

    it('should handle empty arrays gracefully', async () => {
      await expect(validator.validateBulkTenantOwnership('escola', [], testTenantId))
        .resolves.not.toThrow();

      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should remove duplicates from entity IDs', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }, { id: 2 }]
      });

      await expect(validator.validateBulkTenantOwnership('escola', [1, 2, 1, 2], testTenantId))
        .resolves.not.toThrow();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        [[1, 2], testTenantId]
      );
    });

    it('should throw error for unknown entity type', async () => {
      await expect(validator.validateBulkTenantOwnership('unknown', [1], testTenantId))
        .rejects.toThrow('Unknown entity type: unknown');
    });
  });

  describe('validateMixedEntitiesOwnership', () => {
    it('should validate multiple entity types successfully', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // escola
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // produto

      const validations = [
        { type: 'escola', ids: [1] },
        { type: 'produto', ids: [2] }
      ];

      await expect(validator.validateMixedEntitiesOwnership(validations, testTenantId))
        .resolves.not.toThrow();

      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should fail if any validation fails', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // escola - success
        .mockResolvedValueOnce({ rows: [] }); // produto - fail

      const validations = [
        { type: 'escola', ids: [1] },
        { type: 'produto', ids: [2] }
      ];

      await expect(validator.validateMixedEntitiesOwnership(validations, testTenantId))
        .rejects.toThrow(TenantOwnershipError);
    });
  });

  describe('validateLoteTenantOwnership', () => {
    it('should pass validation for valid lote ownership', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      await expect(validator.validateLoteTenantOwnership(1, testTenantId))
        .resolves.not.toThrow();
    });

    it('should throw TenantOwnershipError for invalid lote ownership', async () => {
      mockDb.query.mockResolvedValue({
        rows: []
      });

      await expect(validator.validateLoteTenantOwnership(1, testTenantId))
        .rejects.toThrow(TenantOwnershipError);
    });
  });

  describe('validateSchoolProductTenantConsistency', () => {
    it('should pass validation for consistent school-product tenant', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ escola_id: 1, produto_id: 2 }]
      });

      await expect(validator.validateSchoolProductTenantConsistency(1, 2, testTenantId))
        .resolves.not.toThrow();
    });

    it('should throw TenantOwnershipError for inconsistent tenant', async () => {
      mockDb.query.mockResolvedValue({
        rows: []
      });

      await expect(validator.validateSchoolProductTenantConsistency(1, 2, testTenantId))
        .rejects.toThrow(TenantOwnershipError);
    });
  });

  describe('validateUserTenantAccess', () => {
    it('should pass validation for valid user tenant access', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      await expect(validator.validateUserTenantAccess(1, testTenantId))
        .resolves.not.toThrow();
    });

    it('should throw TenantOwnershipError for invalid user tenant access', async () => {
      mockDb.query.mockResolvedValue({
        rows: []
      });

      await expect(validator.validateUserTenantAccess(1, testTenantId))
        .rejects.toThrow(TenantOwnershipError);
    });
  });

  describe('validateActiveBatchesTenantOwnership', () => {
    it('should pass validation for valid active batches', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }, { id: 2 }]
      });

      await expect(validator.validateActiveBatchesTenantOwnership([1, 2], testTenantId))
        .resolves.not.toThrow();
    });

    it('should throw TenantOwnershipError for invalid batches', async () => {
      mockDb.query.mockResolvedValue({
        rows: [{ id: 1 }] // Missing id: 2
      });

      await expect(validator.validateActiveBatchesTenantOwnership([1, 2], testTenantId))
        .rejects.toThrow(TenantOwnershipError);
    });
  });

  describe('validateInventoryOperation', () => {
    it('should validate complex inventory operation successfully', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // school
        .mockResolvedValueOnce({ rows: [{ id: 2 }, { id: 3 }] }) // products
        .mockResolvedValueOnce({ rows: [{ id: 4 }] }) // inventory items
        .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // batches
        .mockResolvedValueOnce({ rows: [{ id: 6 }] }); // user

      const operation = {
        schoolId: 1,
        productIds: [2, 3],
        inventoryItemIds: [4],
        batchIds: [5],
        userId: 6
      };

      await expect(validator.validateInventoryOperation(operation, testTenantId))
        .resolves.not.toThrow();

      expect(mockDb.query).toHaveBeenCalledTimes(5);
    });

    it('should throw TenantInventoryAccessDeniedError for invalid operation', async () => {
      mockDb.query.mockResolvedValue({ rows: [] }); // Fail school validation

      const operation = {
        schoolId: 1
      };

      await expect(validator.validateInventoryOperation(operation, testTenantId))
        .rejects.toThrow(TenantInventoryAccessDeniedError);
    });

    it('should handle partial operations', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: 1 }] });

      const operation = {
        schoolId: 1
        // Only school validation needed
      };

      await expect(validator.validateInventoryOperation(operation, testTenantId))
        .resolves.not.toThrow();

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Classes', () => {
    it('should create TenantOwnershipError with correct properties', () => {
      const error = new TenantOwnershipError('School', 1, testTenantId);
      
      expect(error.name).toBe('TenantOwnershipError');
      expect(error.code).toBe('TENANT_OWNERSHIP_ERROR');
      expect(error.message).toContain('School 1 does not belong to tenant');
    });

    it('should create TenantInventoryLimitError with correct properties', () => {
      const error = new TenantInventoryLimitError('products', 100, 50, testTenantId);
      
      expect(error.name).toBe('TenantInventoryLimitError');
      expect(error.code).toBe('TENANT_INVENTORY_LIMIT_ERROR');
      expect(error.message).toContain('inventory limit exceeded');
    });

    it('should create CrossTenantInventoryAccessError with correct properties', () => {
      const error = new CrossTenantInventoryAccessError('transfer', 123);
      
      expect(error.name).toBe('CrossTenantInventoryAccessError');
      expect(error.code).toBe('CROSS_TENANT_INVENTORY_ACCESS');
      expect(error.message).toContain('Cross-tenant inventory access denied');
    });

    it('should create TenantContextMissingError with correct properties', () => {
      const error = new TenantContextMissingError();
      
      expect(error.name).toBe('TenantContextMissingError');
      expect(error.code).toBe('TENANT_CONTEXT_MISSING');
      expect(error.message).toContain('Tenant context is missing');
    });

    it('should create TenantInventoryAccessDeniedError with correct properties', () => {
      const error = new TenantInventoryAccessDeniedError('create', 'insufficient permissions');
      
      expect(error.name).toBe('TenantInventoryAccessDeniedError');
      expect(error.code).toBe('TENANT_INVENTORY_ACCESS_DENIED');
      expect(error.message).toContain('Inventory access denied');
    });

    it('should create TenantInventoryValidationError with correct properties', () => {
      const errors = ['Invalid quantity', 'Missing product'];
      const error = new TenantInventoryValidationError(errors);
      
      expect(error.name).toBe('TenantInventoryValidationError');
      expect(error.code).toBe('TENANT_INVENTORY_VALIDATION_ERROR');
      expect(error.validationErrors).toEqual(errors);
      expect(error.message).toContain('Invalid quantity, Missing product');
    });
  });
});