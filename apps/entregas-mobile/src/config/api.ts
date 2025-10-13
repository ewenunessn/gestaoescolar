// Configuração da API - SEMPRE USAR PRODUÇÃO
export const API_CONFIG = {
  // Para desenvolvimento local - backend roda na porta 3000
  DEV_BASE_URL: 'http://192.168.18.12:3000/api',

  // Para produção - API PRINCIPAL
  PROD_BASE_URL: 'https://gestaoescolar-backend.vercel.app/api',

  // Timeout das requisições (5 segundos para fallback rápido para offline)
  TIMEOUT: 5000,

  // Modo offline desabilitado - sempre usar API real
  OFFLINE_MODE: false,
};

// Função para obter a URL base - sempre usar produção
export const getApiBaseUrl = () => {
  return API_CONFIG.PROD_BASE_URL;
};

// Instruções para encontrar seu IP:
// Windows: abra cmd e digite "ipconfig"
// macOS/Linux: abra terminal e digite "ifconfig"
// Procure por "IPv4" ou "inet" - exemplo: 192.168.1.100