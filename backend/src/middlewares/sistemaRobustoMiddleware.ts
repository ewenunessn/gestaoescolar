import { Request, Response, NextFunction } from 'express';
import { sistemaRobusto } from '../utils/sistemaRobusto';

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
    sistemaRobusto.registrarPerformance(
      operacao,
      null, // tabela será determinada pelo contexto
      tempo_execucao,
      0, // registros_afetados será determinado pelo contexto
      undefined, // query_sql não disponível no nível HTTP
      {
        method: req.method,
        path: req.path,
        query: req.query,
        body_size: JSON.stringify(req.body || {}).length,
        response_size: typeof data === 'string' ? data.length : JSON.stringify(data).length,
        status_code: res.statusCode
      },
      undefined, // memoria_utilizada
      undefined, // cpu_utilizada
      res.statusCode >= 400 ? 'ERRO' : 'SUCESSO',
      res.statusCode >= 400 ? `HTTP ${res.statusCode}` : undefined
    ).catch(err => {
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
          sistemaRobusto.registrarAuditoria(
            tabela,
            operacao,
            registro_id,
            operacao === 'UPDATE' ? req.body.dados_anteriores : undefined,
            operacao !== 'DELETE' ? data.data : undefined,
            req.auditoria?.usuario_id,
            req.auditoria?.usuario_nome,
            req.auditoria?.ip_usuario,
            req.auditoria?.user_agent,
            req.auditoria?.sessao_id,
            {
              endpoint: req.path,
              method: req.method,
              parametros: req.params,
              query: req.query
            }
          ).catch(err => {
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
      if (!resultado.valido && resultado.problemas.length > 0) {
        console.warn('⚠️ Problemas de integridade detectados:', resultado.problemas);
        
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
        if (resultado.auditoria_removidos > 0 || resultado.performance_removidos > 0) {
          console.log(`🧹 Limpeza automática: ${resultado.auditoria_removidos} auditoria, ${resultado.performance_removidos} performance`);
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
  return sistemaRobusto.executarComMonitoramento(
    operacao,
    tabela,
    funcao,
    {
      usuario_id: req.auditoria?.usuario_id,
      ip_usuario: req.auditoria?.ip_usuario,
      endpoint: req.path,
      method: req.method,
      parametros: req.params,
      query: req.query
    }
  );
}