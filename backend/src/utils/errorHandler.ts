/**
 * Sistema Padronizado de Tratamento de Erros
 * 
 * Fornece classes de erro customizadas e funções helper
 * para tratamento consistente de erros em todo o backend
 */

import { Response } from 'express';

// ============================================
// Classes de Erro Customizadas
// ============================================

/**
 * Erro base para todos os erros da aplicação
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro de validação (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Erro de autenticação (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Não autenticado') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Erro de autorização (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Sem permissão') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Erro de recurso não encontrado (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const message = id 
      ? `${resource} com ID ${id} não encontrado`
      : `${resource} não encontrado`;
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Erro de conflito/duplicação (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

/**
 * Erro de regra de negócio (422)
 */
export class BusinessError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'BUSINESS_ERROR', details);
  }
}

/**
 * Erro de banco de dados (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Erro no banco de dados', originalError?: any) {
    super(message, 500, 'DATABASE_ERROR', {
      originalMessage: originalError?.message,
      code: originalError?.code
    });
  }
}

// ============================================
// Funções Helper
// ============================================

/**
 * Interface para resposta de erro padronizada
 */
interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: any;
  stack?: string;
}

/**
 * Envia resposta de erro padronizada
 */
export function sendErrorResponse(
  res: Response,
  error: Error | AppError,
  includeStack: boolean = process.env.NODE_ENV === 'development'
): Response {
  // Se for um erro customizado da aplicação
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: error.name,
      message: error.message,
      code: error.code,
      details: error.details
    };

    if (includeStack) {
      response.stack = error.stack;
    }

    return res.status(error.statusCode).json(response);
  }

  // Erro genérico
  const response: ErrorResponse = {
    success: false,
    error: 'InternalServerError',
    message: error.message || 'Erro interno do servidor'
  };

  if (includeStack) {
    response.stack = error.stack;
  }

  return res.status(500).json(response);
}

/**
 * Wrapper para async handlers que captura erros automaticamente
 */
export function asyncHandler(
  fn: (req: any, res: Response, next?: any) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('❌ Erro capturado:', error);
      sendErrorResponse(res, error);
    });
  };
}

/**
 * Valida campos obrigatórios
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): void {
  const missing = requiredFields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new ValidationError(
      `Campos obrigatórios ausentes: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Valida tipos de dados
 */
export function validateTypes(
  data: Record<string, any>,
  schema: Record<string, string>
): void {
  const errors: string[] = [];

  for (const [field, expectedType] of Object.entries(schema)) {
    const value = data[field];
    const actualType = typeof value;

    if (value !== undefined && value !== null && actualType !== expectedType) {
      errors.push(`${field} deve ser ${expectedType}, recebido ${actualType}`);
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Tipos de dados inválidos', { errors });
  }
}

/**
 * Converte erros do PostgreSQL em erros da aplicação
 */
export function handleDatabaseError(error: any): never {
  // Violação de constraint única
  if (error.code === '23505') {
    const match = error.detail?.match(/Key \((.*?)\)=/);
    const field = match ? match[1] : 'campo';
    throw new ConflictError(`${field} já existe no sistema`);
  }

  // Violação de foreign key
  if (error.code === '23503') {
    throw new BusinessError('Registro referenciado não existe');
  }

  // Violação de not null
  if (error.code === '23502') {
    const field = error.column || 'campo';
    throw new ValidationError(`${field} é obrigatório`);
  }

  // Erro genérico de banco
  throw new DatabaseError('Erro ao acessar banco de dados', error);
}

/**
 * Logger de erros estruturado
 */
export function logError(error: Error | AppError, context?: any): void {
  const timestamp = new Date().toISOString();
  const isAppError = error instanceof AppError;

  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`❌ [${timestamp}] ${error.name}`);
  console.error(`📝 Mensagem: ${error.message}`);
  
  if (isAppError) {
    console.error(`🔢 Status: ${(error as AppError).statusCode}`);
    console.error(`🏷️  Code: ${(error as AppError).code}`);
    
    if ((error as AppError).details) {
      console.error(`📋 Detalhes:`, (error as AppError).details);
    }
  }

  if (context) {
    console.error(`🔍 Contexto:`, context);
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`📚 Stack:`, error.stack);
  }

  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// ============================================
// Exports
// ============================================

export default {
  // Classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessError,
  DatabaseError,

  // Funções
  sendErrorResponse,
  asyncHandler,
  validateRequired,
  validateTypes,
  handleDatabaseError,
  logError
};
