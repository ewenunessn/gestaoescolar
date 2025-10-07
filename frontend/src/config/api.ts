// Configuração da API baseada no ambiente

interface ApiConfig {
  baseURL: string;
  healthURL: string;
  timeout: number;
  retries: number;
  isDevelopment: boolean;
  isProduction: boolean;
  debug: boolean;
}

// Função para detectar o ambiente
const getEnvironment = (): 'development' | 'production' => {
  // Verificar se está no Vercel
  if (import.meta.env.VITE_VERCEL === 'true' || window.location.hostname.includes('vercel.app')) {
    return 'production';
  }
  
  // Verificar se está em localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'development';
  }
  
  // Fallback para variável de ambiente
  return import.meta.env.MODE as 'development' | 'production' || 'development';
};

// Configuração baseada no ambiente
const createApiConfig = (): ApiConfig => {
  const environment = getEnvironment();
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';
  
  // URLs baseadas no ambiente
  let baseURL: string;
  let healthURL: string;
  
  if (isDevelopment) {
    // Desenvolvimento - API local
    baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    healthURL = import.meta.env.VITE_HEALTH_URL || 'http://localhost:3000/health';
  } else {
    // Produção - usar URL do backend na Vercel
    baseURL = import.meta.env.VITE_API_URL || 'https://gestaoescolar-backend.vercel.app';
    healthURL = import.meta.env.VITE_HEALTH_URL || 'https://gestaoescolar-backend.vercel.app/health';
  }
  
  return {
    baseURL,
    healthURL,
    timeout: isDevelopment ? 10000 : 30000, // 10s dev, 30s prod
    retries: isDevelopment ? 2 : 3,
    isDevelopment,
    isProduction,
    debug: import.meta.env.VITE_DEBUG === 'true' || isDevelopment
  };
};

// Exportar configuração
export const apiConfig = createApiConfig();

// Função para log condicional
export const apiLog = (...args: any[]) => {
  if (apiConfig.debug) {
    console.log('[API]', ...args);
  }
};

// Função para log de erro
export const apiError = (...args: any[]) => {
  console.error('[API ERROR]', ...args);
};

// Função para verificar se a API está online
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(apiConfig.healthURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      apiLog('API Health Check:', data);
      return data.status === 'ok';
    }
    
    return false;
  } catch (error) {
    apiError('Health check failed:', error);
    return false;
  }
};

// Exportar informações do ambiente
export const environmentInfo = {
  mode: getEnvironment(),
  isDevelopment: apiConfig.isDevelopment,
  isProduction: apiConfig.isProduction,
  baseURL: apiConfig.baseURL,
  healthURL: apiConfig.healthURL,
  debug: apiConfig.debug,
  hostname: window.location.hostname,
  userAgent: navigator.userAgent
};

// Log da configuração no console (apenas em desenvolvimento)
if (apiConfig.debug) {
  console.group('🔧 API Configuration');
  console.table(environmentInfo);
  console.groupEnd();
}