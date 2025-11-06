import { apiConfig, environmentInfo } from './api';

interface FrontendConfig {
  apiUrl: string;
  environment: string;
  features: {
    debugMode: boolean;
    mockData: boolean;
    analytics: boolean;
    cache: boolean;
  };
  app: {
    name: string;
    version: string;
  };
}

function loadConfig(): FrontendConfig {
  const config: FrontendConfig = {
    // Usar configuração da API centralizada
    apiUrl: apiConfig.isDevelopment ? '/api' : apiConfig.baseURL,
    environment: environmentInfo.mode,
    features: {
      debugMode: apiConfig.debug,
      mockData: import.meta.env.VITE_MOCK_DATA === 'true',
      analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true' && apiConfig.isProduction,
      cache: import.meta.env.VITE_CACHE_ENABLED === 'true'
    },
    app: {
      name: import.meta.env.VITE_APP_NAME || 'Sistema de Alimentação Escolar',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0'
    }
  };

  // Log apenas em desenvolvimento
  if (apiConfig.debug) {
    console.group('🔧 Configuração do Frontend');
    console.table({
      'API URL': config.apiUrl,
      'Environment': config.environment,
      'Debug Mode': config.features.debugMode,
      'Mock Data': config.features.mockData,
      'Analytics': config.features.analytics,
      'Cache': config.features.cache,
      'App Name': config.app.name,
      'App Version': config.app.version
    });
    console.groupEnd();
  }

  return config;
}

export const config = loadConfig();
export default config;