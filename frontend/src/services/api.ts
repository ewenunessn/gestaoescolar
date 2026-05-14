import axios, { AxiosError } from "axios";
import { apiConfig, apiLog, apiError, checkApiHealth } from "../config/api";
import { adaptApiEnvelopeForLegacyClients } from "./apiEnvelope";

// Usar a nova configuração de API
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    return await checkApiHealth();
  } catch (error) {
    apiError("Health check falhou:", error);
    return false;
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const makeRequestWithRetry = async <T>(
  requestFn: () => Promise<T>,
  retries = apiConfig.retries
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      const axiosError = error as AxiosError;
      if (
        axiosError.code === "ERR_NETWORK" ||
        axiosError.code === "ERR_CONNECTION_REFUSED"
      ) {
        if (i < retries - 1) {
          console.warn(
            `⚠️ Tentativa ${i + 1} falhou, tentando novamente em 1000ms...`
          );
          await delay(1000);
          continue;
        }
      }
      throw error;
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  throw lastError || new Error('Todas as tentativas falharam');
};

// Utilitário para extrair mensagem de um payload desconhecido
const getMessage = (data: unknown, fallback: string) => {
  if (data && typeof data === 'object' && 'message' in data) {
    const msg = (data as Record<string, unknown>).message;
    if (typeof msg === 'string') return msg;
  }
  return fallback;
};

const createHttpError = (message: string, source: AxiosError) => {
  const httpError = new Error(message) as Error & {
    response?: AxiosError['response'];
    status?: number;
    code?: string;
  };
  httpError.response = source.response;
  httpError.status = source.response?.status;
  httpError.code = source.code;
  return httpError;
};

const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor de requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  // Só adiciona o header Authorization se há um token válido
  if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  // Log em desenvolvimento
  if (apiConfig.debug) {
    apiLog(`📡 ${config.method?.toUpperCase()} ${config.url}`, {
      hasBody: config.data !== undefined,
      hasParams: config.params !== undefined,
      hasToken: !!token
    });
  }

  return config;
});

// Interceptor de resposta
api.interceptors.response.use(
  (response) => {
    // Log em desenvolvimento
    if (apiConfig.debug) {
      apiLog(
        `✅ ${response.config.method?.toUpperCase()} ${response.config.url}`,
        {
          status: response.status,
        }
      );
    }
    response.data = adaptApiEnvelopeForLegacyClients(response.data);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) throw error;

    // Log de erro
    if (apiConfig.debug) {
      apiError(
        `❌ ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`,
        {
          status: error.response?.status,
          message: error.message,
        }
      );
    }

    // Tratamento de erros de conexão
    if (
      error.code === "ERR_NETWORK" ||
      error.code === "ERR_CONNECTION_REFUSED"
    ) {
      const isBackendRunning = await checkBackendHealth();
      if (!isBackendRunning) {
        throw new Error(
          `Não foi possível conectar ao servidor. Verifique sua conexão com a internet.`
        );
      }
      throw new Error(
        "Erro de conexão com o servidor. Verifique sua internet ou tente novamente mais tarde."
      );
    }

    // Tratamento de erros HTTP
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 401:
          // Limpar dados da sessão e redirecionar para login
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("perfil");
          localStorage.removeItem("nome");

          if (!window.location.pathname.includes('/login')) {
            window.location.href = "/login";
          }
          throw createHttpError("Sessão expirada. Faça login novamente.", error);
        case 403:
          const forbiddenMessage = getMessage(data, "Acesso negado. Você não tem permissão para esta ação.");
          throw createHttpError(forbiddenMessage, error);
        case 404:
          const notFoundMessage = getMessage(data, `Recurso não encontrado: ${originalRequest.url}`);
          throw createHttpError(notFoundMessage, error);
        case 409:
          const conflictMessage = getMessage(data, "Conflito de dados");
          throw createHttpError(conflictMessage, error);
        case 422: {
          // Prioriza message; se ausente, tenta errors como string simples
          let validationMessage = getMessage(data, "Dados inválidos");
          if (typeof data === 'object' && data !== null && 'errors' in data) {
            const errorsField = (data as Record<string, unknown>).errors;
            if (typeof errorsField === 'string') {
              validationMessage = errorsField;
            }
          }
          throw createHttpError(validationMessage, error);
        }
        case 500:
          const serverMessage = getMessage(data, "Erro interno do servidor. Tente novamente mais tarde.");
          throw createHttpError(serverMessage, error);
        default:
          const message =
            getMessage(data, `Erro ${status}: ${error.message}`);
          throw createHttpError(message, error);
      }
    }

    throw error;
  }
);

export const apiWithRetry = {
  get: <T = any>(url: string, config?: import('axios').AxiosRequestConfig) =>
    makeRequestWithRetry(() => api.get<T>(url, config)),
  post: <T = any>(url: string, data?: unknown, config?: import('axios').AxiosRequestConfig) =>
    makeRequestWithRetry(() => api.post<T>(url, data, config)),
  put: <T = any>(url: string, data?: unknown, config?: import('axios').AxiosRequestConfig) =>
    makeRequestWithRetry(() => api.put<T>(url, data, config)),
  patch: <T = any>(url: string, data?: unknown, config?: import('axios').AxiosRequestConfig) =>
    makeRequestWithRetry(() => api.patch<T>(url, data, config)),
  delete: <T = any>(url: string, config?: import('axios').AxiosRequestConfig) =>
    makeRequestWithRetry(() => api.delete<T>(url, config)),
};

export default api;
