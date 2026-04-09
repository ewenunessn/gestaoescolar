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
  
  // SEMPRE logar em produção temporariamente para debug
  console.log('🔍 [API DEBUG] URL:', config.url);
  console.log('🔍 [API DEBUG] Token no localStorage:', token ? `${token.substring(0, 30)}...` : 'AUSENTE');
  
  // Só adiciona o header Authorization se há um token válido
  // Em desenvolvimento, permite acesso sem token
  if (token && token !== 'null' && token !== 'undefined' && token.length > 10) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
    console.log('✅ [API DEBUG] Token adicionado ao header Authorization');
  } else {
    console.log('⚠️ [API DEBUG] Token NÃO adicionado - inválido ou ausente');
  }

  // Log em desenvolvimento
  if (apiConfig.debug) {
    apiLog(`📡 ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params,
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
          console.error('🚫 [API] Erro 401 - Não autorizado');
          console.error('🚫 [API] URL:', originalRequest.url);
          console.error('🚫 [API] Pathname atual:', window.location.pathname);
          
          // TEMPORÁRIO: Não redirecionar automaticamente para permitir debug
          // Apenas logar o erro e deixar o usuário ver os logs
          if (window.location.pathname.includes('/login')) {
            console.error('🚫 [API] Credenciais inválidas na página de login');
            throw new Error("Credenciais inválidas. Verifique seu email e senha.");
          } else {
            console.error('🚫 [API] Sessão expirada - MAS NÃO VAI REDIRECIONAR AINDA');
            console.error('🚫 [API] VERIFIQUE OS LOGS ACIMA PARA ENTENDER O PROBLEMA');
            console.error('🚫 [API] Token no localStorage:', localStorage.getItem('token') ? 'EXISTE' : 'AUSENTE');
            
            // Mostrar alerta visual
            const alertDiv = document.createElement('div');
            alertDiv.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: #ff4444;
              color: white;
              padding: 20px;
              border-radius: 8px;
              z-index: 999999;
              font-size: 16px;
              font-weight: bold;
              box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            `;
            alertDiv.innerHTML = `
              ⚠️ ERRO 401 DETECTADO!<br>
              Verifique o console (F12) para ver os logs.<br>
              Redirecionando em 5 segundos...
            `;
            document.body.appendChild(alertDiv);
            
            // Aguardar 5 segundos antes de limpar e redirecionar
            setTimeout(() => {
              console.error('🚫 [API] Agora sim, limpando dados e redirecionando...');
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              localStorage.removeItem("perfil");
              localStorage.removeItem("nome");
              
              if (!window.location.pathname.includes('/login')) {
                window.location.href = "/login";
              }
            }, 5000); // 5 segundos de delay
            
            throw new Error("Sessão expirada. Redirecionando em 5 segundos...");
          }
        case 403:
          const forbiddenMessage = getMessage(data, "Acesso negado. Você não tem permissão para esta ação.");
          throw new Error(forbiddenMessage);
        case 404:
          const notFoundMessage = getMessage(data, `Recurso não encontrado: ${originalRequest.url}`);
          throw new Error(notFoundMessage);
        case 409:
          const conflictMessage = getMessage(data, "Conflito de dados");
          throw new Error(conflictMessage);
        case 422: {
          // Prioriza message; se ausente, tenta errors como string simples
          let validationMessage = getMessage(data, "Dados inválidos");
          if (typeof data === 'object' && data !== null && 'errors' in data) {
            const errorsField = (data as Record<string, unknown>).errors;
            if (typeof errorsField === 'string') {
              validationMessage = errorsField;
            }
          }
          throw new Error(validationMessage);
        }
        case 500:
          const serverMessage = getMessage(data, "Erro interno do servidor. Tente novamente mais tarde.");
          throw new Error(serverMessage);
        default:
          const message =
            getMessage(data, `Erro ${status}: ${error.message}`);
          throw new Error(message);
      }
    }

    throw error;
  }
);

export const apiWithRetry = {
  get: <T = unknown>(url: string, config?: import('axios').AxiosRequestConfig) =>
    makeRequestWithRetry(() => api.get<T>(url, config)),
  post: <T = unknown>(url: string, data?: unknown, config?: import('axios').AxiosRequestConfig) =>
    makeRequestWithRetry(() => api.post<T>(url, data, config)),
  put: <T = unknown>(url: string, data?: unknown, config?: import('axios').AxiosRequestConfig) =>
    makeRequestWithRetry(() => api.put<T>(url, data, config)),
  patch: <T = unknown>(url: string, data?: unknown, config?: import('axios').AxiosRequestConfig) =>
    makeRequestWithRetry(() => api.patch<T>(url, data, config)),
  delete: <T = unknown>(url: string, config?: import('axios').AxiosRequestConfig) =>
    makeRequestWithRetry(() => api.delete<T>(url, config)),
};

export default api;
