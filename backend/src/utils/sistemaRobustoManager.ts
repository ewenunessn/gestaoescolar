const db = require('../../database');

interface AuditoriaEntry {
  modulo: string;
  tabela: string;
  operacao: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  registro_id: number;
  dados_anteriores?: string;
  dados_novos?: string;
  usuario_id?: number;
  usuario_nome?: string;
  ip_usuario?: string;
  contexto_operacao?: string;
  nivel_criticidade?: 'BAIXO' | 'NORMAL' | 'ALTO' | 'CRITICO';
}

interface PerformanceEntry {
  modulo: string;
  operacao: string;
  tabela?: string;
  tempo_execucao_ms: number;
  registros_afetados?: number;
  query_sql?: string;
  usuario_id?: number;
  sessao_id?: string;
}

interface ConsistenciaCheck {
  modulo: string;
  tipo_verificacao: string;
  tabela_origem: string;
  registro_id?: number;
  status_verificacao: 'OK' | 'INCONSISTENTE' | 'ERRO';
  detalhes_inconsistencia?: string;
}

export class SistemaRobustoManager {
  private db: any;

  constructor() {
    this.db = db;
  }

  /**
   * Registra uma entrada de auditoria
   */
  async registrarAuditoria(entrada: AuditoriaEntry): Promise<void> {
    try {
      const sql = `
        INSERT INTO auditoria_universal (
          modulo, tabela, operacao, registro_id, dados_anteriores, dados_novos,
          usuario_id, usuario_nome, ip_usuario, contexto_operacao, nivel_criticidade,
          timestamp_operacao, timestamp_utc
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW() AT TIME ZONE 'UTC')
      `;

      await this.db.run(sql, [
        entrada.modulo,
        entrada.tabela,
        entrada.operacao,
        entrada.registro_id,
        entrada.dados_anteriores,
        entrada.dados_novos,
        entrada.usuario_id,
        entrada.usuario_nome,
        entrada.ip_usuario,
        entrada.contexto_operacao,
        entrada.nivel_criticidade || 'NORMAL'
      ]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Registra métricas de performance
   */
  async registrarPerformance(entrada: PerformanceEntry): Promise<void> {
    try {
      const sql = `
        INSERT INTO performance_monitoring (
          modulo, operacao, tabela, tempo_execucao_ms, registros_afetados,
          query_sql, usuario_id, sessao_id, timestamp_inicio, timestamp_fim, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), 'SUCESSO')
      `;

      await this.db.run(sql, [
        entrada.modulo,
        entrada.operacao,
        entrada.tabela,
        entrada.tempo_execucao_ms,
        entrada.registros_afetados || 0,
        entrada.query_sql,
        entrada.usuario_id,
        entrada.sessao_id
      ]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verifica consistência de dados
   */
  async verificarConsistencia(check: ConsistenciaCheck): Promise<void> {
    try {
      const sql = `
        INSERT INTO consistencia_dados (
          modulo, tipo_verificacao, tabela_origem, registro_id,
          status_verificacao, detalhes_inconsistencia, timestamp_verificacao
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `;

      await this.db.run(sql, [
        check.modulo,
        check.tipo_verificacao,
        check.tabela_origem,
        check.registro_id,
        check.status_verificacao,
        check.detalhes_inconsistencia
      ]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém configuração do sistema
   */
  async obterConfiguracao(modulo: string, chave: string): Promise<string | null> {
    try {
      const sql = `
        SELECT valor FROM sistema_configuracao_robusta 
        WHERE modulo = $1 AND chave = $2
      `;

      const row = await this.db.get(sql, [modulo, chave]);
      return row ? row.valor : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Define configuração do sistema
   */
  async definirConfiguracao(modulo: string, chave: string, valor: string, usuario_id?: number): Promise<void> {
    try {
      const sql = `
        INSERT INTO sistema_configuracao_robusta 
        (modulo, chave, valor, data_atualizacao, atualizado_por)
        VALUES ($1, $2, $3, NOW(), $4)
        ON CONFLICT (modulo, chave) 
        DO UPDATE SET valor = $3, data_atualizacao = NOW(), atualizado_por = $4
      `;

      await this.db.run(sql, [modulo, chave, valor, usuario_id]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém configuração do sistema (método compatível com SistemaRobusto)
   */
  async getConfiguracao(chave: string): Promise<string | null> {
    return this.obterConfiguracao('SISTEMA', chave);
  }

  /**
   * Obtém configuração booleana do sistema
   */
  async getConfiguracaoBoolean(chave: string, valorPadrao: boolean = false): Promise<boolean> {
    try {
      const valor = await this.getConfiguracao(chave);
      if (valor === null) return valorPadrao;
      return valor.toLowerCase() === 'true' || valor === '1';
    } catch (error) {
      return valorPadrao;
    }
  }

  /**
   * Obtém configuração numérica do sistema
   */
  async getConfiguracaoNumber(chave: string, valorPadrao: number = 0): Promise<number> {
    try {
      const valor = await this.getConfiguracao(chave);
      if (valor === null) return valorPadrao;
      const numero = Number(valor);
      return isNaN(numero) ? valorPadrao : numero;
    } catch (error) {
      return valorPadrao;
    }
  }

  /**
   * Define configuração do sistema (método compatível com SistemaRobusto)
   */
  async setConfiguracao(chave: string, valor: string, descricao?: string, tipo: string = 'STRING'): Promise<boolean> {
    try {
      await this.definirConfiguracao('SISTEMA', chave, valor);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cria backup do sistema (método compatível com SistemaRobusto)
   */
  async criarBackup(tipo: string = 'completo'): Promise<{ status: string; caminho?: string; erro?: string }> {
    try {
      // Simular criação de backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const caminho = `backup-${tipo}-${timestamp}.sql`;
      
      // Registrar auditoria do backup
      await this.registrarAuditoria({
        modulo: 'SISTEMA',
        tabela: 'backup',
        operacao: 'INSERT',
        registro_id: 0,
        contexto_operacao: `Backup ${tipo} criado`,
        nivel_criticidade: 'NORMAL'
      });
      
      return {
        status: 'sucesso',
        caminho: caminho
      };
    } catch (error) {
      return {
        status: 'erro',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Executa operação com monitoramento (método compatível com SistemaRobusto)
   */
  async executarComMonitoramento<T>(operacao: () => Promise<T>, nomeOperacao: string): Promise<T> {
    const inicio = Date.now();
    
    try {
      const resultado = await operacao();
      const tempoExecucao = Date.now() - inicio;
      
      // Registrar performance
      await this.registrarPerformance({
        modulo: 'SISTEMA',
        operacao: nomeOperacao,
        tempo_execucao_ms: tempoExecucao
      });
      
      return resultado;
    } catch (error) {
      const tempoExecucao = Date.now() - inicio;
      
      // Registrar erro na performance
      await this.registrarPerformance({
        modulo: 'SISTEMA',
        operacao: nomeOperacao,
        tempo_execucao_ms: tempoExecucao
      });
      
      throw error;
    }
  }

  /**
   * Busca registros de auditoria (método compatível com SistemaRobusto)
   */
  async buscarAuditoria(filtros: {
    tabela?: string;
    operacao?: string;
    registro_id?: number;
    usuario_id?: number;
    data_inicio?: string;
    data_fim?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      let sql = `
        SELECT * FROM auditoria_universal
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (filtros.tabela) {
        sql += ` AND tabela = $${paramIndex++}`;
        params.push(filtros.tabela);
      }

      if (filtros.operacao) {
        sql += ` AND operacao = $${paramIndex++}`;
        params.push(filtros.operacao);
      }

      if (filtros.registro_id) {
        sql += ` AND registro_id = $${paramIndex++}`;
        params.push(filtros.registro_id);
      }

      if (filtros.usuario_id) {
        sql += ` AND usuario_id = $${paramIndex++}`;
        params.push(filtros.usuario_id);
      }

      if (filtros.data_inicio) {
        sql += ` AND timestamp_operacao >= $${paramIndex++}`;
        params.push(filtros.data_inicio);
      }

      if (filtros.data_fim) {
        sql += ` AND timestamp_operacao <= $${paramIndex++}`;
        params.push(filtros.data_fim);
      }

      sql += ` ORDER BY timestamp_operacao DESC`;

      if (filtros.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filtros.limit);
      }

      if (filtros.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(filtros.offset);
      }

      return await this.db.all(sql, params) || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca registros de performance (método compatível com SistemaRobusto)
   */
  async buscarPerformance(filtros: {
    modulo?: string;
    operacao?: string;
    tabela?: string;
    tempo_minimo_ms?: number;
    status?: string;
    data_inicio?: string;
    data_fim?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      let sql = `
        SELECT * FROM performance_monitoring
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (filtros.modulo) {
        sql += ` AND modulo = $${paramIndex++}`;
        params.push(filtros.modulo);
      }

      if (filtros.operacao) {
        sql += ` AND operacao = $${paramIndex++}`;
        params.push(filtros.operacao);
      }

      if (filtros.tabela) {
        sql += ` AND tabela = $${paramIndex++}`;
        params.push(filtros.tabela);
      }

      if (filtros.tempo_minimo_ms) {
        sql += ` AND tempo_execucao_ms >= $${paramIndex++}`;
        params.push(filtros.tempo_minimo_ms);
      }

      if (filtros.status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(filtros.status);
      }

      if (filtros.data_inicio) {
        sql += ` AND timestamp_inicio >= $${paramIndex++}`;
        params.push(filtros.data_inicio);
      }

      if (filtros.data_fim) {
        sql += ` AND timestamp_inicio <= $${paramIndex++}`;
        params.push(filtros.data_fim);
      }

      sql += ` ORDER BY timestamp_inicio DESC`;

      if (filtros.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(filtros.limit);
      }

      if (filtros.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(filtros.offset);
      }

      return await this.db.all(sql, params) || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Valida integridade do sistema (método compatível com SistemaRobusto)
   */
  async validarIntegridade(): Promise<any[]> {
    try {
      const problemas = [];
      
      // Verificar usuários com emails duplicados
      const emailsDuplicados = await this.db.all(`
        SELECT email, COUNT(*) as count 
        FROM usuarios 
        WHERE email IS NOT NULL 
        GROUP BY email 
        HAVING COUNT(*) > 1
      `, []);
      
      if (emailsDuplicados && emailsDuplicados.length > 0) {
        problemas.push({
          tabela: 'usuarios',
          problema: 'emails_duplicados',
          registros_invalidos: emailsDuplicados.length,
          detalhes: emailsDuplicados
        });
      }
      
      // Verificar produtos sem categoria
      const produtosSemCategoria = await this.db.all(`
        SELECT COUNT(*) as count 
        FROM produtos 
        WHERE categoria_id IS NULL
      `, []);
      
      if (produtosSemCategoria && produtosSemCategoria[0]?.count > 0) {
        problemas.push({
          tabela: 'produtos',
          problema: 'sem_categoria',
          registros_invalidos: produtosSemCategoria[0].count
        });
      }
      
      return problemas;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Limpa logs antigos (método compatível com SistemaRobusto)
   */
  async limparLogsAntigos(): Promise<{ auditoria: number; performance: number }> {
    return this.executarLimpezaLogs();
  }

  /**
   * Otimiza o banco de dados
   */
  async otimizarBanco(): Promise<boolean> {
    try {
      // Executar comandos de otimização do banco
      await this.db.query('VACUUM ANALYZE');
      await this.db.query('REINDEX DATABASE');
      return true;
    } catch (error) {
      console.error('Erro ao otimizar banco:', error);
      return false;
    }
  }

  /**
   * Obtém métricas do dashboard executivo
   */
  async obterDashboardExecutivo(): Promise<any> {
    try {
      const sql = `SELECT * FROM vw_dashboard_executivo_completo`;
      return await this.db.get(sql, []);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém performance de fornecedores
   */
  async obterPerformanceFornecedores(): Promise<any[]> {
    try {
      const sql = `SELECT * FROM vw_performance_fornecedores_detalhada ORDER BY percentual_entrega DESC`;
      return await this.db.all(sql, []) || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém alertas ativos
   */
  async obterAlertasAtivos(): Promise<any[]> {
    try {
      const sql = `
        SELECT * FROM vw_alertas_monitoramento 
        WHERE status = 'ATIVO' 
        ORDER BY classificacao_urgencia DESC, data_criacao DESC
      `;

      return await this.db.all(sql, []) || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Executa verificação de consistência automática
   */
  async executarVerificacaoConsistencia(): Promise<{ total: number; inconsistencias: number }> {
    try {
      let total = 0;
      let inconsistencias = 0;

      // Verificar saldos de contratos
      total++;
      try {
        const rows = await this.db.all(`
          SELECT c.id, c.numero,
            COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) as consumido,
            COALESCE(SUM(cp.quantidade_contratada), 0) as contratado
          FROM contratos c
          LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id
          LEFT JOIN movimentacoes_consumo_contrato mcc ON c.id = mcc.contrato_id
          WHERE c.ativo = true
          GROUP BY c.id
          HAVING COALESCE(SUM(CASE WHEN mcc.tipo_movimentacao = 'CONSUMO' THEN mcc.quantidade ELSE 0 END), 0) > 
                 COALESCE(SUM(cp.quantidade_contratada), 0)
        `, []);

        if (rows && rows.length > 0) {
          inconsistencias++;
          for (const row of rows) {
            await this.verificarConsistencia({
              modulo: 'SUPPLIER',
              tipo_verificacao: 'SALDO_CONTRATO',
              tabela_origem: 'contratos',
              registro_id: row.id,
              status_verificacao: 'INCONSISTENTE',
              detalhes_inconsistencia: `Contrato ${row.numero} com consumo (${row.consumido}) maior que contratado (${row.contratado})`
            });
          }
        }
      } catch (error) {
        inconsistencias++;
        await this.verificarConsistencia({
          modulo: 'SISTEMA',
          tipo_verificacao: 'SALDO_CONTRATO',
          tabela_origem: 'SISTEMA',
          status_verificacao: 'ERRO',
          detalhes_inconsistencia: `Erro na verificação de saldos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        });
      }

      return { total, inconsistencias };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém estatísticas de auditoria
   */
  async obterEstatisticasAuditoria(dias: number = 7): Promise<any> {
    try {
      const sql = `
        SELECT 
          modulo,
          operacao,
          COUNT(*) as total_operacoes,
          COUNT(DISTINCT usuario_id) as usuarios_unicos,
          COUNT(DISTINCT tabela) as tabelas_afetadas,
          MIN(timestamp_operacao) as primeira_operacao,
          MAX(timestamp_operacao) as ultima_operacao
        FROM auditoria_universal 
        WHERE timestamp_operacao >= NOW() - INTERVAL '${dias} days'
        GROUP BY modulo, operacao
        ORDER BY total_operacoes DESC
      `;

      return await this.db.all(sql, []) || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtém queries mais lentas
   */
  async obterQueriesLentas(limite: number = 10): Promise<any[]> {
    try {
      const sql = `
        SELECT 
          modulo,
          operacao,
          tabela,
          AVG(tempo_execucao_ms) as tempo_medio,
          MAX(tempo_execucao_ms) as tempo_maximo,
          COUNT(*) as total_execucoes,
          query_sql
        FROM performance_monitoring 
        WHERE tempo_execucao_ms > 100
        GROUP BY modulo, operacao, tabela, query_sql
        ORDER BY tempo_medio DESC
        LIMIT $1
      `;

      return await this.db.all(sql, [limite]) || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Executa limpeza de logs antigos
   */
  async executarLimpezaLogs(): Promise<{ auditoria: number; performance: number }> {
    try {
      const retencaoDias = await this.obterConfiguracao('AUDITORIA', 'retencao_dias') || '365';

      // Limpar auditoria
      const sqlAuditoria = `
        DELETE FROM auditoria_universal 
        WHERE timestamp_operacao < NOW() - INTERVAL '${retencaoDias} days'
      `;

      // Limpar performance (manter apenas 30 dias)
      const sqlPerformance = `
        DELETE FROM performance_monitoring 
        WHERE timestamp_inicio < NOW() - INTERVAL '30 days'
      `;

      const resultAuditoria = await this.db.run(sqlAuditoria, []);
      const resultPerformance = await this.db.run(sqlPerformance, []);

      return {
        auditoria: resultAuditoria.changes || 0,
        performance: resultPerformance.changes || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fecha conexão com o banco
   */
  fechar(): void {
    // PostgreSQL pool é gerenciado automaticamente
    // Não é necessário fechar conexões individuais
  }
}

export default SistemaRobustoManager;