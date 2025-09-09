import { Request, Response, NextFunction } from 'express';
import { SistemaRobusto } from '../utils/sistemaRobusto';
import SistemaRobustoManager from '../utils/sistemaRobustoManager';
import { Pool } from 'pg';

// Criar instância do sistema robusto manager
const sistemaRobusto = new SistemaRobustoManager();

// Estender interface Request para incluir dados de auditoria
declare global {
  namespace Express {
    interface Request {
      auditoria?: {
        usuario_id?: number;
        usuario_nome?: string;
        ip_usuario?: string;
        user_agent?: string;
        sessao_id?: string;
        timestamp_inicio?: number;
      };
    }
  }
}

/**
 * Middleware para capturar informações de auditoria
 */
export function capturarAuditoria(req: Request, res: Response, next: NextFunction) {
  // Capturar informações do usuário (assumindo que existe middleware de autenticação)
  const usuario = (req as any).user;
  
  req.auditoria = {
    usuario_id: usuario?.id,
    usuario_nome: usuario?.nome,
    ip_usuario: req.ip || req.connection.remoteAddress,
    user_agent: req.get('User-Agent'),
    sessao_id: (req as any).sessionID || req.get('X-Session-ID'),
    timestamp_inicio: Date.now()
  };

  next();
}

/**
 * Middleware para monitorar performance de requests
 */
