import db from '../../../database';

export interface SistemaRobusto {
  buscarAuditoria(filtros: any): Promise<any[]>;
  buscarPerformance(filtros: any): Promise<any[]>;
  getConfiguracao(chave: string): Promise<any>;
  setConfiguracao(chave: string, valor: any): Promise<boolean>;
}

export class SistemaRobustoImpl implements SistemaRobusto {
  async buscarAuditoria(filtros: any): Promise<any[]> {
    try {
      let query = `
        SELECT 
          a.id,
          a.tabela,
          a.operacao,
          a.registro_id,
          a.usuario_id,
          u.nome as usuario_nome,
          a.dados_anteriores,
          a.dados_novos,
          a.created_at
        FROM auditoria a
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        WHERE 1=1
      `;
      
      const values = [];
      let paramCount = 1;

      if (filtros.tabela) {
        query += ` AND a.tabela = $${paramCount}`;
        values.push(filtros.tabela);
        paramCount++;
      }

      if (filtros.operacao) {
        query += ` AND a.operacao = $${paramCount}`;
        values.push(filtros.operacao);
        paramCount++;
      }

      if (filtros.registro_id) {
        query += ` AND a.registro_id = $${paramCount}`;
        values.push(filtros.registro_id);
        paramCount++;
      }

      if (filtros.usuario_id) {
        query += ` AND a.usuario_id = $${paramCount}`;
        values.push(filtros.usuario_id);
        paramCount++;
      }

      if (filtros.data_inicio) {
        query += ` AND a.created_at >= $${paramCount}`;
        values.push(filtros.data_inicio);
        paramCount++;
      }

      if (filtros.data_fim) {
        query += ` AND a.created_at <= $${paramCount}`;
        values.push(filtros.data_fim);
        paramCount++;
      }

      query += ` ORDER BY a.created_at DESC`;

      if (filtros.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(filtros.limit);
        paramCount++;
      }

      if (filtros.offset) {
        query += ` OFFSET $${paramCount}`;
        values.push(filtros.offset);
        paramCount++;
      }

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar auditoria:', error);
      throw new Error('Erro ao buscar auditoria');
    }
  }

  async buscarPerformance(filtros: any): Promise<any[]> {
    try {
      let query = `
        SELECT 
          p.id,
          p.operacao,
          p.tabela,
          p.tempo_ms,
          p.status,
          p.usuario_id,
          u.nome as usuario_nome,
          p.detalhes,
          p.created_at
        FROM performance_logs p
        LEFT JOIN usuarios u ON p.usuario_id = u.id
        WHERE 1=1
      `;
      
      const values = [];
      let paramCount = 1;

      if (filtros.operacao) {
        query += ` AND p.operacao = $${paramCount}`;
        values.push(filtros.operacao);
        paramCount++;
      }

      if (filtros.tabela) {
        query += ` AND p.tabela = $${paramCount}`;
        values.push(filtros.tabela);
        paramCount++;
      }

      if (filtros.tempo_minimo_ms) {
        query += ` AND p.tempo_ms >= $${paramCount}`;
        values.push(filtros.tempo_minimo_ms);
        paramCount++;
      }

      if (filtros.status) {
        query += ` AND p.status = $${paramCount}`;
        values.push(filtros.status);
        paramCount++;
      }

      if (filtros.data_inicio) {
        query += ` AND p.created_at >= $${paramCount}`;
        values.push(filtros.data_inicio);
        paramCount++;
      }

      if (filtros.data_fim) {
        query += ` AND p.created_at <= $${paramCount}`;
        values.push(filtros.data_fim);
        paramCount++;
      }

      query += ` ORDER BY p.created_at DESC`;

      if (filtros.limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(filtros.limit);
        paramCount++;
      }

      if (filtros.offset) {
        query += ` OFFSET $${paramCount}`;
        values.push(filtros.offset);
        paramCount++;
      }

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar performance:', error);
      throw new Error('Erro ao buscar performance');
    }
  }

  async getConfiguracao(chave: string): Promise<any> {
    try {
      const result = await db.query(
        'SELECT valor FROM configuracoes WHERE chave = $1',
        [chave]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].valor;
    } catch (error) {
      console.error('Erro ao obter configuração:', error);
      throw new Error('Erro ao obter configuração');
    }
  }

  async setConfiguracao(chave: string, valor: any): Promise<boolean> {
    try {
      const result = await db.query(
        `INSERT INTO configuracoes (chave, valor, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (chave)
         DO UPDATE SET valor = $2, updated_at = NOW()
         RETURNING *`,
        [chave, JSON.stringify(valor)]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Erro ao definir configuração:', error);
      throw new Error('Erro ao definir configuração');
    }
  }

  async validarIntegridade(): Promise<any> {
    try {
      // Validação básica de integridade do banco
      const tabelas = ['usuarios', 'produtos', 'estoque_lotes', 'estoque_movimentacoes'];
      const resultados = [];

      for (const tabela of tabelas) {
        try {
          const result = await db.query(`SELECT COUNT(*) as total FROM ${tabela}`);
          resultados.push({
            tabela,
            status: 'ok',
            registros: result.rows[0].total
          });
        } catch (error) {
          resultados.push({
            tabela,
            status: 'erro',
            erro: error.message
          });
        }
      }

      return {
        status: 'validado',
        tabelas: resultados,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Erro ao validar integridade:', error);
      throw new Error('Erro ao validar integridade');
    }
  }

  async limparLogsAntigos(): Promise<any> {
    try {
      // Limpar logs de performance e auditoria com mais de 90 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 90);

      const resultPerformance = await db.query(
        'DELETE FROM performance_logs WHERE created_at < $1 RETURNING COUNT(*) as removidos',
        [dataLimite]
      );

      const resultAuditoria = await db.query(
        'DELETE FROM auditoria WHERE created_at < $1 RETURNING COUNT(*) as removidos',
        [dataLimite]
      );

      return {
        logs_performance_removidos: resultPerformance.rows[0]?.removidos || 0,
        logs_auditoria_removidos: resultAuditoria.rows[0]?.removidos || 0,
        data_limite: dataLimite
      };
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error);
      throw new Error('Erro ao limpar logs antigos');
    }
  }

  async criarBackup(caminho_destino?: string): Promise<boolean> {
    try {
      // Implementação simplificada - em produção usaria pg_dump ou similar
      console.log('Backup solicitado para:', caminho_destino || 'backup_default');
      
      // Criar registro de backup
      const result = await db.query(
        `INSERT INTO backup_logs (tipo, status, caminho_destino, created_at)
         VALUES ($1, $2, $3, NOW()) RETURNING id`,
        ['manual', 'iniciado', caminho_destino || 'backup_default.sql']
      );

      return true;
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      throw new Error('Erro ao criar backup');
    }
  }

  async otimizarBanco(): Promise<boolean> {
    try {
      // Executar VACUUM e ANALYZE em tabelas principais
      const tabelas = ['usuarios', 'produtos', 'estoque_lotes', 'estoque_movimentacoes', 'auditoria', 'performance_logs'];
      
      for (const tabela of tabelas) {
        try {
          await db.query(`ANALYZE ${tabela}`);
          console.log(`Tabela ${tabela} otimizada`);
        } catch (error) {
          console.warn(`Erro ao otimizar tabela ${tabela}:`, error.message);
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao otimizar banco:', error);
      throw new Error('Erro ao otimizar banco');
    }
  }
}