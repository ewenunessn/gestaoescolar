import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api',
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
    
    // NÃO fazer logout automático
    // Deixar o componente decidir o que fazer
    
    return Promise.reject(error);
  }
);

export default api;
