/**
 * Middleware de validação usando Zod
 * Fornece validação robusta e consistente para todas as rotas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Tipos para especificar onde aplicar a validação
type ValidationTarget = 'body' | 'query' | 'params';

interface ValidationOptions {
  target?: ValidationTarget;
  stripUnknown?: boolean;
  abortEarly?: boolean;
}

/**
 * Middleware de validação genérico
 * @param schema Schema Zod para validação
 * @param options Opções de validação
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  options: ValidationOptions = {}
) {
  const {
    target = 'body',
    stripUnknown = true,
    abortEarly = true
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Selecionar dados para validação baseado no target
      let dataToValidate: any;
      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        default:
          dataToValidate = req.body;
      }

      // Aplicar validação
      const validatedData = schema.parse(dataToValidate);

      // Substituir dados originais pelos validados
      switch (target) {
        case 'body':
          req.body = validatedData;
          break;
        case 'query':
          req.query = validatedData;
          break;
        case 'params':
          req.params = validatedData;
          break;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: formattedErrors,
          details: error.errors
        });
      }

      // Erro inesperado
      console.error('Erro inesperado na validação:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: 'Falha na validação'
      });
    }
  };
}

/**
 * Middleware específico para validação do body
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return validate(schema, { target: 'body' });
}

/**
 * Middleware específico para validação de query parameters
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return validate(schema, { target: 'query' });
}

/**
 * Middleware específico para validação de parâmetros da URL
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return validate(schema, { target: 'params' });
}

/**
 * Formatar erros do Zod para resposta mais amigável
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    const message = err.message;

    if (!formattedErrors[path]) {
      formattedErrors[path] = [];
    }

    formattedErrors[path].push(message);
  });

  return formattedErrors;
}

/**
 * Middleware para validação de IDs em parâmetros
 */
export const validateId = validateParams(z.object({
  id: z.coerce.number().int().positive('ID deve ser um número positivo')
}));

/**
 * Middleware para validação de múltiplos IDs
 */
export const validateIds = validateBody(z.object({
  ids: z.array(z.number().int().positive()).min(1, 'Pelo menos um ID deve ser fornecido')
}));

/**
 * Middleware para validação de paginação
 */
export const validatePagination = validateQuery(z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc')
}));

/**
 * Middleware para validação de range de datas
 */
export const validateDateRange = validateQuery(z.object({
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional()
}).refine((data) => {
  if (data.data_inicio && data.data_fim) {
    return new Date(data.data_inicio) <= new Date(data.data_fim);
  }
  return true;
}, {
  message: 'Data de início deve ser anterior à data de fim',
  path: ['data_fim']
}));

/**
 * Wrapper para validação assíncrona
 */
export function validateAsync<T extends z.ZodTypeAny>(
  schema: T,
  options: ValidationOptions = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { target = 'body' } = options;
      
      let dataToValidate: any;
      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
      }

      const validatedData = await schema.parseAsync(dataToValidate);

      switch (target) {
        case 'body':
          req.body = validatedData;
          break;
        case 'query':
          req.query = validatedData;
          break;
        case 'params':
          req.params = validatedData;
          break;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        return res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: formattedErrors,
          details: error.errors
        });
      }

      console.error('Erro inesperado na validação assíncrona:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: 'Falha na validação'
      });
    }
  };
}

/**
 * Middleware para sanitização de dados
 */
export function sanitize() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitizar strings removendo espaços extras
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj.trim();
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      
      return obj;
    };

    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    next();
  };
}

/**
 * Middleware para logging de validação (desenvolvimento)
 */
export function logValidation() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Validação aplicada:', {
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        params: req.params
      });
    }
    next();
  };
}