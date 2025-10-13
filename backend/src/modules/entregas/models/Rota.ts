const db = require('../../../database');

export interface RotaEntrega {
  id: number;
  nome: string;
  descricao?: string;
  cor: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  total_escolas?: number;
}

export interface RotaEscola {
  id: number;
  rota_id: number;
  escola_id: number;
  ordem: number;
  observacao?: string;
  created_at: string;
  escola_nome?: string;
  escola_endereco?: string;
}

export interface PlanejamentoEntrega {
  id: number;
  guia_id: number;
  rota_id: number;
  data_planejada?: string;
  status: 'planejado' | 'em_andamento' | 'concluido' | 'cancelado';
  responsavel?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
  rota_nome?: string;
  rota_cor?: string;
  guia_mes?: number;
  guia_ano?: number;
}

export interface CreateRotaData {
  nome: string;
  descricao?: string;
  cor?: string;
}

export interface CreatePlanejamentoData {
  guia_id: number;
  rota_id: number;
  data_planejada?: string;
  responsavel?: string;
  observacao?: string;
}

class RotaModel {
  // Rotas de Entrega
  async listarRotas(): Promise<RotaEntrega[]> {
    const result = await db.all(`
      SELECT 
        r.*,
        COUNT(re.escola_id) as total_escolas
      FROM rotas_entrega r
      LEFT JOIN rota_escolas re ON r.id = re.rota_id
      WHERE r.ativo = true
      GROUP BY r.id
      ORDER BY r.nome
    `);
    return result;
  }

  async buscarRota(id: number): Promise<RotaEntrega | null> {
    const result = await db.get(`
      SELECT * FROM rotas_entrega WHERE id = $1
    `, [id]);
    return result;
  }

  async criarRota(data: CreateRotaData): Promise<RotaEntrega> {
    const result = await db.run(`
      INSERT INTO rotas_entrega (nome, descricao, cor, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `, [data.nome, data.descricao || null, data.cor || '#1976d2']);

    return await this.buscarRota(result.lastID);
  }

