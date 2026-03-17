import { useToast } from './useToast';

export interface ErrorResponse {
  response?: {
    data?: {
      message?: string;
      error?: string;
      code?: string;
    };
    status?: number;
  };
  message?: string;
}

export const useErrorHandler = () => {
  const toast = useToast();

  const handleError = (error: ErrorResponse, defaultMessage = 'Erro inesperado') => {
    console.error('Erro capturado:', error);

    // Extrair mensagem de erro de forma padronizada
    let errorMessage = defaultMessage;

    if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error?.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    // Tratar códigos de erro específicos
    if (error?.response?.status === 401) {
      errorMessage = 'Sessão expirada. Faça login novamente.';
      toast.errorAuth();
      return;
    }

    if (error?.response?.status === 403) {
      errorMessage = 'Você não tem permissão para realizar esta ação.';
    }

    if (error?.response?.status === 404) {
      errorMessage = 'Recurso não encontrado.';
    }

    if (error?.response?.status === 422) {
      errorMessage = error?.response?.data?.message || 'Dados inválidos.';
    }

    if (error?.response?.status === 500) {
      errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
    }

    // Exibir toast de erro
    toast.error(errorMessage);
  };

  const handleApiError = (error: ErrorResponse, operation: string) => {
    const operationMessages: Record<string, string> = {
      'load': 'Erro ao carregar dados',
      'save': 'Erro ao salvar',
      'delete': 'Erro ao excluir',
      'create': 'Erro ao criar',
      'update': 'Erro ao atualizar',
      'export': 'Erro ao exportar',
      'import': 'Erro ao importar',
    };

    const defaultMessage = operationMessages[operation] || `Erro ao ${operation}`;
    handleError(error, defaultMessage);
  };

  return {
    handleError,
    handleApiError,
  };
};