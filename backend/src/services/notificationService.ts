import { Pool } from 'pg';

export interface Notificacao {
  id?: number;
  usuario_id: number;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'sucesso' | 'aviso' | 'erro';
  lida: boolean;
  dados_contexto?: any;
  created_at?: Date;
  updated_at?: Date;
}

export interface ConfiguracaoNotificacao {
  id?: number;
  usuario_id: number;
  tipo_alerta: string;
  ativo: boolean;
  email: boolean;
  push: boolean;
  created_at?: Date;
}

export class NotificationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async criarNotificacao(notificacao: Omit<Notificacao, 'id' | 'created_at' | 'updated_at'>): Promise<Notificacao> {
    const query = `
      INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, lida, dados_contexto)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      notificacao.usuario_id,
      notificacao.titulo,
      notificacao.mensagem,
      notificacao.tipo,
      notificacao.lida,
      JSON.stringify(notificacao.dados_contexto)
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async notificarUsuarios(userIds: number[], titulo: string, mensagem: string, tipo: 'info' | 'sucesso' | 'aviso' | 'erro' = 'info', dadosContexto?: any): Promise<void> {
    for (const userId of userIds) {
      await this.criarNotificacao({
        usuario_id: userId,
        titulo,
        mensagem,
        tipo,
        lida: false,
        dados_contexto: dadosContexto
      });
    }
  }

  async notificarTodos(titulo: string, mensagem: string, tipo: 'info' | 'sucesso' | 'aviso' | 'erro' = 'info', dadosContexto?: any): Promise<void> {
    // Buscar todos os usuários ativos
    const usuariosQuery = 'SELECT id FROM usuarios WHERE ativo = true';
    const usuariosResult = await this.pool.query(usuariosQuery);
    
    const userIds = usuariosResult.rows.map(row => row.id);
    await this.notificarUsuarios(userIds, titulo, mensagem, tipo, dadosContexto);
  }

  async notificarPorPerfil(perfil: string, titulo: string, mensagem: string, tipo: 'info' | 'sucesso' | 'aviso' | 'erro' = 'info', dadosContexto?: any): Promise<void> {
    const usuariosQuery = 'SELECT id FROM usuarios WHERE perfil = $1 AND ativo = true';
    const usuariosResult = await this.pool.query(usuariosQuery, [perfil]);
    
    const userIds = usuariosResult.rows.map(row => row.id);
    await this.notificarUsuarios(userIds, titulo, mensagem, tipo, dadosContexto);
  }

  async buscarNotificacoes(usuarioId: number, filtros?: {
    lida?: boolean;
    tipo?: string;
    limite?: number;
  }): Promise<Notificacao[]> {
    let query = 'SELECT * FROM notificacoes WHERE usuario_id = $1';
    const values: any[] = [usuarioId];
    let paramCount = 2;

    if (filtros?.lida !== undefined) {
      query += ` AND lida = $${paramCount}`;
      values.push(filtros.lida);
      paramCount++;
    }

    if (filtros?.tipo) {
      query += ` AND tipo = $${paramCount}`;
      values.push(filtros.tipo);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filtros?.limite) {
      query += ` LIMIT $${paramCount}`;
      values.push(filtros.limite);
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async marcarComoLida(id: number, usuarioId: number): Promise<boolean> {
    const query = `
      UPDATE notificacoes 
      SET lida = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND usuario_id = $2
    `;
    
    const result = await this.pool.query(query, [id, usuarioId]);
    return result.rowCount > 0;
  }

  async marcarTodasComoLidas(usuarioId: number): Promise<number> {
    const query = `
      UPDATE notificacoes 
      SET lida = true, updated_at = CURRENT_TIMESTAMP
      WHERE usuario_id = $1 AND lida = false
    `;
    
    const result = await this.pool.query(query, [usuarioId]);
    return result.rowCount || 0;
  }

  async contarNaoLidas(usuarioId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM notificacoes WHERE usuario_id = $1 AND lida = false';
    const result = await this.pool.query(query, [usuarioId]);
    return parseInt(result.rows[0].count) || 0;
  }

  async excluirNotificacao(id: number, usuarioId: number): Promise<boolean> {
    const query = 'DELETE FROM notificacoes WHERE id = $1 AND usuario_id = $2';
    const result = await this.pool.query(query, [id, usuarioId]);
    return result.rowCount > 0;
  }

  async configurarNotificacoes(config: Omit<ConfiguracaoNotificacao, 'id' | 'created_at'>): Promise<ConfiguracaoNotificacao> {
    // Verificar se já existe configuração
    const existeQuery = 'SELECT id FROM configuracoes_notificacao WHERE usuario_id = $1 AND tipo_alerta = $2';
    const existeResult = await this.pool.query(existeQuery, [config.usuario_id, config.tipo_alerta]);

    if (existeResult.rows.length > 0) {
      // Atualizar existente
      const updateQuery = `
        UPDATE configuracoes_notificacao 
        SET ativo = $1, email = $2, push = $3
        WHERE usuario_id = $4 AND tipo_alerta = $5
        RETURNING *
      `;
      
      const result = await this.pool.query(updateQuery, [
        config.ativo, config.email, config.push, config.usuario_id, config.tipo_alerta
      ]);
      
      return result.rows[0];
    } else {
      // Criar nova
      const insertQuery = `
        INSERT INTO configuracoes_notificacao (usuario_id, tipo_alerta, ativo, email, push)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result = await this.pool.query(insertQuery, [
        config.usuario_id, config.tipo_alerta, config.ativo, config.email, config.push
      ]);
      
