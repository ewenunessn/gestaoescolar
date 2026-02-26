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
  ativo?: boolean;
}

export interface CreatePlanejamentoData {
  guia_id: number;
  rota_id: number;
  data_planejada?: string;
  responsavel?: string;
  observacao?: string;
}

class RotaModel {
  private rotasSchemaEnsured = false;

  private async ensureRotasSchema() {
    if (this.rotasSchemaEnsured) return;
    await db.query(`
      CREATE TABLE IF NOT EXISTS rotas_entrega (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        cor VARCHAR(7) DEFAULT '#1976d2',
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS rota_escolas (
        id SERIAL PRIMARY KEY,
        rota_id INTEGER NOT NULL,
        escola_id INTEGER NOT NULL,
        ordem INTEGER DEFAULT 1,
        observacao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(rota_id, escola_id)
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS planejamento_entregas (
        id SERIAL PRIMARY KEY,
        guia_id INTEGER NOT NULL,
        rota_id INTEGER NOT NULL,
        data_planejada DATE,
        status VARCHAR(20) DEFAULT 'planejado' CHECK (status IN ('planejado', 'em_andamento', 'concluido', 'cancelado')),
        responsavel VARCHAR(255),
        observacao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(guia_id, rota_id)
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_rota_escolas_rota ON rota_escolas(rota_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_rota_escolas_escola ON rota_escolas(escola_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_planejamento_entregas_guia ON planejamento_entregas(guia_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_planejamento_entregas_rota ON planejamento_entregas(rota_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_planejamento_entregas_status ON planejamento_entregas(status)`);
    await db.query(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE rotas_entrega
            ADD CONSTRAINT uq_rotas_entrega_id UNIQUE (id);
        EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN
          ALTER TABLE rota_escolas
            ADD CONSTRAINT fk_rota_escolas_rota
            FOREIGN KEY (rota_id) REFERENCES rotas_entrega(id) ON DELETE CASCADE NOT VALID;
        EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN
          ALTER TABLE rota_escolas
            ADD CONSTRAINT fk_rota_escolas_escola
            FOREIGN KEY (escola_id) REFERENCES escolas(id) ON DELETE CASCADE NOT VALID;
        EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN
          ALTER TABLE planejamento_entregas
            ADD CONSTRAINT fk_planejamento_entregas_guia
            FOREIGN KEY (guia_id) REFERENCES guias(id) ON DELETE CASCADE NOT VALID;
        EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN
          ALTER TABLE planejamento_entregas
            ADD CONSTRAINT fk_planejamento_entregas_rota
            FOREIGN KEY (rota_id) REFERENCES rotas_entrega(id) ON DELETE CASCADE NOT VALID;
        EXCEPTION WHEN OTHERS THEN NULL; END;
      END
      $$;
    `);
    this.rotasSchemaEnsured = true;
  }

  // Rotas de Entrega
  async listarRotas(): Promise<RotaEntrega[]> {
    await this.ensureRotasSchema();
    const result = await db.all(`
      SELECT 
        r.*,
        COUNT(re.escola_id) as total_escolas
      FROM rotas_entrega r
      LEFT JOIN rota_escolas re ON r.id = re.rota_id
      GROUP BY r.id, r.nome, r.descricao, r.cor, r.ativo, r.created_at, r.updated_at
      ORDER BY r.nome
    `);
    return result;
  }

  async buscarRota(id: number): Promise<RotaEntrega | null> {
    await this.ensureRotasSchema();
    const result = await db.get(`
      SELECT * FROM rotas_entrega WHERE id = $1
    `, [id]);
    return result;
  }

  async criarRota(data: CreateRotaData): Promise<RotaEntrega> {
    await this.ensureRotasSchema();
    const result = await db.run(`
      INSERT INTO rotas_entrega (nome, descricao, cor, ativo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [data.nome, data.descricao || null, data.cor || '#1976d2', data.ativo !== undefined ? data.ativo : true]);

    return await this.buscarRota(result.lastID);
  }

  async atualizarRota(id: number, data: Partial<CreateRotaData>): Promise<RotaEntrega> {
    await this.ensureRotasSchema();
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
    if (data.ativo !== undefined) {
      fields.push(`ativo = $${paramCount}`);
      values.push(data.ativo);
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
    try {
      await this.ensureRotasSchema();
      await db.run('BEGIN');

      // Primeiro remove as associações com escolas
      await db.run(`
        DELETE FROM rota_escolas WHERE rota_id = $1
      `, [id]);

      // Remove os planejamentos associados (se houver)
      await db.run(`
        DELETE FROM planejamento_entregas WHERE rota_id = $1
      `, [id]);

      // Remove a rota
      const result = await db.run(`
        DELETE FROM rotas_entrega WHERE id = $1
      `, [id]);

      await db.run('COMMIT');
      return result.changes > 0;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }

  // Escolas da Rota
  async listarEscolasRota(rotaId: number): Promise<RotaEscola[]> {
    await this.ensureRotasSchema();
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
    await this.ensureRotasSchema();
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
      await this.ensureRotasSchema();
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
    await this.ensureRotasSchema();
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
    await this.ensureRotasSchema();
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
    await this.ensureRotasSchema();
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
    await this.ensureRotasSchema();
    const result = await db.run(`
      DELETE FROM planejamento_entregas WHERE id = $1
    `, [id]);
    return result.changes > 0;
  }

  // Método para listar escolas disponíveis (não associadas a nenhuma rota)
  async listarEscolasDisponiveis(): Promise<any[]> {
    await this.ensureRotasSchema();
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
    await this.ensureRotasSchema();
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
}

export default new RotaModel();
