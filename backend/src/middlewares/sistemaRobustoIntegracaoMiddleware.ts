import { Request, Response, NextFunction } from 'express';
import SistemaRobustoManager from '../utils/sistemaRobustoManager';
import { SistemaRobusto } from '../utils/sistemaRobusto';
import { Pool } from 'pg';

// Criar instância do sistema robusto manager
const sistemaRobusto = new SistemaRobustoManager();

interface RequestWithTiming extends Request {
  startTime?: number;
  sistemaRobusto?: SistemaRobustoManager;
}

// Mapeamento de rotas para módulos
const ROUTE_MODULE_MAP: { [key: string]: string } = {
  '/api/usuarios': 'BASE',
  '/api/escolas': 'BASE',
  '/api/produtos': 'BASE',
  '/api/modalidades': 'BASE',
  '/api/cardapios': 'MENU',
  '/api/refeicoes': 'MENU',
  '/api/fornecedores': 'SUPPLIER',
  '/api/contratos': 'SUPPLIER',
  // '/api/aditivos-contrato': 'SUPPLIER', // Removido - módulo de aditivos excluído
  '/api/pedidos': 'PROCUREMENT',
  '/api/pedidos-modernos': 'PROCUREMENT',

  '/api/recebimentos': 'DELIVERY',
  '/api/recebimentos-modernos': 'DELIVERY',
  '/api/movimentacoes-consumo': 'INVENTORY',
  '/api/estoque': 'INVENTORY',
  '/api/alertas': 'REPORTING'
  // '/api/relatorios': 'REPORTING' - removido, módulo de relatórios descontinuado
};

// Operações que devem ser auditadas
const AUDIT_OPERATIONS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Operações críticas que requerem nível alto de auditoria
const CRITICAL_OPERATIONS = [
  'POST /api/usuarios',
  'PUT /api/usuarios',
  'DELETE /api/usuarios',
  'POST /api/contratos',
  'PUT /api/contratos',
  'DELETE /api/contratos',
  'POST /api/pedidos-modernos',
  'PUT /api/pedidos-modernos',

];

/**
 * Middleware para inicializar o sistema robusto na requisição
 */
export const inicializarSistemaRobusto = (req: RequestWithTiming, res: Response, next: NextFunction) => {
  req.startTime = Date.now();
  req.sistemaRobusto = new SistemaRobustoManager();
  next();
};

/**
 * Middleware para auditoria automática de operações
 */
