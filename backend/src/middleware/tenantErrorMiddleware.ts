import { Request, Response, NextFunction } from 'express';
import { 
  handleTenantInventoryError, 
  logTenantInventoryOperation,
  createUserFriendlyErrorMessage,
  TenantOwnershipError,
  TenantInventoryLimitError,
  CrossTenantInventoryAccessError,
  TenantContextMissingError,
  TenantInventoryAccessDeniedError,
  TenantInventoryValidationError,
  TenantInventoryNotFoundError,
  TenantInventoryConflictError,
  TenantInventoryInsufficientStockError,
  TenantInventoryExpiredBatchError
} from '../services/tenantInventoryValidator';

/**
 * Middleware para tratamento centralizado de erros relacionados a tenant
 */
export function tenantErrorHandler(
  error: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  // Extrair contexto de tenant da requisição
  const tenantId = req.headers['x-tenant-id'] || req.user?.tenant?.id || 'unknown';
  
  // Adicionar contexto de tenant ao response locals para logging
  res.locals.tenantId = tenantId;
  
  // Log do erro com contexto de tenant
  logTenantInventoryOperation(
    'ERROR_HANDLER',
    tenantId as string,
    {
      errorName: error.name,
      errorMessage: error.message,
      errorCode: error.code,
      requestPath: req.path,
      requestMethod: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    },
    'error'
  );
  
  // Verificar se é um erro relacionado a tenant
  const isTenantError = error instanceof TenantOwnershipError ||
                       error instanceof TenantInventoryLimitError ||
                       error instanceof CrossTenantInventoryAccessError ||
                       error instanceof TenantContextMissingError ||
                       error instanceof TenantInventoryAccessDeniedError ||
                       error instanceof TenantInventoryValidationError ||
                       error instanceof TenantInventoryNotFoundError ||
                       error instanceof TenantInventoryConflictError ||
                       error instanceof TenantInventoryInsufficientStockError ||
                       error instanceof TenantInventoryExpiredBatchError;
  
  if (isTenantError) {
    // Usar o handler específico para erros de tenant
    return handleTenantInventoryError(error, res);
  }
  
  // Para outros erros, passar para o próximo middleware de erro
  next(error);
}

/**
 * Middleware para capturar erros assíncronos em rotas de inventário
 */
export function asyncTenantErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware para validar contexto de tenant antes de operações de inventário
 */
export function validateTenantContext(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenant?.id;
    
    if (!tenantId) {
      throw new TenantContextMissingError();
    }
    
    // Adicionar tenant ID ao request para uso posterior
    req.tenantId = tenantId as string;
    res.locals.tenantId = tenantId;
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware para logging de operações de inventário com contexto de tenant
 */
export function logTenantInventoryRequest(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  const tenantId = req.tenantId || req.headers['x-tenant-id'] || 'unknown';
  
  logTenantInventoryOperation(
    'REQUEST',
    tenantId as string,
    {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    },
    'info'
  );
  
  next();
}

// Estender o tipo Request para incluir tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}