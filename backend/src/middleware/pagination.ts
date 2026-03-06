import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de paginação para listas grandes
 */

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

/**
 * Extrai parâmetros de paginação da query string
 */
export const getPaginationParams = (req: Request): PaginationParams => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const offset = (page - 1) * limit;
  const sort = (req.query.sort as string) || 'id';
  const order = (req.query.order as string)?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  return { page, limit, offset, sort, order };
};

/**
 * Cria resposta paginada
 */
export const createPaginatedResponse = <T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / params.limit);
  
  return {
    success: true,
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1
    }
  };
};

/**
 * Middleware que adiciona helpers de paginação ao request
 */
export const paginationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Adicionar helper ao request
  (req as any).pagination = getPaginationParams(req);
  
  // Adicionar helper de resposta
  (res as any).paginate = <T>(data: T[], total: number) => {
    const params = (req as any).pagination as PaginationParams;
    return res.json(createPaginatedResponse(data, total, params));
  };

  next();
};

/**
 * Gera cláusula SQL de paginação
 */
export const getPaginationSQL = (params: PaginationParams): string => {
  return `LIMIT ${params.limit} OFFSET ${params.offset}`;
};

/**
 * Gera cláusula SQL de ordenação
 */
export const getOrderBySQL = (params: PaginationParams, allowedFields: string[] = []): string => {
  // Validar campo de ordenação para prevenir SQL injection
  const sortField = allowedFields.length > 0 && !allowedFields.includes(params.sort || '')
    ? allowedFields[0]
    : params.sort || 'id';
  
  return `ORDER BY ${sortField} ${params.order || 'ASC'}`;
};

/**
 * Helper completo para queries paginadas
 */
export const buildPaginatedQuery = (
  baseQuery: string,
  params: PaginationParams,
  allowedSortFields: string[] = []
): { query: string; countQuery: string } => {
  const orderBy = getOrderBySQL(params, allowedSortFields);
  const pagination = getPaginationSQL(params);
  
  return {
    query: `${baseQuery} ${orderBy} ${pagination}`,
    countQuery: `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`
  };
};

/**
 * Exemplo de uso em controller:
 * 
 * export const listarEscolas = async (req: Request, res: Response) => {
 *   const params = getPaginationParams(req);
 *   
 *   const baseQuery = 'SELECT * FROM escolas WHERE ativo = true';
 *   const { query, countQuery } = buildPaginatedQuery(
 *     baseQuery,
 *     params,
 *     ['id', 'nome', 'created_at']
 *   );
 *   
 *   const [data, countResult] = await Promise.all([
 *     db.query(query),
 *     db.query(countQuery)
 *   ]);
 *   
 *   const total = parseInt(countResult.rows[0].total);
 *   return res.json(createPaginatedResponse(data.rows, total, params));
 * };
 */

/**
 * Validar parâmetros de paginação
 */
export const validatePaginationParams = (req: Request, res: Response, next: NextFunction) => {
  const page = req.query.page ? parseInt(req.query.page as string) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

  if (page !== undefined && (isNaN(page) || page < 1)) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Parâmetro "page" deve ser um número maior que 0',
      statusCode: 400
    });
  }

  if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Parâmetro "limit" deve ser um número entre 1 e 100',
      statusCode: 400
    });
  }

  next();
};
