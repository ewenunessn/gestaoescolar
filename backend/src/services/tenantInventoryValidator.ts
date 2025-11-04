import { Request } from 'express';
import db from '../database';

// Tipos de erro específicos para tenant inventory
export class TenantOwnershipError extends Error {
  public code: string;
  
  constructor(entityType: string, entityId: number | string, tenantId: string) {
    super(`${entityType} ${entityId} does not belong to tenant ${tenantId}`);
    this.name = 'TenantOwnershipError';
    this.code = 'TENANT_OWNERSHIP_ERROR';
  }
}

export class TenantInventoryLimitError extends Error {
  public code: string;
  
  constructor(limit: string, current: number, max: number, tenantId: string) {
    super(`Tenant ${tenantId} inventory limit exceeded for ${limit}: ${current}/${max}`);
    this.name = 'TenantInventoryLimitError';
    this.code = 'TENANT_INVENTORY_LIMIT_ERROR';
  }
}

export class CrossTenantInventoryAccessError extends Error {
  public code: string;
  
  constructor(operation: string, resourceId: number | string) {
    super(`Cross-tenant inventory access denied for ${operation} on resource ${resourceId}`);
    this.name = 'CrossTenantInventoryAccessError';
    this.code = 'CROSS_TENANT_INVENTORY_ACCESS';
  }
}

export class TenantContextMissingError extends Error {
  public code: string;
  
  constructor() {
    super('Tenant context is missing from request');
    this.name = 'TenantContextMissingError';
    this.code = 'TENANT_CONTEXT_MISSING';
  }
}

export class TenantInventoryAccessDeniedError extends Error {
  public code: string;
  
  constructor(operation: string, reason: string) {
    super(`Inventory access denied for operation '${operation}': ${reason}`);
    this.name = 'TenantInventoryAccessDeniedError';
    this.code = 'TENANT_INVENTORY_ACCESS_DENIED';
  }
}

export class TenantInventoryValidationError extends Error {
  public code: string;
  public validationErrors: string[];
  
  constructor(errors: string[]) {
    super(`Inventory validation failed: ${errors.join(', ')}`);
    this.name = 'TenantInventoryValidationError';
    this.code = 'TENANT_INVENTORY_VALIDATION_ERROR';
    this.validationErrors = errors;
  }
}

export class TenantInventoryNotFoundError extends Error {
  public code: string;
  public entityType: string;
  public entityId: number | string;
  
