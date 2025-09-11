import Constants from 'expo-constants';

// Configuração da API baseada no ambiente
const getApiUrl = (): string => {
  // Usar sempre o backend do Vercel
  return 'https://gestaoescolar-backend.vercel.app';
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  TIMEOUT: 10000, // 10 segundos
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// Configurações específicas para desenvolvimento
export const DEV_CONFIG = {
  // Habilitar logs detalhados em desenvolvimento
  ENABLE_LOGS: __DEV__,
  // Simular delay de rede em desenvolvimento (ms)
  NETWORK_DELAY: __DEV__ ? 500 : 0,
};

// Endpoints da API - Atualizados para as rotas do Vercel
export const API_ENDPOINTS = {
  // Autenticação
  LOGIN: '/api/auth/login',
  VERIFY_SESSION: '/api/auth/verificar',
  
  // Usuários
  USUARIOS: '/api/usuarios',
  
  // Escolas
  ESCOLAS: '/api/escolas',
  
  // Produtos
  PRODUTOS: '/api/produtos',
  PRODUTOS_ORM: '/api/produtos-orm',
  
  // Estoque
  ESTOQUE_MODERNO: '/api/estoque-moderno',
  ESTOQUE_ESCOLAR: '/api/estoque-escolar',
  
  // Fornecedores
  FORNECEDORES: '/api/fornecedores',
  
  // Contratos
  CONTRATOS: '/api/contratos',
  CONTRATO_PRODUTOS: '/api/contrato-produtos',
  
  // Pedidos
  PEDIDOS_MODERNOS: '/api/pedidos-modernos',
  
  // Recebimento
  RECEBIMENTO_SIMPLES: '/api/recebimento-simples',
  
  // Health Check
  HEALTH: '/health',
  
  // Estoque Escolar (usando endpoints corretos do backend)
  ESTOQUE_ESCOLA: (escolaId: number) => `/api/estoque-escola/escola/${escolaId}`,
  ESTOQUE_RESUMO: (escolaId: number) => `/api/estoque-escola/escola/${escolaId}`,
  ESTOQUE_HISTORICO: (escolaId: number) => `/api/estoque-escola/escola/${escolaId}/historico`,
  ESTOQUE_ITEM: (itemId: number) => `/api/estoque-escola/item/${itemId}`,
  ESTOQUE_ESCOLA_ITEM: (escolaId: number) => `/api/estoque-escola/escola/${escolaId}`,
  ESTOQUE_LOTE: (escolaId: number) => `/api/estoque-escola/escola/${escolaId}/lote`,
  
  // Movimentações
  MOVIMENTO_ESTOQUE: (escolaId: number) => `/api/estoque-escola/escola/${escolaId}/movimentacao`,
  

};

export default API_CONFIG;