import { Request, Response, NextFunction } from 'express';

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

const DEFAULT_SORT_FIELD = 'id';
const SAFE_SQL_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

export const getPaginationParams = (req: Request): PaginationParams => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const offset = (page - 1) * limit;
  const sort = (req.query.sort as string) || DEFAULT_SORT_FIELD;
  const order = (req.query.order as string)?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  return { page, limit, offset, sort, order };
};

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

export const paginationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  (req as any).pagination = getPaginationParams(req);

  (res as any).paginate = <T>(data: T[], total: number) => {
    const params = (req as any).pagination as PaginationParams;
    return res.json(createPaginatedResponse(data, total, params));
  };

  next();
};

export const getPaginationSQL = (params: PaginationParams): string => {
  return `LIMIT ${params.limit} OFFSET ${params.offset}`;
};

export const getOrderBySQL = (params: PaginationParams, allowedFields: string[] = []): string => {
  const safeAllowedFields = allowedFields.filter((field) => SAFE_SQL_IDENTIFIER.test(field));
  const requestedSort = params.sort || DEFAULT_SORT_FIELD;
  const defaultSort = safeAllowedFields[0] || DEFAULT_SORT_FIELD;
  const sortField = safeAllowedFields.includes(requestedSort) ? requestedSort : defaultSort;
  const order = params.order === 'DESC' ? 'DESC' : 'ASC';

  return `ORDER BY ${sortField} ${order}`;
};

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

export const validatePaginationParams = (req: Request, res: Response, next: NextFunction) => {
  const page = req.query.page ? parseInt(req.query.page as string) : undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

  if (page !== undefined && (isNaN(page) || page < 1)) {
    const message = 'Parametro "page" deve ser um numero maior que 0';
    return res.status(422).json({
      success: false,
      message,
      error: { code: 'VALIDATION_ERROR', message },
      errors: [{ field: 'page', message, code: 'invalid_pagination' }],
      fields: { page: [message] }
    });
  }

  if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
    const message = 'Parametro "limit" deve ser um numero entre 1 e 100';
    return res.status(422).json({
      success: false,
      message,
      error: { code: 'VALIDATION_ERROR', message },
      errors: [{ field: 'limit', message, code: 'invalid_pagination' }],
      fields: { limit: [message] }
    });
  }

  next();
};