  constructor(entityType: string, entityId: number | string, tenantId: string) {
    super(`${entityType} ${entityId} not found in tenant ${tenantId}`);
    this.name = 'TenantInventoryNotFoundError';
    this.code = 'TENANT_INVENTORY_NOT_FOUND';
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

export class TenantInventoryConflictError extends Error {
  public code: string;
  public conflictType: string;
  
  constructor(conflictType: string, message: string) {
    super(`Inventory conflict (${conflictType}): ${message}`);
    this.name = 'TenantInventoryConflictError';
    this.code = 'TENANT_INVENTORY_CONFLICT';
    this.conflictType = conflictType;
  }
}

export class TenantInventoryInsufficientStockError extends Error {
  public code: string;
  public requested: number;
  public available: number;
  
  constructor(productId: number, requested: number, available: number) {
    super(`Insufficient stock for product ${productId}: requested ${requested}, available ${available}`);
    this.name = 'TenantInventoryInsufficientStockError';
    this.code = 'TENANT_INVENTORY_INSUFFICIENT_STOCK';
    this.requested = requested;
    this.available = available;
  }
}

export class TenantInventoryExpiredBatchError extends Error {
  public code: string;
  public batchId: number;
  public expiryDate: Date;
  
  constructor(batchId: number, expiryDate: Date) {
    super(`Cannot use expired batch ${batchId}, expired on ${expiryDate.toISOString()}`);
    this.name = 'TenantInventoryExpiredBatchError';
    this.code = 'TENANT_INVENTORY_EXPIRED_BATCH';
    this.batchId = batchId;
    this.expiryDate = expiryDate;
  }
}

// Interface para o validador de inventário por tenant
export interface TenantInventoryValidator {
  validateSchoolTenantOwnership(schoolId: number, tenantId: string): Promise<void>;
  validateProductTenantOwnership(productId: number, tenantId: string): Promise<void>;
  validateInventoryItemTenantOwnership(itemId: number, tenantId: string): Promise<void>;
  validateBulkTenantOwnership(entityType: string, entityIds: number[], tenantId: string): Promise<void>;
  validateMixedEntitiesOwnership(validations: Array<{type: string; ids: number[]}>, tenantId: string): Promise<void>;
  validateLoteTenantOwnership(loteId: number, tenantId: string): Promise<void>;
  validateMovimentacaoTenantOwnership(movimentacaoId: number, tenantId: string): Promise<void>;
  validateSchoolProductTenantConsistency(schoolId: number, productId: number, tenantId: string): Promise<void>;
  validateUserTenantAccess(userId: number, tenantId: string): Promise<void>;
  validateActiveBatchesTenantOwnership(batchIds: number[], tenantId: string): Promise<void>;
  validateInventoryOperation(operation: {
    schoolId?: number;
    productIds?: number[];
    inventoryItemIds?: number[];
    batchIds?: number[];
    userId?: number;
  }, tenantId: string): Promise<void>;
  extractTenantFromRequest(req: Request): string;
}

// Implementação do validador usando banco de dados
export class DatabaseTenantInventoryValidator implements TenantInventoryValidator {
  
  /**
   * Extrai o tenant ID da requisição
   */
  extractTenantFromRequest(req: Request): string {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant?.id;
    
    if (!tenantId) {
      throw new TenantContextMissingError();
    }
    
    return tenantId as string;
  }

  /**
   * Valida se uma escola pertence ao tenant
   */
  async validateSchoolTenantOwnership(schoolId: number, tenantId: string): Promise<void> {
    const result = await db.query(`
      SELECT id FROM escolas 
      WHERE id = $1 AND tenant_id = $2 AND ativo = true
    `, [schoolId, tenantId]);
    
    if (result.rows.length === 0) {
      throw new TenantOwnershipError('School', schoolId, tenantId);
    }
  }

  /**
   * Valida se um produto pertence ao tenant
   */
  async validateProductTenantOwnership(productId: number, tenantId: string): Promise<void> {
    const result = await db.query(`
      SELECT id FROM produtos 
      WHERE id = $1 AND tenant_id = $2 AND ativo = true
    `, [productId, tenantId]);
    
    if (result.rows.length === 0) {
      throw new TenantOwnershipError('Product', productId, tenantId);
    }
  }

  /**
   * Valida se um item de estoque pertence ao tenant
   */
  async validateInventoryItemTenantOwnership(itemId: number, tenantId: string): Promise<void> {
    const result = await db.query(`
      SELECT ee.id 
      FROM estoque_escolas ee
      JOIN escolas e ON e.id = ee.escola_id
      WHERE ee.id = $1 AND e.tenant_id = $2 AND e.ativo = true
    `, [itemId, tenantId]);
    
    if (result.rows.length === 0) {
      throw new TenantOwnershipError('Inventory Item', itemId, tenantId);
    }
  }

  /**
   * Valida múltiplas entidades de uma vez com relatório detalhado de erros
   */
  async validateBulkTenantOwnership(entityType: string, entityIds: number[], tenantId: string): Promise<void> {
    if (entityIds.length === 0) return;

    // Remove duplicatas
    const uniqueIds = [...new Set(entityIds)];

    let query = '';
    let entityName = '';

    switch (entityType.toLowerCase()) {
      case 'school':
      case 'escola':
        query = `
          SELECT id FROM escolas 
          WHERE id = ANY($1) AND tenant_id = $2 AND ativo = true
        `;
        entityName = 'School';
        break;
      
      case 'product':
      case 'produto':
        query = `
          SELECT id FROM produtos 
          WHERE id = ANY($1) AND tenant_id = $2 AND ativo = true
        `;
        entityName = 'Product';
        break;
      
      case 'inventory':
      case 'estoque':
        query = `
          SELECT ee.id 
          FROM estoque_escolas ee
          JOIN escolas e ON e.id = ee.escola_id
          WHERE ee.id = ANY($1) AND e.tenant_id = $2 AND e.ativo = true
        `;
        entityName = 'Inventory Item';
        break;

      case 'lote':
      case 'batch':
        query = `
          SELECT el.id 
          FROM estoque_lotes el
          JOIN escolas e ON e.id = el.escola_id
          WHERE el.id = ANY($1) AND e.tenant_id = $2 AND e.ativo = true
        `;
        entityName = 'Batch';
        break;
      
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }

    const result = await db.query(query, [uniqueIds, tenantId]);
    
    if (result.rows.length !== uniqueIds.length) {
      const foundIds = result.rows.map((row: any) => row.id);
      const missingIds = uniqueIds.filter(id => !foundIds.includes(id));
      
      // Criar erro mais detalhado
      const errorMessage = `${entityName}(s) [${missingIds.join(', ')}] do not belong to tenant ${tenantId} or do not exist`;
      const error = new TenantOwnershipError(entityName, missingIds.join(', '), tenantId);
      error.message = errorMessage;
      throw error;
    }
  }

  /**
   * Valida múltiplas entidades de tipos diferentes em uma única operação
   */
  async validateMixedEntitiesOwnership(validations: Array<{
    type: string;
    ids: number[];
  }>, tenantId: string): Promise<void> {
    const promises = validations.map(validation => 
      this.validateBulkTenantOwnership(validation.type, validation.ids, tenantId)
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      // Re-throw the first validation error
      throw error;
    }
  }

  /**
   * Valida se um lote pertence ao tenant
   */
  async validateLoteTenantOwnership(loteId: number, tenantId: string): Promise<void> {
    const result = await db.query(`
      SELECT el.id 
      FROM estoque_lotes el
      JOIN escolas e ON e.id = el.escola_id
      WHERE el.id = $1 AND e.tenant_id = $2 AND e.ativo = true
    `, [loteId, tenantId]);
    
    if (result.rows.length === 0) {
      throw new TenantOwnershipError('Lote', loteId, tenantId);
    }
  }

  /**
   * Valida se uma movimentação pertence ao tenant
   */
  async validateMovimentacaoTenantOwnership(movimentacaoId: number, tenantId: string): Promise<void> {
    const result = await db.query(`
      SELECT eeh.id 
      FROM estoque_escolas_historico eeh
      JOIN escolas e ON e.id = eeh.escola_id
      WHERE eeh.id = $1 AND e.tenant_id = $2 AND e.ativo = true
    `, [movimentacaoId, tenantId]);
    
    if (result.rows.length === 0) {
      throw new TenantOwnershipError('Movimentação', movimentacaoId, tenantId);
    }
  }

  /**
   * Valida se uma escola e produto pertencem ao mesmo tenant
   */
  async validateSchoolProductTenantConsistency(schoolId: number, productId: number, tenantId: string): Promise<void> {
    const result = await db.query(`
      SELECT 
        e.id as escola_id,
        p.id as produto_id
      FROM escolas e
      CROSS JOIN produtos p
      WHERE e.id = $1 AND p.id = $2 
        AND e.tenant_id = $3 AND p.tenant_id = $3
        AND e.ativo = true AND p.ativo = true
    `, [schoolId, productId, tenantId]);
    
    if (result.rows.length === 0) {
      throw new TenantOwnershipError('School-Product combination', `${schoolId}-${productId}`, tenantId);
    }
  }

  /**
   * Valida se um usuário tem permissão para acessar recursos do tenant
   */
  async validateUserTenantAccess(userId: number, tenantId: string): Promise<void> {
    const result = await db.query(`
      SELECT u.id 
      FROM usuarios u
      WHERE u.id = $1 AND u.tenant_id = $2 AND u.ativo = true
    `, [userId, tenantId]);
    
    if (result.rows.length === 0) {
      throw new TenantOwnershipError('User', userId, tenantId);
    }
  }

  /**
   * Valida se um conjunto de lotes pertence ao tenant e está ativo
   */
  async validateActiveBatchesTenantOwnership(batchIds: number[], tenantId: string): Promise<void> {
    if (batchIds.length === 0) return;

    const uniqueIds = [...new Set(batchIds)];
    
    const result = await db.query(`
      SELECT el.id 
      FROM estoque_lotes el
      JOIN escolas e ON e.id = el.escola_id
      WHERE el.id = ANY($1) AND e.tenant_id = $2 AND e.ativo = true AND el.status = 'ativo'
    `, [uniqueIds, tenantId]);
    
    if (result.rows.length !== uniqueIds.length) {
      const foundIds = result.rows.map((row: any) => row.id);
      const missingIds = uniqueIds.filter(id => !foundIds.includes(id));
      throw new TenantOwnershipError('Active Batch(es)', missingIds.join(', '), tenantId);
    }
  }

  /**
   * Valida uma operação completa de inventário com múltiplas entidades
   */
  async validateInventoryOperation(operation: {
    schoolId?: number;
    productIds?: number[];
    inventoryItemIds?: number[];
    batchIds?: number[];
    userId?: number;
  }, tenantId: string): Promise<void> {
    const validationPromises: Promise<void>[] = [];

    // Validar escola se fornecida
    if (operation.schoolId) {
      validationPromises.push(
        this.validateSchoolTenantOwnership(operation.schoolId, tenantId)
      );
    }

    // Validar produtos se fornecidos
    if (operation.productIds && operation.productIds.length > 0) {
      validationPromises.push(
        this.validateBulkTenantOwnership('produto', operation.productIds, tenantId)
      );
    }

    // Validar itens de inventário se fornecidos
    if (operation.inventoryItemIds && operation.inventoryItemIds.length > 0) {
      validationPromises.push(
        this.validateBulkTenantOwnership('inventory', operation.inventoryItemIds, tenantId)
      );
    }

    // Validar lotes se fornecidos
    if (operation.batchIds && operation.batchIds.length > 0) {
      validationPromises.push(
        this.validateActiveBatchesTenantOwnership(operation.batchIds, tenantId)
      );
    }

    // Validar usuário se fornecido
    if (operation.userId) {
      validationPromises.push(
        this.validateUserTenantAccess(operation.userId, tenantId)
      );
    }

    // Executar todas as validações em paralelo
    try {
      await Promise.all(validationPromises);
    } catch (error) {
      // Re-throw the first validation error with additional context
      if (error instanceof TenantOwnershipError) {
        throw new TenantInventoryAccessDeniedError(
          'inventory operation',
          `Invalid tenant ownership: ${error.message}`
        );
      }
      throw error;
    }
  }
}

// Instância singleton do validador
export const tenantInventoryValidator = new DatabaseTenantInventoryValidator();

// Função helper para tratamento de erros de tenant
export function handleTenantInventoryError(error: any, res: any) {
  // Log detalhado do erro com contexto de tenant
  const errorContext = {
    name: error.name,
    message: error.message,
    code: error.code,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    tenantId: res.locals?.tenantId || 'unknown'
  };
  
  console.error("❌ Tenant inventory error:", errorContext);
  
  if (error instanceof TenantOwnershipError) {
    return res.status(403).json({
      success: false,
      message: "Acesso negado: recurso não pertence à sua organização",
      code: error.code,
      errorId: generateErrorId()
    });
  }
  
  if (error instanceof TenantInventoryLimitError) {
    return res.status(429).json({
      success: false,
      message: "Limite de inventário da organização excedido",
      code: error.code,
      details: error.message,
      errorId: generateErrorId()
    });
  }
  
  if (error instanceof CrossTenantInventoryAccessError) {
    return res.status(403).json({
      success: false,
      message: "Acesso negado: operação entre organizações não permitida",
      code: error.code,
      errorId: generateErrorId()
    });
  }
  
  if (error instanceof TenantContextMissingError) {
    return res.status(400).json({
      success: false,
      message: "Contexto de organização não encontrado. Faça login novamente.",
      code: error.code,
      errorId: generateErrorId()
    });
  }
  
  if (error instanceof TenantInventoryAccessDeniedError) {
    return res.status(403).json({
      success: false,
      message: "Acesso negado à operação de inventário",
      code: error.code,
      details: error.message,
      errorId: generateErrorId()
    });
  }
  
  if (error instanceof TenantInventoryValidationError) {
    return res.status(400).json({
      success: false,
      message: "Erro de validação de inventário",
      code: error.code,
      errors: error.validationErrors,
      errorId: generateErrorId()
    });
  }
  
  if (error instanceof TenantInventoryNotFoundError) {
    return res.status(404).json({
      success: false,
      message: `${error.entityType} não encontrado(a)`,
      code: error.code,
      entityType: error.entityType,
      entityId: error.entityId,
      errorId: generateErrorId()
    });
  }
  
  if (error instanceof TenantInventoryConflictError) {
    return res.status(409).json({
      success: false,
      message: "Conflito na operação de inventário",
      code: error.code,
      conflictType: error.conflictType,
      details: error.message,
      errorId: generateErrorId()
    });
  }
  
  if (error instanceof TenantInventoryInsufficientStockError) {
    return res.status(400).json({
      success: false,
      message: "Estoque insuficiente para a operação",
      code: error.code,
      requested: error.requested,
      available: error.available,
      errorId: generateErrorId()
    });
  }
  
  if (error instanceof TenantInventoryExpiredBatchError) {
    return res.status(400).json({
      success: false,
      message: "Não é possível usar lote vencido",
      code: error.code,
      batchId: error.batchId,
      expiryDate: error.expiryDate,
      errorId: generateErrorId()
    });
  }
  
  // Tratar erros específicos de banco de dados
  if (error.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      success: false,
      message: "Operação duplicada detectada",
      code: 'DUPLICATE_OPERATION',
      errorId: generateErrorId()
    });
  }
  
