import { Request, Response } from 'express';
import { Pool } from 'pg';
import { SistemaRobusto } from '../utils/sistemaRobusto';
import SistemaRobustoManager from '../utils/sistemaRobustoManager';

// Criar instância do sistema robusto manager
const sistemaRobusto = new SistemaRobustoManager();

export class SistemaRobustoController {
  
  // ==================== AUDITORIA ====================

  /**
   * Busca registros de auditoria
   */
  public async buscarAuditoria(req: Request, res: Response) {
    try {
      const {
        tabela,
        operacao,
        registro_id,
        usuario_id,
        data_inicio,
        data_fim,
        page = 1,
        limit = 50
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const registros = await sistemaRobusto.buscarAuditoria({
        tabela: tabela as string,
        operacao: operacao as string,
        registro_id: registro_id ? Number(registro_id) : undefined,
        usuario_id: usuario_id ? Number(usuario_id) : undefined,
        data_inicio: data_inicio as string,
        data_fim: data_fim as string,
        limit: Number(limit),
        offset
      });

      res.json({
        success: true,
        data: registros,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: registros.length
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar auditoria:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca auditoria de um registro específico
   */
  public async buscarAuditoriaRegistro(req: Request, res: Response) {
    try {
      const { tabela, registro_id } = req.params;

      const registros = await sistemaRobusto.buscarAuditoria({
        tabela,
        registro_id: Number(registro_id),
        limit: 100
      });

      res.json({
        success: true,
        data: registros
      });
    } catch (error) {
      console.error('❌ Erro ao buscar auditoria do registro:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // ==================== PERFORMANCE ====================

  /**
   * Busca logs de performance
   */
  public async buscarPerformance(req: Request, res: Response) {
    try {
      const {
        operacao,
        tabela,
        tempo_minimo_ms,
        status,
        data_inicio,
        data_fim,
        page = 1,
        limit = 50
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const logs = await sistemaRobusto.buscarPerformance({
        operacao: operacao as string,
        tabela: tabela as string,
        tempo_minimo_ms: tempo_minimo_ms ? Number(tempo_minimo_ms) : undefined,
        status: status as string,
        data_inicio: data_inicio as string,
        data_fim: data_fim as string,
        limit: Number(limit),
        offset
      });

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: logs.length
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar performance:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca estatísticas de performance
   */
  public async estatisticasPerformance(req: Request, res: Response) {
    try {
      const { data_inicio, data_fim } = req.query;

      // Buscar queries mais lentas
      const queriesLentas = await sistemaRobusto.buscarPerformance({
        tempo_minimo_ms: 1000,
        data_inicio: data_inicio as string,
        data_fim: data_fim as string,
        limit: 10
      });

      // Buscar operações com mais erros
      const operacoesComErros = await sistemaRobusto.buscarPerformance({
        status: 'ERRO',
        data_inicio: data_inicio as string,
        data_fim: data_fim as string,
        limit: 10
      });

      res.json({
        success: true,
        data: {
          queries_lentas: queriesLentas,
          operacoes_com_erros: operacoesComErros,
          resumo: {
            total_queries_lentas: queriesLentas.length,
            total_operacoes_com_erros: operacoesComErros.length
          }
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas de performance:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // ==================== CONFIGURAÇÃO ====================

  /**
   * Busca configuração do sistema
   */
  public async getConfiguracao(req: Request, res: Response) {
    try {
      const { chave } = req.params;

      const valor = await sistemaRobusto.getConfiguracao(chave);

      if (valor === null) {
        return res.status(404).json({
          success: false,
          message: 'Configuração não encontrada'
        });
      }

      res.json({
        success: true,
        data: {
          chave,
          valor
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar configuração:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Define configuração do sistema
   */
  public async setConfiguracao(req: Request, res: Response) {
    try {
      const { chave } = req.params;
      const { valor, descricao, tipo = 'STRING' } = req.body;

      if (!valor) {
        return res.status(400).json({
          success: false,
          message: 'Valor é obrigatório'
        });
      }

      const sucesso = await sistemaRobusto.setConfiguracao(chave, valor, descricao, tipo);

      if (!sucesso) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao definir configuração'
        });
      }

      res.json({
        success: true,
        message: 'Configuração definida com sucesso',
        data: {
          chave,
          valor,
          descricao,
          tipo
        }
      });
    } catch (error) {
      console.error('❌ Erro ao definir configuração:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // ==================== INTEGRIDADE ====================

  /**
   * Valida integridade do sistema
   */
  public async validarIntegridade(req: Request, res: Response) {
    try {
      const resultado = await sistemaRobusto.validarIntegridade();

      res.json({
        success: true,
        data: resultado
      });
    } catch (error) {
      console.error('❌ Erro ao validar integridade:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // ==================== MANUTENÇÃO ====================

  /**
   * Limpa logs antigos
   */
  public async limparLogsAntigos(req: Request, res: Response) {
    try {
      const resultado = await sistemaRobusto.limparLogsAntigos();

      res.json({
        success: true,
        message: 'Limpeza concluída com sucesso',
        data: resultado
      });
    } catch (error) {
      console.error('❌ Erro ao limpar logs antigos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Cria backup do banco
   */
  public async criarBackup(req: Request, res: Response) {
    try {
      const { caminho_destino } = req.body;

      const sucesso = await sistemaRobusto.criarBackup(caminho_destino);

      if (!sucesso) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao criar backup'
        });
      }

      res.json({
        success: true,
        message: 'Backup criado com sucesso',
        data: {
          caminho_destino: caminho_destino || 'backup-automatico.db'
        }
      });
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Otimiza o banco de dados
   */
  public async otimizarBanco(req: Request, res: Response) {
    try {
      const sucesso = await sistemaRobusto.otimizarBanco();

      if (!sucesso) {
        return res.status(500).json({
          success: false,
          message: 'Erro ao otimizar banco'
        });
      }

      res.json({
        success: true,
        message: 'Banco otimizado com sucesso'
      });
    } catch (error) {
      console.error('❌ Erro ao otimizar banco:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // ==================== DASHBOARD ROBUSTO COMPLETO ====================

  /**
   * Dashboard executivo completo do sistema robusto
   */
  public async dashboardCompleto(req: Request, res: Response) {
    const manager = new SistemaRobustoManager();
    
    try {
      const dashboard = await manager.obterDashboardExecutivo();
      const performanceFornecedores = await manager.obterPerformanceFornecedores();
      const alertas = await manager.obterAlertasAtivos();
      const estatisticasAuditoria = await manager.obterEstatisticasAuditoria(7);
      const queriesLentas = await manager.obterQueriesLentas(5);
      
      res.json({
        success: true,
        data: {
          dashboard_executivo: dashboard,
          performance_fornecedores: performanceFornecedores.slice(0, 10),
          alertas: {
            total: alertas.length,
            criticos: alertas.filter(a => a.classificacao_urgencia === 'CRITICO').length,
            urgentes: alertas.filter(a => a.classificacao_urgencia === 'URGENTE').length,
            lista: alertas.slice(0, 10)
          },
          auditoria: {
            estatisticas: estatisticasAuditoria.slice(0, 10),
            total_operacoes: estatisticasAuditoria.reduce((sum: number, item: any) => sum + item.total_operacoes, 0)
          },
          performance: {
            queries_lentas: queriesLentas,
            tempo_medio_geral: queriesLentas.reduce((sum: number, item: any) => sum + item.tempo_medio, 0) / queriesLentas.length || 0
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar dashboard completo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      manager.fechar();
    }
  }

  /**
   * Dashboard do sistema robusto (versão original)
   */
  public async dashboard(req: Request, res: Response) {
    try {
      const { data_inicio, data_fim } = req.query;

      // Validar integridade
      const integridade = await sistemaRobusto.validarIntegridade();

      // Buscar queries lentas recentes
      const queriesLentas = await sistemaRobusto.buscarPerformance({
        tempo_minimo_ms: 1000,
        data_inicio: data_inicio as string,
        data_fim: data_fim as string,
        limit: 5
      });

      // Buscar erros recentes
      const errosRecentes = await sistemaRobusto.buscarPerformance({
        status: 'ERRO',
        data_inicio: data_inicio as string,
        data_fim: data_fim as string,
        limit: 5
      });

      // Buscar auditoria recente
      const auditoriaRecente = await sistemaRobusto.buscarAuditoria({
        data_inicio: data_inicio as string,
        data_fim: data_fim as string,
        limit: 10
      });

      // Configurações importantes
      const configuracoes = {
        auditoria_retencao: await sistemaRobusto.getConfiguracao('auditoria.retencao_dias'),
      backup_automatico: await sistemaRobusto.getConfiguracaoBoolean('sistema.backup_automatico'),
      validar_estoque: await sistemaRobusto.getConfiguracaoBoolean('pedido.validar_estoque'),
      auto_finalizar_recebimento: await sistemaRobusto.getConfiguracaoBoolean('recebimento.auto_finalizar')
      };

      res.json({
        success: true,
        data: {
          integridade,
          performance: {
            queries_lentas: queriesLentas,
            erros_recentes: errosRecentes,
            total_queries_lentas: queriesLentas.length,
            total_erros: errosRecentes.length
          },
          auditoria: {
            registros_recentes: auditoriaRecente,
            total_registros: auditoriaRecente.length
          },
          configuracoes,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Erro ao buscar dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // ==================== NOVOS ENDPOINTS ROBUSTOS ====================

  /**
   * Executar verificação de consistência completa
   */
  public async verificarConsistenciaCompleta(req: Request, res: Response) {
    const manager = new SistemaRobustoManager();
    
    try {
      const resultado = await manager.executarVerificacaoConsistencia();
      
      res.json({
        success: true,
        data: {
          verificacao_executada: true,
          total_verificacoes: resultado.total,
          inconsistencias_encontradas: resultado.inconsistencias,
          status: resultado.inconsistencias === 0 ? 'CONSISTENTE' : 'INCONSISTENTE',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Erro na verificação de consistência:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      manager.fechar();
    }
  }

  /**
   * Executar limpeza de logs do sistema robusto
   */
  public async executarLimpezaLogsRobusta(req: Request, res: Response) {
    const manager = new SistemaRobustoManager();
    
    try {
      const resultado = await manager.executarLimpezaLogs();
      
      res.json({
        success: true,
        data: {
          limpeza_executada: true,
          registros_removidos: {
            auditoria: resultado.auditoria,
            performance: resultado.performance,
            total: resultado.auditoria + resultado.performance
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Erro na limpeza de logs:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      manager.fechar();
    }
  }

  /**
   * Obter alertas do sistema robusto
   */
  public async obterAlertasRobustos(req: Request, res: Response) {
    const manager = new SistemaRobustoManager();
    
    try {
      const alertas = await manager.obterAlertasAtivos();
      const prioridade = req.query.prioridade as string;
      
      let alertasFiltrados = alertas;
      if (prioridade) {
        alertasFiltrados = alertas.filter((a: any) => a.prioridade === prioridade);
      }
      
      const resumo = {
        total: alertas.length,
        criticos: alertas.filter((a: any) => a.classificacao_urgencia === 'CRITICO').length,
        urgentes: alertas.filter((a: any) => a.classificacao_urgencia === 'URGENTE').length,
        normais: alertas.filter((a: any) => a.classificacao_urgencia === 'NORMAL').length
      };
      
      res.json({
        success: true,
        data: {
          resumo,
          alertas: alertasFiltrados,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Erro ao obter alertas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      manager.fechar();
    }
  }

  /**
   * Obter configurações do sistema robusto
   */
  public async obterConfiguracaoRobusta(req: Request, res: Response) {
    const manager = new SistemaRobustoManager();
    
    try {
      const { modulo, chave } = req.params;
      
      if (!modulo || !chave) {
        return res.status(400).json({
          success: false,
          message: 'Módulo e chave são obrigatórios'
        });
      }
      
      const valor = await manager.obterConfiguracao(modulo, chave);
      
      if (valor === null) {
        return res.status(404).json({
          success: false,
          message: 'Configuração não encontrada'
        });
      }
      
      res.json({
        success: true,
        data: {
          modulo,
          chave,
          valor,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Erro ao obter configuração:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      manager.fechar();
    }
  }

  /**
   * Definir configuração do sistema robusto
   */
  public async definirConfiguracaoRobusta(req: Request, res: Response) {
    const manager = new SistemaRobustoManager();
    
    try {
      const { modulo, chave, valor } = req.body;
      const usuario_id = (req as any).user?.id;
      
      if (!modulo || !chave || valor === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Módulo, chave e valor são obrigatórios'
        });
      }
      
      await manager.definirConfiguracao(modulo, chave, valor, usuario_id);
      
      res.json({
        success: true,
        data: {
          configuracao_atualizada: true,
          modulo,
          chave,
          valor,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Erro ao definir configuração:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      manager.fechar();
    }
  }

  // ==================== RELATÓRIOS ====================

  /**
   * Relatório de uso do sistema
   */
  public async relatorioUso(req: Request, res: Response) {
    try {
      const { data_inicio, data_fim } = req.query;

      // Buscar operações mais frequentes
      const operacoesFrequentes = await sistemaRobusto.buscarPerformance({
        data_inicio: data_inicio as string,
        data_fim: data_fim as string,
        limit: 100
      });

      // Agrupar por operação
      const agrupamento: { [key: string]: { count: number; tempo_total: number; tempo_medio: number } } = {};

      operacoesFrequentes.forEach(log => {
        if (!agrupamento[log.operacao]) {
          agrupamento[log.operacao] = { count: 0, tempo_total: 0, tempo_medio: 0 };
        }
        agrupamento[log.operacao].count++;
        agrupamento[log.operacao].tempo_total += log.tempo_execucao_ms;
      });

      // Calcular médias
      Object.keys(agrupamento).forEach(operacao => {
        agrupamento[operacao].tempo_medio = agrupamento[operacao].tempo_total / agrupamento[operacao].count;
      });

      // Ordenar por frequência
      const operacoesOrdenadas = Object.entries(agrupamento)
        .map(([operacao, dados]) => ({ operacao, ...dados }))
        .sort((a, b) => b.count - a.count);

      res.json({
        success: true,
        data: {
          periodo: {
            data_inicio: data_inicio || 'Não especificado',
            data_fim: data_fim || 'Não especificado'
          },
          operacoes_frequentes: operacoesOrdenadas.slice(0, 10),
          total_operacoes: operacoesFrequentes.length,
          resumo: {
            operacao_mais_frequente: operacoesOrdenadas[0]?.operacao || 'N/A',
            operacao_mais_lenta: operacoesOrdenadas.sort((a, b) => b.tempo_medio - a.tempo_medio)[0]?.operacao || 'N/A'
          }
        }
      });
    } catch (error) {
      console.error('❌ Erro ao gerar relatório de uso:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}

export const sistemaRobustoController = new SistemaRobustoController();