  async atualizarRota(id: number, data: Partial<CreateRotaData>): Promise<RotaEntrega> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.nome !== undefined) {
      fields.push(`nome = $${paramCount}`);
      values.push(data.nome);
      paramCount++;
    }
    if (data.descricao !== undefined) {
      fields.push(`descricao = $${paramCount}`);
      values.push(data.descricao);
      paramCount++;
    }
    if (data.cor !== undefined) {
      fields.push(`cor = $${paramCount}`);
      values.push(data.cor);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await db.run(`
      UPDATE rotas_entrega 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    return await this.buscarRota(id);
  }

  async deletarRota(id: number): Promise<boolean> {
    const result = await db.run(`
      UPDATE rotas_entrega SET ativo = false WHERE id = $1
    `, [id]);
    return result.changes > 0;
  }

  // Escolas da Rota
  async listarEscolasRota(rotaId: number): Promise<RotaEscola[]> {
    const result = await db.all(`
      SELECT 
        re.*,
        e.nome as escola_nome,
        e.endereco as escola_endereco
      FROM rota_escolas re
      JOIN escolas e ON re.escola_id = e.id
      WHERE re.rota_id = $1
      ORDER BY re.ordem, e.nome
    `, [rotaId]);
    return result;
  }

  async adicionarEscolaRota(rotaId: number, escolaId: number, ordem?: number, observacao?: string): Promise<RotaEscola> {
    // Verificar se a escola já está em QUALQUER rota
    const escolaEmOutraRota = await db.get(`
      SELECT re.*, r.nome as rota_nome 
      FROM rota_escolas re
      JOIN rotas_entrega r ON re.rota_id = r.id
      WHERE re.escola_id = $1
    `, [escolaId]);

    if (escolaEmOutraRota) {
      throw new Error(`Escola já está associada à rota "${escolaEmOutraRota.rota_nome}". Uma escola não pode estar em duas rotas ao mesmo tempo.`);
    }

    // Se não foi especificada ordem, usar a próxima disponível
    if (!ordem) {
      const maxOrdem = await db.get(`
        SELECT COALESCE(MAX(ordem), 0) + 1 as proxima_ordem
        FROM rota_escolas WHERE rota_id = $1
      `, [rotaId]);
      ordem = maxOrdem.proxima_ordem;
    }

    const result = await db.run(`
      INSERT INTO rota_escolas (rota_id, escola_id, ordem, observacao, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, [rotaId, escolaId, ordem, observacao || null]);

    return await this.buscarEscolaRota(result.lastID);
  }

  async buscarEscolaRota(id: number): Promise<RotaEscola | null> {
    const result = await db.get(`
      SELECT 
        re.*,
        e.nome as escola_nome,
        e.endereco as escola_endereco
      FROM rota_escolas re
      JOIN escolas e ON re.escola_id = e.id
      WHERE re.id = $1
    `, [id]);
    return result;
  }

  async removerEscolaRota(rotaId: number, escolaId: number): Promise<boolean> {
    const result = await db.run(`
      DELETE FROM rota_escolas WHERE rota_id = $1 AND escola_id = $2
    `, [rotaId, escolaId]);
    return result.changes > 0;
  }

  async atualizarOrdemEscolas(rotaId: number, escolasOrdem: { escolaId: number, ordem: number }[]): Promise<boolean> {
    try {
      await db.run('BEGIN');

      for (const item of escolasOrdem) {
        await db.run(`
          UPDATE rota_escolas 
          SET ordem = $1 
          WHERE rota_id = $2 AND escola_id = $3
        `, [item.ordem, rotaId, item.escolaId]);
      }

      await db.run('COMMIT');
      return true;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  // Planejamento de Entregas
  async listarPlanejamentos(guiaId?: number, rotaId?: number): Promise<PlanejamentoEntrega[]> {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (guiaId) {
      whereClause += ` AND pe.guia_id = $${paramCount}`;
      params.push(guiaId);
      paramCount++;
    }

    if (rotaId) {
      whereClause += ` AND pe.rota_id = $${paramCount}`;
      params.push(rotaId);
      paramCount++;
    }

    const result = await db.all(`
      SELECT 
        pe.*,
        r.nome as rota_nome,
        r.cor as rota_cor,
        g.mes as guia_mes,
        g.ano as guia_ano
      FROM planejamento_entregas pe
      JOIN rotas_entrega r ON pe.rota_id = r.id
      JOIN guias g ON pe.guia_id = g.id
      ${whereClause}
      ORDER BY pe.data_planejada DESC, g.ano DESC, g.mes DESC, r.nome
    `, params);
    return result;
  }

  async criarPlanejamento(data: CreatePlanejamentoData): Promise<PlanejamentoEntrega> {
    const result = await db.run(`
      INSERT INTO planejamento_entregas (guia_id, rota_id, data_planejada, responsavel, observacao, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, [data.guia_id, data.rota_id, data.data_planejada || null, data.responsavel || null, data.observacao || null]);

    return await this.buscarPlanejamento(result.lastID);
  }

  async buscarPlanejamento(id: number): Promise<PlanejamentoEntrega | null> {
    const result = await db.get(`
      SELECT 
        pe.*,
        r.nome as rota_nome,
        r.cor as rota_cor,
        g.mes as guia_mes,
        g.ano as guia_ano
      FROM planejamento_entregas pe
      JOIN rotas_entrega r ON pe.rota_id = r.id
      JOIN guias g ON pe.guia_id = g.id
      WHERE pe.id = $1
    `, [id]);
    return result;
  }

  async atualizarPlanejamento(id: number, data: Partial<CreatePlanejamentoData & { status: string }>): Promise<PlanejamentoEntrega> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.data_planejada !== undefined) {
      fields.push(`data_planejada = $${paramCount}`);
      values.push(data.data_planejada);
      paramCount++;
    }
    if (data.responsavel !== undefined) {
      fields.push(`responsavel = $${paramCount}`);
      values.push(data.responsavel);
      paramCount++;
    }
    if (data.observacao !== undefined) {
      fields.push(`observacao = $${paramCount}`);
      values.push(data.observacao);
      paramCount++;
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount}`);
      values.push(data.status);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await db.run(`
      UPDATE planejamento_entregas 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    return await this.buscarPlanejamento(id);
  }

  async deletarPlanejamento(id: number): Promise<boolean> {
    const result = await db.run(`
      DELETE FROM planejamento_entregas WHERE id = $1
    `, [id]);
    return result.changes > 0;
  }

  // Método para listar escolas disponíveis (não associadas a nenhuma rota)
  async listarEscolasDisponiveis(): Promise<any[]> {
    const result = await db.all(`
      SELECT e.*
      FROM escolas e
      WHERE e.id NOT IN (
        SELECT DISTINCT re.escola_id 
        FROM rota_escolas re
        JOIN rotas_entrega r ON re.rota_id = r.id
        WHERE r.ativo = true
      )
      AND e.ativo = true
      ORDER BY e.nome
    `);
    return result;
  }

  // Método para verificar se uma escola está em alguma rota
  async verificarEscolaEmRota(escolaId: number): Promise<{ emRota: boolean; rotaNome?: string; rotaId?: number }> {
    const result = await db.get(`
      SELECT re.rota_id, r.nome as rota_nome
      FROM rota_escolas re
      JOIN rotas_entrega r ON re.rota_id = r.id
      WHERE re.escola_id = $1 AND r.ativo = true
    `, [escolaId]);

    if (result) {
      return {
        emRota: true,
        rotaNome: result.rota_nome,
        rotaId: result.rota_id
      };
    }

    return { emRota: false };
  }

  // Métodos para o módulo de entregas
  async listarRotasComEntregas(guiaId?: number): Promise<any[]> {
    let whereClause = 'WHERE pe.status IN (\'planejado\', \'em_andamento\')';
    const params = [];
    let paramCount = 1;

    if (guiaId) {
      whereClause += ` AND pe.guia_id = $${paramCount}`;
      params.push(guiaId);
      paramCount++;
    }

    const result = await db.all(`
      SELECT 
        r.id,
        r.nome,
        r.descricao,
        r.cor,
        pe.guia_id,
        pe.status,
        pe.responsavel,
        pe.data_planejada,
        g.mes,
        g.ano,
        COUNT(DISTINCT re.escola_id) as total_escolas,
        COUNT(DISTINCT gpe.id) as total_itens,
        SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) as itens_entregues
      FROM rotas_entrega r
      JOIN planejamento_entregas pe ON r.id = pe.rota_id
      JOIN guias g ON pe.guia_id = g.id
      JOIN rota_escolas re ON r.id = re.rota_id
      LEFT JOIN guia_produto_escola gpe ON g.id = gpe.guia_id AND re.escola_id = gpe.escola_id AND gpe.para_entrega = true
      ${whereClause}
      GROUP BY r.id, r.nome, r.descricao, r.cor, pe.guia_id, pe.status, pe.responsavel, pe.data_planejada, g.mes, g.ano
      ORDER BY pe.data_planejada DESC, g.ano DESC, g.mes DESC, r.nome
    `, params);
    return result;
  }
}

export default new RotaModel();