  if (error.code === '23503') { // Foreign key constraint violation
    return res.status(400).json({
      success: false,
      message: "Referência inválida na operação",
      code: 'INVALID_REFERENCE',
      errorId: generateErrorId()
    });
  }
  
  // Erro padrão
  const errorId = generateErrorId();
  res.status(500).json({
    success: false,
    message: "Erro interno do servidor",
    code: 'INTERNAL_SERVER_ERROR',
    errorId,
    ...(process.env.NODE_ENV === 'development' && { 
      error: error.message,
      stack: error.stack 
    })
  });
}

// Função para gerar ID único de erro para rastreamento
function generateErrorId(): string {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Função para logging com contexto de tenant
export function logTenantInventoryOperation(
  operation: string, 
  tenantId: string, 
  details: any, 
  level: 'info' | 'warn' | 'error' = 'info'
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    tenantId,
    details,
    level
  };
  
  const message = `[TENANT:${tenantId}] ${operation}`;
  
  switch (level) {
    case 'error':
      console.error(message, logEntry);
      break;
    case 'warn':
      console.warn(message, logEntry);
      break;
    default:
      console.log(message, logEntry);
  }
}

// Função para criar mensagens de erro amigáveis
export function createUserFriendlyErrorMessage(error: any): string {
  if (error instanceof TenantOwnershipError) {
    return "Você não tem permissão para acessar este recurso.";
  }
  
  if (error instanceof TenantInventoryLimitError) {
    return "Limite de inventário da sua organização foi excedido.";
  }
  
  if (error instanceof CrossTenantInventoryAccessError) {
    return "Não é possível acessar recursos de outras organizações.";
  }
  
  if (error instanceof TenantContextMissingError) {
    return "Sessão expirada. Por favor, faça login novamente.";
  }
  
  if (error instanceof TenantInventoryNotFoundError) {
    return `${error.entityType} não encontrado(a) em sua organização.`;
  }
  
  if (error instanceof TenantInventoryConflictError) {
    return "Conflito detectado na operação. Tente novamente.";
  }
  
  if (error instanceof TenantInventoryInsufficientStockError) {
    return `Estoque insuficiente. Disponível: ${error.available}, Solicitado: ${error.requested}`;
  }
  
  if (error instanceof TenantInventoryExpiredBatchError) {
    return `Lote vencido em ${error.expiryDate.toLocaleDateString('pt-BR')}. Não é possível usar.`;
  }
  
  return "Ocorreu um erro inesperado. Tente novamente.";
}