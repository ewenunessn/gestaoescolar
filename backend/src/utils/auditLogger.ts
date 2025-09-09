import { Pool } from 'pg';

export interface LogAuditoria {
  id?: number;
  usuario_id?: number;
  acao: string;
  tabela: string;
  registro_id?: number;
  dados_anteriores?: any;
  dados_novos?: any;
  ip_address?: string;
  user_agent?: string;
  created_at?: Date;
}

export class AuditLogger {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async log(auditoria: Omit<LogAuditoria, 'id' | 'created_at'>): Promise<LogAuditoria> {
    const query = `
      INSERT INTO logs_auditoria (
        usuario_id, acao, tabela, registro_id, 
        dados_anteriores, dados_novos, ip_address, user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      auditoria.usuario_id,
      auditoria.acao,
      auditoria.tabela,
      auditoria.registro_id,
      JSON.stringify(auditoria.dados_anteriores),
      JSON.stringify(auditoria.dados_novos),
      auditoria.ip_address,
      auditoria.user_agent
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async logCreate(
    usuarioId: number | undefined,
    tabela: string,
    registroId: number,
    dadosNovos: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      usuario_id: usuarioId,
      acao: 'CREATE',
      tabela,
      registro_id: registroId,
      dados_novos: dadosNovos,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logUpdate(
    usuarioId: number | undefined,
    tabela: string,
    registroId: number,
    dadosAnteriores: any,
    dadosNovos: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      usuario_id: usuarioId,
      acao: 'UPDATE',
      tabela,
      registro_id: registroId,
      dados_anteriores: dadosAnteriores,
      dados_novos: dadosNovos,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logDelete(
    usuarioId: number | undefined,
    tabela: string,
    registroId: number,
    dadosAnteriores: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      usuario_id: usuarioId,
      acao: 'DELETE',
      tabela,
      registro_id: registroId,
      dados_anteriores: dadosAnteriores,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logLogin(
    usuarioId: number,
    sucesso: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      usuario_id: usuarioId,
      acao: sucesso ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
      tabela: 'usuarios',
      registro_id: usuarioId,
      dados_novos: { sucesso, timestamp: new Date() },
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async logLogout(
    usuarioId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      usuario_id: usuarioId,
      acao: 'LOGOUT',
      tabela: 'usuarios',
      registro_id: usuarioId,
      dados_novos: { timestamp: new Date() },
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  async buscarLogs(filtros?: {
    usuario_id?: number;
    acao?: string;
    tabela?: string;
    registro_id?: number;
    data_inicio?: Date;
    data_fim?: Date;
    limite?: number;
  }): Promise<LogAuditoria[]> {
    let query = `
      SELECT la.*, u.nome as usuario_nome, u.email as usuario_email
      FROM logs_auditoria la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 1;

    if (filtros?.usuario_id) {
      query += ` AND la.usuario_id = $${paramCount}`;
      values.push(filtros.usuario_id);
      paramCount++;
    }

    if (filtros?.acao) {
      query += ` AND la.acao = $${paramCount}`;
      values.push(filtros.acao);
      paramCount++;
    }

    if (filtros?.tabela) {
      query += ` AND la.tabela = $${paramCount}`;
      values.push(filtros.tabela);
      paramCount++;
    }

    if (filtros?.registro_id) {
      query += ` AND la.registro_id = $${paramCount}`;
      values.push(filtros.registro_id);
      paramCount++;
    }

    if (filtros?.data_inicio) {
      query += ` AND la.created_at >= $${paramCount}`;
      values.push(filtros.data_inicio);
      paramCount++;
    }

    if (filtros?.data_fim) {
      query += ` AND la.created_at <= $${paramCount}`;
      values.push(filtros.data_fim);
      paramCount++;
    }

    query += ' ORDER BY la.created_at DESC';

