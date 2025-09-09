// Tipos genéricos para respostas da API

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
  response?: {
    status: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && ('response' in error || 'message' in error);
}

export function getErrorMessage(error: unknown, defaultMessage: string = 'Erro desconhecido'): string {
  if (isApiError(error)) {
    return error.response?.data?.message || error.response?.data?.error || error.message || defaultMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos para filtros comuns
export interface BaseFilters {
  page?: number;
  limit?: number;
  busca?: string;
}

// Tipos para operações CRUD
export interface CreateResponse {
  id: number;
  message: string;
}

export interface UpdateResponse {
  message: string;
}

export interface DeleteResponse {
  message: string;
}

// Tipos para status de operações
export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

// Tipos para dados de formulário
export interface FormData {
  [key: string]: any;
}

// Tipos para validação
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}