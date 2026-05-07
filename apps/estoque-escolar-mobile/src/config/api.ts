import Constants from 'expo-constants';

export const PORTAL_BFF_PREFIX = '/bff/portal';

export function normalizePortalBffEndpoint(endpoint: string): string {
  if (endpoint.startsWith(`${PORTAL_BFF_PREFIX}/`) || endpoint === PORTAL_BFF_PREFIX) {
    return endpoint;
  }

  if (endpoint.startsWith('/api/')) {
    return `${PORTAL_BFF_PREFIX}/${endpoint.slice('/api/'.length)}`;
  }

  if (endpoint === '/api') {
    return PORTAL_BFF_PREFIX;
  }

  return endpoint;
}

export function buildPortalBffUrl(endpoint: string): string {
  return `${getApiUrl()}${normalizePortalBffEndpoint(endpoint)}`;
}

// Configuração da API baseada no ambiente
const getApiUrl = (): string => {
  // Sempre usar o backend do Vercel para evitar problemas de conexão local
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
  // Desabilitar logs para evitar spam no console
  ENABLE_LOGS: false,
  // Sem delay de rede
  NETWORK_DELAY: 0,
};

// Endpoints da API - Atualizados para as rotas do Vercel
export const API_ENDPOINTS = {
  // Autenticação
  LOGIN: `${PORTAL_BFF_PREFIX}/auth/login`,
  VERIFY_SESSION: `${PORTAL_BFF_PREFIX}/auth/verificar`,
  
  // Usuários
  USUARIOS: `${PORTAL_BFF_PREFIX}/usuarios`,
  
  // Escolas
  ESCOLAS: `${PORTAL_BFF_PREFIX}/escolas`,
  
  // Produtos
  PRODUTOS: `${PORTAL_BFF_PREFIX}/produtos`,
  PRODUTOS_ORM: `${PORTAL_BFF_PREFIX}/produtos-orm`,
  
  // Estoque
  ESTOQUE_MODERNO: `${PORTAL_BFF_PREFIX}/estoque-moderno`,
  ESTOQUE_ESCOLAR: `${PORTAL_BFF_PREFIX}/estoque-escolar`,
  
  // Fornecedores
  FORNECEDORES: `${PORTAL_BFF_PREFIX}/fornecedores`,
  
  // Contratos
  CONTRATOS: `${PORTAL_BFF_PREFIX}/contratos`,
  CONTRATO_PRODUTOS: `${PORTAL_BFF_PREFIX}/contrato-produtos`,
  
  // Pedidos
  PEDIDOS_MODERNOS: `${PORTAL_BFF_PREFIX}/pedidos-modernos`,
  
  // Recebimento
  RECEBIMENTO_SIMPLES: `${PORTAL_BFF_PREFIX}/recebimento-simples`,
  
  // Health Check
  HEALTH: '/health',
  
  // Estoque Escolar (usando endpoints corretos do backend)
  ESTOQUE_ESCOLA: (escolaId: number) => `${PORTAL_BFF_PREFIX}/estoque-escola/escola/${escolaId}`,
  ESTOQUE_RESUMO: (escolaId: number) => `${PORTAL_BFF_PREFIX}/estoque-escola/escola/${escolaId}`,
  ESTOQUE_HISTORICO: (escolaId: number) => `${PORTAL_BFF_PREFIX}/estoque-escola/escola/${escolaId}/historico`,
  ESTOQUE_ITEM: (itemId: number) => `${PORTAL_BFF_PREFIX}/estoque-escola/item/${itemId}`,
  ESTOQUE_ESCOLA_ITEM: (escolaId: number) => `${PORTAL_BFF_PREFIX}/estoque-escola/escola/${escolaId}`,
  ESTOQUE_LOTE: (escolaId: number) => `${PORTAL_BFF_PREFIX}/estoque-escola/escola/${escolaId}/lote`,
  
  // Movimentações
  MOVIMENTO_ESTOQUE: (escolaId: number) => `${PORTAL_BFF_PREFIX}/estoque-escola/escola/${escolaId}/movimentacao`,
  

};

export default API_CONFIG;