export function monitorarPerformance(req: Request, res: Response, next: NextFunction) {
  const inicio = Date.now();
  const operacao = `${req.method} ${req.route?.path || req.path}`;

  // Interceptar o final da resposta
  const originalSend = res.send;
  res.send = function(data) {
    const fim = Date.now();
    const tempo_execucao = fim - inicio;

    // Registrar performance (não bloquear a resposta)
    sistemaRobusto.registrarPerformance({
      modulo: 'HTTP',
      operacao,
      tabela: null,
      tempo_execucao_ms: tempo_execucao,
      registros_afetados: 0,
      query_sql: undefined,
      usuario_id: req.auditoria?.usuario_id,
      sessao_id: req.auditoria?.sessao_id
    }).catch(err => {
      console.warn('⚠️ Erro ao registrar performance do request:', err);
    });

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware para registrar automaticamente operações de auditoria
 */
export function registrarOperacao(
  tabela: string,
  operacao: 'INSERT' | 'UPDATE' | 'DELETE'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Interceptar resposta para capturar dados da operação
    const originalJson = res.json;
    res.json = function(data: any) {
      // Registrar auditoria se a operação foi bem-sucedida
      if (data.success && data.data) {
        const registro_id = data.data.id || data.data[0]?.id;
        
        if (registro_id) {
          sistemaRobusto.registrarAuditoria({
            modulo: 'HTTP',
            tabela,
            operacao,
            registro_id,
            dados_anteriores: operacao === 'UPDATE' ? req.body.dados_anteriores : undefined,
            dados_novos: operacao !== 'DELETE' ? data.data : undefined,
            usuario_id: req.auditoria?.usuario_id,
            usuario_nome: req.auditoria?.usuario_nome,
            ip_usuario: req.auditoria?.ip_usuario,
            contexto_operacao: `${req.method} ${req.path}`
          }).catch(err => {
            console.warn('⚠️ Erro ao registrar auditoria:', err);
          });
        }
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Middleware para validar integridade antes de operações críticas
 */
export function validarIntegridade(req: Request, res: Response, next: NextFunction) {
  // Executar validação assíncrona (não bloquear request)
  sistemaRobusto.validarIntegridade()
    .then(resultado => {
      if (resultado && resultado.length > 0) {
        console.warn('⚠️ Problemas de integridade detectados:', resultado);
        
        // Adicionar header com aviso
        res.set('X-Integridade-Warning', 'Problemas detectados');
      }
    })
    .catch(err => {
      console.warn('⚠️ Erro ao validar integridade:', err);
    });

  next();
}

/**
 * Middleware para executar limpeza automática de logs
 */
export function limpezaAutomatica(req: Request, res: Response, next: NextFunction) {
  // Executar limpeza ocasionalmente (1% de chance por request)
  if (Math.random() < 0.01) {
    sistemaRobusto.limparLogsAntigos()
      .then(resultado => {
          if (resultado.auditoria > 0 || resultado.performance > 0) {
            console.log(`🧹 Limpeza automática: ${resultado.auditoria} auditoria, ${resultado.performance} performance`);
          }
        })
      .catch(err => {
        console.warn('⚠️ Erro na limpeza automática:', err);
      });
  }

  next();
}

/**
 * Middleware para backup automático
 */
export function backupAutomatico(req: Request, res: Response, next: NextFunction) {
  // Verificar se backup automático está habilitado
  sistemaRobusto.getConfiguracaoBoolean('sistema.backup_automatico')
    .then(habilitado => {
      if (!habilitado) return;

      // Verificar intervalo de backup
      return sistemaRobusto.getConfiguracaoNumber('sistema.backup_intervalo_horas', 24);
    })
    .then(intervalo => {
      if (!intervalo) return;

      // Executar backup ocasionalmente baseado no intervalo
      const probabilidade = 1 / (intervalo * 60); // Aproximadamente uma vez por intervalo
      
      if (Math.random() < probabilidade) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const caminhoBackup = `backup-automatico-${timestamp}.db`;
        
        sistemaRobusto.criarBackup(caminhoBackup)
          .then(sucesso => {
            if (sucesso) {
              console.log(`💾 Backup automático criado: ${caminhoBackup}`);
            }
          })
          .catch(err => {
            console.warn('⚠️ Erro no backup automático:', err);
          });
      }
    })
    .catch(err => {
      console.warn('⚠️ Erro ao verificar configuração de backup:', err);
    });

  next();
}

/**
 * Middleware combinado para aplicar todas as funcionalidades do sistema robusto
 */
export function sistemaRobustoCompleto(req: Request, res: Response, next: NextFunction) {
  // Aplicar todos os middlewares em sequência
  capturarAuditoria(req, res, (err) => {
    if (err) return next(err);
    
    monitorarPerformance(req, res, (err) => {
      if (err) return next(err);
      
      validarIntegridade(req, res, (err) => {
        if (err) return next(err);
        
        limpezaAutomatica(req, res, (err) => {
          if (err) return next(err);
          
          backupAutomatico(req, res, next);
        });
      });
    });
  });
}

/**
 * Middleware específico para operações de pedidos
 */
export const pedidosAuditoria = {
  criar: registrarOperacao('pedidos', 'INSERT'),
      atualizar: registrarOperacao('pedidos', 'UPDATE'),
      excluir: registrarOperacao('pedidos', 'DELETE')
};

/**
 * Middleware específico para operações de recebimentos - REMOVIDO
 * Auditoria de recebimentos foi removida conforme solicitado
 */
// export const recebimentosAuditoria = {
//   criar: registrarOperacao('recebimentos_modernos', 'INSERT'),
//   atualizar: registrarOperacao('recebimentos_modernos', 'UPDATE'),
//   excluir: registrarOperacao('recebimentos_modernos', 'DELETE')
// };

/**
 * Middleware específico para operações de produtos
 */
export const produtosAuditoria = {
  criar: registrarOperacao('produtos', 'INSERT'),
  atualizar: registrarOperacao('produtos', 'UPDATE'),
  excluir: registrarOperacao('produtos', 'DELETE')
};

/**
 * Middleware específico para operações de fornecedores
 */
export const fornecedoresAuditoria = {
  criar: registrarOperacao('fornecedores', 'INSERT'),
  atualizar: registrarOperacao('fornecedores', 'UPDATE'),
  excluir: registrarOperacao('fornecedores', 'DELETE')
};

/**
 * Middleware específico para operações de usuários
 */
export const usuariosAuditoria = {
  criar: registrarOperacao('usuarios', 'INSERT'),
  atualizar: registrarOperacao('usuarios', 'UPDATE'),
  excluir: registrarOperacao('usuarios', 'DELETE')
};

/**
 * Função helper para executar operação com monitoramento completo
 */
export async function executarOperacaoMonitorada<T>(
  req: Request,
  operacao: string,
  tabela: string,
  funcao: () => Promise<T>
): Promise<T> {
  const nomeOperacao = `${operacao}_${tabela}`;
  return sistemaRobusto.executarComMonitoramento(funcao, nomeOperacao);
}