import axios, { AxiosError } from "axios";
import { apiConfig, apiLog, apiError, checkApiHealth } from "../config/api";

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

const makeRequestWithRetry = async (
  requestFn: () => Promise<any>,
  retries = apiConfig.retries
) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await requestFn();
    } catch (error) {
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
};

const api = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  withCredentials: true, // Para suportar cookies/sessões
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor de requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  // Só adiciona o header Authorization se há um token válido
  // Em desenvolvimento, permite acesso sem token
  if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  // Add tenant identification headers
  const tenantId = localStorage.getItem("currentTenantId");
  if (tenantId && tenantId !== 'null' && tenantId !== 'undefined') {
    config.headers = config.headers || {};
    config.headers["X-Tenant-ID"] = tenantId;
  }

  // Try to resolve tenant from subdomain if no explicit tenant ID
  if (!tenantId) {
    const subdomain = window.location.hostname.split('.')[0];
    if (subdomain && subdomain !== 'localhost' && subdomain !== 'www') {
      config.headers = config.headers || {};
      config.headers["X-Tenant-Subdomain"] = subdomain;
    }
  }

  // Log em desenvolvimento
  if (apiConfig.debug) {
    apiLog(`📡 ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params,
      headers: {
        'X-Tenant-ID': config.headers?.["X-Tenant-ID"],
        'X-Tenant-Subdomain': config.headers?.["X-Tenant-Subdomain"]
      }
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
          data: response.data,
        }
      );
    }
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
          data: error.response?.data,
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
          `Servidor backend não está respondendo. Verifique se está rodando em http://localhost:3000`
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
          localStorage.removeItem("token");
          // Verificar se estamos na página de login para diferenciar entre credenciais inválidas e sessão expirada
          if (window.location.pathname.includes('/login')) {
            throw new Error("Credenciais inválidas. Verifique seu email e senha.");
          } else {
            window.location.href = "/login";
            throw new Error("Sessão expirada. Faça login novamente.");
          }
        case 403:
          const forbiddenMessage = (data as any)?.message || "Acesso negado. Você não tem permissão para esta ação.";
          throw new Error(forbiddenMessage);
        case 404:
          const notFoundMessage = (data as any)?.message || `Recurso não encontrado: ${originalRequest.url}`;
          throw new Error(notFoundMessage);
        case 409:
          const conflictMessage = (data as any)?.message || "Conflito de dados";
          throw new Error(conflictMessage);
        case 422:
          const validationMessage = (data as any)?.message || (data as any)?.errors || "Dados inválidos";
          throw new Error(validationMessage);
        case 500:
          const serverMessage = (data as any)?.message || "Erro interno do servidor. Tente novamente mais tarde.";
          throw new Error(serverMessage);
        default:
          const message =
            (data as any)?.message || `Erro ${status}: ${error.message}`;
          throw new Error(message);
      }
    }

    throw error;
  }
);

export const apiWithRetry = {
  get: (url: string, config?: any) =>
    makeRequestWithRetry(() => api.get(url, config)),
  post: (url: string, data?: any, config?: any) =>
    makeRequestWithRetry(() => api.post(url, data, config)),
  put: (url: string, data?: any, config?: any) =>
    makeRequestWithRetry(() => api.put(url, data, config)),
  delete: (url: string, config?: any) =>
    makeRequestWithRetry(() => api.delete(url, config)),
};

export default api;