export const auditoriaAutomatica = async (req: RequestWithTiming, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const originalJson = res.json;

  // Interceptar resposta para capturar dados
  res.send = function(data) {
    capturarAuditoria(req, res, data);
    return originalSend.call(this, data);
  };

  res.json = function(data) {
    capturarAuditoria(req, res, data);
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Função para capturar dados de auditoria
 */
async function capturarAuditoria(req: RequestWithTiming, res: Response, responseData: any) {
  if (!req.sistemaRobusto || !AUDIT_OPERATIONS.includes(req.method)) {
    return;
  }

  try {
    const modulo = determinarModulo(req.path);
    const tabela = extrairTabelaDaRota(req.path);
    const operacao = mapearOperacao(req.method);
    const registroId = extrairRegistroId(req, responseData);
    const operationKey = `${req.method} ${req.path}`;
    const nivelCriticidade = CRITICAL_OPERATIONS.includes(operationKey) ? 'CRITICO' : 'NORMAL';

    await sistemaRobusto.registrarAuditoria({
      modulo,
      tabela,
      operacao,
      registro_id: registroId,
      dados_novos: req.method !== 'DELETE' ? JSON.stringify(req.body) : undefined,
      usuario_id: (req as any).user?.id,
      usuario_nome: (req as any).user?.nome,
      ip_usuario: req.ip,
      contexto_operacao: `${req.method}_${tabela.toUpperCase()}`,
      nivel_criticidade: nivelCriticidade as any
    });
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

/**
 * Middleware para monitoramento de performance
 */
export const monitoramentoPerformance = async (req: RequestWithTiming, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function(data) {
    registrarPerformance(req, res);
    return originalSend.call(this, data);
  };

  res.json = function(data) {
    registrarPerformance(req, res);
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Função para registrar métricas de performance
 */
async function registrarPerformance(req: RequestWithTiming, res: Response) {
  if (!req.sistemaRobusto || !req.startTime) {
    return;
  }

  try {
    const tempoExecucao = Date.now() - req.startTime;
    const modulo = determinarModulo(req.path);
    const tabela = extrairTabelaDaRota(req.path);

    // Só registrar se demorou mais que o limite configurado ou se é uma operação crítica
    const limiteMs = 100; // Pode ser configurável
    const operationKey = `${req.method} ${req.path}`;
    
    if (tempoExecucao > limiteMs || CRITICAL_OPERATIONS.includes(operationKey)) {
      await sistemaRobusto.registrarPerformance({
        modulo,
        operacao: `${req.method}_${tabela.toUpperCase()}`,
        tabela,
        tempo_execucao_ms: tempoExecucao,
        usuario_id: (req as any).user?.id,
        sessao_id: (req as any).sessionID
      });
    }
  } catch (error) {
    console.error('Erro ao registrar performance:', error);
  }
}

/**
 * Middleware para limpeza de recursos
 */
export const limpezaRecursos = (req: RequestWithTiming, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    if (req.sistemaRobusto) {
      req.sistemaRobusto.fechar();
    }
  });
  next();
};

/**
 * Middleware para verificação de consistência em operações críticas
 */
export const verificacaoConsistencia = async (req: RequestWithTiming, res: Response, next: NextFunction) => {
  const operationKey = `${req.method} ${req.path}`;
  
  // Verificar consistência apenas em operações críticas
  if (CRITICAL_OPERATIONS.includes(operationKey) && req.sistemaRobusto) {
    try {
      const modulo = determinarModulo(req.path);
      const tabela = extrairTabelaDaRota(req.path);
      
      // Executar verificações específicas baseadas na operação
      if (req.path.includes('contratos') && req.method === 'POST') {
        // Verificar se fornecedor existe e está ativo
        // Implementar verificações específicas aqui
      }
      
      if (req.path.includes('pedidos') && req.method === 'POST') {
        // Verificar saldo de contratos
        // Verificar disponibilidade de produtos
        // Implementar verificações específicas aqui
      }
      
    } catch (error) {
      console.error('Erro na verificação de consistência:', error);
    }
  }
  
  next();
};

/**
 * Funções auxiliares
 */
function determinarModulo(path: string): string {
  for (const [route, module] of Object.entries(ROUTE_MODULE_MAP)) {
    if (path.startsWith(route)) {
      return module;
    }
  }
  return 'SISTEMA';
}

function extrairTabelaDaRota(path: string): string {
  const segments = path.split('/').filter(s => s);
  if (segments.length >= 2) {
    return segments[1].replace(/-/g, '_');
  }
  return 'unknown';
}

function mapearOperacao(method: string): 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' {
  switch (method) {
    case 'POST': return 'INSERT';
    case 'PUT':
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'SELECT';
  }
}

function extrairRegistroId(req: RequestWithTiming, responseData: any): number {
  // Tentar extrair ID da URL (ex: /api/usuarios/123)
  const pathSegments = req.path.split('/');
  const lastSegment = pathSegments[pathSegments.length - 1];
  
  if (!isNaN(Number(lastSegment))) {
    return Number(lastSegment);
  }
  
  // Tentar extrair ID da resposta
  if (responseData && typeof responseData === 'object') {
    const parsed = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    if (parsed.id) return parsed.id;
    if (parsed.data && parsed.data.id) return parsed.data.id;
  }
  
  return 0;
}

/**
 * Middleware combinado para facilitar uso
 */
export const sistemaRobustoCompleto = [
  inicializarSistemaRobusto,
  auditoriaAutomatica,
  monitoramentoPerformance,
  verificacaoConsistencia,
  limpezaRecursos
];

export default {
  inicializarSistemaRobusto,
  auditoriaAutomatica,
  monitoramentoPerformance,
  verificacaoConsistencia,
  limpezaRecursos,
  sistemaRobustoCompleto
};