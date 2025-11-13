import axios from 'axios';

// Detectar ambiente e usar URL apropriada
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
const productionApiUrl = 'https://gestaoescolar-backend-seven.vercel.app/api';
const developmentApiUrl = 'http://localhost:3000/api';

// Tentar pegar do env, senão usar baseado no hostname
const envApiUrl = (import.meta as any).env?.VITE_API_URL;
const apiUrl = envApiUrl || (isProduction ? productionApiUrl : developmentApiUrl);

console.log('🔧 API Configuration:', {
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
  isProduction,
  VITE_API_URL: envApiUrl,
  productionApiUrl,
  developmentApiUrl,
  finalApiUrl: apiUrl,
  allEnvVars: (import.meta as any).env
});

const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  console.log('API Request:', {
    url: config.url,
    method: config.method,
    hasToken: !!token,
    tokenPreview: token?.substring(0, 20)
  });
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('API Success:', {
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    
    // Se token inválido ou expirado (401), limpar localStorage
    if (error.response?.status === 401) {
      console.warn('Token inválido ou expirado, limpando sessão');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      
      // Redirecionar para login se não estiver na página de login
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
