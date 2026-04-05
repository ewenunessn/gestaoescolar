// Configuração centralizada do frontend
const isVercel = import.meta.env.VITE_VERCEL === 'true';
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

export const config = {
  // Configurações da API
  apiUrl: isVercel 
    ? import.meta.env.VITE_API_URL || "https://your-backend.vercel.app/api"
    : import.meta.env.VITE_API_URL || "/api",
  
  healthUrl: isVercel
    ? import.meta.env.VITE_HEALTH_URL || "https://your-backend.vercel.app/health"
    : import.meta.env.VITE_HEALTH_URL || "/health",

  // Configurações do app
  appName: import.meta.env.VITE_APP_NAME || "Sistema de Alimentação Escolar",
  appVersion: import.meta.env.VITE_APP_VERSION || "1.0.0",

  // Configurações de timeout
  timeout: 15000, // Aumentado para Vercel
  retryAttempts: 3,
  retryDelay: 1000,

  // Configurações de ambiente
  isDevelopment,
  isProduction,
  isVercel,

  // URLs completas
  get baseApiUrl() {
    return this.apiUrl.replace("/api", "");
  },

  get fullHealthUrl() {
    return this.healthUrl;
  },
};

// Validação da configuração
export const validateConfig = () => {
  const errors: string[] = [];

  if (!config.apiUrl) {
    errors.push("VITE_API_URL não está configurada");
  }

  if (!config.healthUrl) {
    errors.push("VITE_HEALTH_URL não está configurada");
  }

  if (errors.length > 0) {
    console.error("Configuration errors:", errors);
  }

  return errors.length === 0;
};