    if (filtros?.limite) {
      query += ` LIMIT $${paramCount}`;
      values.push(filtros.limite);
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async obterEstatisticas(periodo?: { inicio: Date; fim: Date }): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(DISTINCT usuario_id) as usuarios_ativos,
        COUNT(*) FILTER (WHERE acao = 'CREATE') as creates,
        COUNT(*) FILTER (WHERE acao = 'UPDATE') as updates,
        COUNT(*) FILTER (WHERE acao = 'DELETE') as deletes,
        COUNT(*) FILTER (WHERE acao = 'LOGIN_SUCCESS') as logins_sucesso,
        COUNT(*) FILTER (WHERE acao = 'LOGIN_FAILED') as logins_falha,
        COUNT(*) FILTER (WHERE acao = 'LOGOUT') as logouts
      FROM logs_auditoria
      WHERE 1=1
    `;
    
    const values: any[] = [];
    
    if (periodo) {
      query += ' AND created_at BETWEEN $1 AND $2';
      values.push(periodo.inicio, periodo.fim);
    }
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async obterAtividadePorUsuario(limite: number = 10): Promise<any[]> {
    const query = `
      SELECT 
        u.id,
        u.nome,
        u.email,
        COUNT(la.id) as total_acoes,
        COUNT(*) FILTER (WHERE la.acao = 'LOGIN_SUCCESS') as logins,
        MAX(la.created_at) as ultima_atividade
      FROM usuarios u
      LEFT JOIN logs_auditoria la ON u.id = la.usuario_id
      WHERE u.ativo = true
      GROUP BY u.id, u.nome, u.email
      ORDER BY total_acoes DESC, ultima_atividade DESC
      LIMIT $1
    `;
    
    const result = await this.pool.query(query, [limite]);
    return result.rows;
  }

  async obterAtividadePorTabela(): Promise<any[]> {
    const query = `
      SELECT 
        tabela,
        COUNT(*) as total_operacoes,
        COUNT(*) FILTER (WHERE acao = 'CREATE') as creates,
        COUNT(*) FILTER (WHERE acao = 'UPDATE') as updates,
        COUNT(*) FILTER (WHERE acao = 'DELETE') as deletes,
        MAX(created_at) as ultima_operacao
      FROM logs_auditoria
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY tabela
      ORDER BY total_operacoes DESC
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  async limparLogsAntigos(diasParaManter: number = 90): Promise<number> {
    const query = `
      DELETE FROM logs_auditoria 
      WHERE created_at < CURRENT_DATE - INTERVAL '${diasParaManter} days'
    `;
    
    const result = await this.pool.query(query);
    return result.rowCount || 0;
  }

  async buscarAlteracoes(tabela: string, registroId: number): Promise<LogAuditoria[]> {
    const query = `
      SELECT la.*, u.nome as usuario_nome
      FROM logs_auditoria la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      WHERE la.tabela = $1 AND la.registro_id = $2
      ORDER BY la.created_at DESC
    `;
    
    const result = await this.pool.query(query, [tabela, registroId]);
    return result.rows;
  }

  async gerarRelatorioAuditoria(dataInicio: Date, dataFim: Date): Promise<any> {
    const estatisticas = await this.obterEstatisticas({ inicio: dataInicio, fim: dataFim });
    const atividadePorUsuario = await this.obterAtividadePorUsuario(20);
    const atividadePorTabela = await this.obterAtividadePorTabela();
    
    const logsCriticos = await this.pool.query(`
      SELECT la.*, u.nome as usuario_nome
      FROM logs_auditoria la
      LEFT JOIN usuarios u ON la.usuario_id = u.id
      WHERE la.acao IN ('DELETE', 'LOGIN_FAILED')
        AND la.created_at BETWEEN $1 AND $2
      ORDER BY la.created_at DESC
      LIMIT 50
    `, [dataInicio, dataFim]);

    return {
      periodo: { inicio: dataInicio, fim: dataFim },
      estatisticas,
      atividade_por_usuario: atividadePorUsuario,
      atividade_por_tabela: atividadePorTabela,
      logs_criticos: logsCriticos.rows,
      gerado_em: new Date()
    };
  }
}