import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de tratamento de erros global
 * Fornece respostas consistentes e amigáveis para diferentes tipos de erro
 */

interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
  statusCode: number;
}

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const message = id 
      ? `${resource} com ID ${id} não encontrado(a)`
      : `${resource} não encontrado(a)`;
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403);
  }
}

/**
 * Middleware principal de tratamento de erros
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log do erro (em produção, usar logger apropriado)
  console.error('❌ Erro capturado:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Erro operacional conhecido
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: err.constructor.name,
      message: err.message,
      statusCode: err.statusCode
    };

    // Incluir stack trace em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      response.details = {
        stack: err.stack,
        path: req.path,
        method: req.method
      };
    }

    return res.status(err.statusCode).json(response);
  }

  // Erro de validação do banco de dados
  if (err.message.includes('violates foreign key constraint')) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Referência inválida. Verifique se os IDs fornecidos existem.',
      statusCode: 400
    });
  }

  if (err.message.includes('duplicate key value')) {
    return res.status(409).json({
      success: false,
      error: 'ConflictError',
      message: 'Registro duplicado. Este item já existe no sistema.',
      statusCode: 409
    });
  }

  // Erro genérico não tratado
  const response: ErrorResponse = {
    success: false,
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor. Tente novamente mais tarde.'
      : err.message,
    statusCode: 500
  };

  if (process.env.NODE_ENV === 'development') {
    response.details = {
      stack: err.stack,
      path: req.path,
      method: req.method
    };
  }

  res.status(500).json(response);
};

/**
 * Middleware para rotas não encontradas (404)
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'NotFoundError',
    message: `Rota ${req.method} ${req.path} não encontrada`,
    statusCode: 404,
    availableRoutes: process.env.NODE_ENV === 'development' ? {
      hint: 'Verifique a documentação da API ou o arquivo de rotas'
    } : undefined
  });
};

/**
 * Wrapper para funções assíncronas
 * Evita try-catch repetitivo em cada controller
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