      return result.rows[0];
    }
  }

  async buscarConfiguracoes(usuarioId: number): Promise<ConfiguracaoNotificacao[]> {
    const query = 'SELECT * FROM configuracoes_notificacao WHERE usuario_id = $1 ORDER BY tipo_alerta';
    const result = await this.pool.query(query, [usuarioId]);
    return result.rows;
  }

  async verificarConfiguracaoUsuario(usuarioId: number, tipoAlerta: string): Promise<ConfiguracaoNotificacao | null> {
    const query = 'SELECT * FROM configuracoes_notificacao WHERE usuario_id = $1 AND tipo_alerta = $2';
    const result = await this.pool.query(query, [usuarioId, tipoAlerta]);
    return result.rows[0] || null;
  }

  // Notificações específicas do sistema
  async notificarEstoqueBaixo(produtoNome: string, quantidadeAtual: number): Promise<void> {
    await this.notificarPorPerfil(
      'administrador',
      'Estoque Baixo',
      `O produto ${produtoNome} está com estoque baixo (${quantidadeAtual} unidades)`,
      'aviso',
      { tipo: 'estoque_baixo', produto: produtoNome, quantidade: quantidadeAtual }
    );
  }

  async notificarPedidoAprovado(pedidoId: number, escolaNome: string): Promise<void> {
    await this.notificarPorPerfil(
      'escola',
      'Pedido Aprovado',
      `Seu pedido para ${escolaNome} foi aprovado e está sendo processado`,
      'sucesso',
      { tipo: 'pedido_aprovado', pedido_id: pedidoId, escola: escolaNome }
    );
  }

  async notificarEntregaRealizada(pedidoId: number, escolaNome: string): Promise<void> {
    await this.notificarPorPerfil(
      'administrador',
      'Entrega Realizada',
      `Entrega realizada com sucesso na escola ${escolaNome}`,
      'sucesso',
      { tipo: 'entrega_realizada', pedido_id: pedidoId, escola: escolaNome }
    );
  }

  async notificarContratoVencendo(contratoNumero: string, fornecedorNome: string, diasRestantes: number): Promise<void> {
    await this.notificarPorPerfil(
      'administrador',
      'Contrato Vencendo',
      `O contrato ${contratoNumero} com ${fornecedorNome} vence em ${diasRestantes} dias`,
      'aviso',
      { tipo: 'contrato_vencendo', contrato: contratoNumero, fornecedor: fornecedorNome, dias: diasRestantes }
    );
  }

  async limparNotificacoesAntigas(diasParaManter: number = 30): Promise<number> {
    const query = `
      DELETE FROM notificacoes 
      WHERE created_at < CURRENT_DATE - INTERVAL '${diasParaManter} days'
    `;
    
    const result = await this.pool.query(query);
    return result.rowCount || 0;
  }

  async obterEstatisticas(usuarioId?: number): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE lida = false) as nao_lidas,
        COUNT(*) FILTER (WHERE tipo = 'info') as info,
        COUNT(*) FILTER (WHERE tipo = 'sucesso') as sucesso,
        COUNT(*) FILTER (WHERE tipo = 'aviso') as aviso,
        COUNT(*) FILTER (WHERE tipo = 'erro') as erro
      FROM notificacoes
      WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
    `;
    
    const values: any[] = [];
    
    if (usuarioId) {
      query += ' AND usuario_id = $1';
      values.push(usuarioId);
    }
    
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }
}