const db = require('../../../database');

export interface Guia {
  id: number;
  tenant_id: string;
  mes: number;
  ano: number;
  observacao?: string;
  status: 'aberta' | 'fechada' | 'cancelada';
  created_at: string;
  updated_at: string;
  total_produtos?: number;
}

export interface GuiaProdutoEscola {
  id: number;
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  para_entrega: boolean;
  created_at: string;
  updated_at: string;
  entrega_confirmada?: boolean;
  quantidade_entregue?: number;
  data_entrega?: string;
  nome_quem_recebeu?: string;
  nome_quem_entregou?: string;
}

export interface CreateGuiaData {
  tenant_id: string;
  mes: number;
  ano: number;
  nome?: string;
  observacao?: string;
}

export interface CreateGuiaProdutoEscolaData {
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  para_entrega?: boolean;
  entrega_confirmada?: boolean;
  quantidade_entregue?: number;
  data_entrega?: string;
  nome_quem_recebeu?: string;
  nome_quem_entregou?: string;
}

class GuiaModel {
  async listarGuias(tenantId: string): Promise<Guia[]> {
    try {
      console.log('🔍 [GuiaModel] Listando guias para tenant:', tenantId);
      const result = await db.all(`
        SELECT 
          g.*,
          COUNT(DISTINCT gpe.id) as total_produtos
        FROM guias g
        LEFT JOIN guia_produto_escola gpe ON g.id = gpe.guia_id
        WHERE g.tenant_id = $1
        GROUP BY g.id, g.mes, g.ano, g.observacao, g.status, g.created_at, g.updated_at, g.tenant_id
        ORDER BY g.created_at DESC
      `, [tenantId]);
      console.log('✅ [GuiaModel] Encontradas', result.length, 'guias');
      return result;
    } catch (error) {
      console.error('❌ [GuiaModel] Erro ao listar guias:', error);
      throw error;
    }
  }

  async buscarGuia(id: number, tenantId: string): Promise<Guia | null> {
    const result = await db.get(`
      SELECT * FROM guias WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);
    return result;
  }

  async criarGuia(data: CreateGuiaData): Promise<Guia> {
    const result = await db.run(`
      INSERT INTO guias (tenant_id, mes, ano, nome, observacao, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'aberta', NOW(), NOW())
      RETURNING *
    `, [data.tenant_id, data.mes, data.ano, data.nome || null, data.observacao || null]);

    return await this.buscarGuia(result.lastID, data.tenant_id);
  }

  async atualizarGuia(id: number, tenantId: string, data: Partial<CreateGuiaData>): Promise<Guia> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.mes !== undefined) {
      fields.push(`mes = $${paramCount}`);
      values.push(data.mes);
      paramCount++;
    }
    if (data.ano !== undefined) {
      fields.push(`ano = $${paramCount}`);
      values.push(data.ano);
      paramCount++;
    }
    if (data.observacao !== undefined) {
      fields.push(`observacao = $${paramCount}`);
      values.push(data.observacao);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(tenantId);

    await db.run(`
      UPDATE guias 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
    `, values);

    return await this.buscarGuia(id, tenantId);
  }

  async deletarGuia(id: number, tenantId: string): Promise<boolean> {
    const result = await db.run(`
      DELETE FROM guias WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);
    return result.changes > 0;
  }

  async listarProdutosPorGuia(guiaId: number, tenantId: string): Promise<GuiaProdutoEscola[]> {
    const result = await db.all(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        p.unidade as produto_unidade,
        e.nome as escola_nome,
        DATE(gpe.created_at) as data_criacao
      FROM guia_produto_escola gpe
      JOIN produtos p ON gpe.produto_id = p.id AND p.tenant_id = $2
      JOIN escolas e ON gpe.escola_id = e.id AND e.tenant_id = $2
      JOIN guias g ON gpe.guia_id = g.id AND g.tenant_id = $2
      WHERE gpe.guia_id = $1
      ORDER BY gpe.created_at DESC, gpe.lote, p.nome, e.nome
    `, [guiaId, tenantId]);
    return result;
  }

  async adicionarProdutoGuia(data: CreateGuiaProdutoEscolaData): Promise<GuiaProdutoEscola> {
    // Verificar se já existe o produto para esta escola COM O MESMO LOTE
    const existente = await db.get(`
      SELECT * FROM guia_produto_escola 
      WHERE guia_id = $1 AND produto_id = $2 AND escola_id = $3 
      AND (lote = $4 OR (lote IS NULL AND $4 IS NULL))
    `, [data.guia_id, data.produto_id, data.escola_id, data.lote]);

    if (existente) {
      // Se existe, atualizar a quantidade (somar)
      const novaQuantidade = parseFloat(existente.quantidade.toString()) + parseFloat(data.quantidade.toString());
      await db.run(`
        UPDATE guia_produto_escola 
        SET quantidade = $1, unidade = $2, lote = $3, observacao = $4, updated_at = NOW()
        WHERE id = $5
      `, [novaQuantidade, data.unidade, data.lote, data.observacao, existente.id]);

      return await this.buscarProdutoGuia(existente.id);
    } else {
      // Se não existe, inserir novo
      const result = await db.run(`
        INSERT INTO guia_produto_escola (guia_id, produto_id, escola_id, quantidade, unidade, lote, observacao, para_entrega, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [data.guia_id, data.produto_id, data.escola_id, data.quantidade, data.unidade, data.lote, data.observacao, data.para_entrega ?? true]);

      return await this.buscarProdutoGuia(result.lastID);
    }
  }

  async buscarProdutoGuia(id: number): Promise<GuiaProdutoEscola | null> {
    const result = await db.get(`
      SELECT * FROM guia_produto_escola WHERE id = $1
    `, [id]);
    return result;
  }

  async atualizarProdutoGuia(id: number, data: Partial<CreateGuiaProdutoEscolaData>): Promise<GuiaProdutoEscola> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.quantidade !== undefined) {
      fields.push(`quantidade = $${paramCount}`);
      values.push(data.quantidade);
      paramCount++;
    }
    if (data.unidade !== undefined) {
      fields.push(`unidade = $${paramCount}`);
      values.push(data.unidade);
      paramCount++;
    }
    if (data.lote !== undefined) {
      fields.push(`lote = $${paramCount}`);
      values.push(data.lote);
      paramCount++;
    }
    if (data.observacao !== undefined) {
      fields.push(`observacao = $${paramCount}`);
      values.push(data.observacao);
      paramCount++;
    }
    if (data.entrega_confirmada !== undefined) {
      fields.push(`entrega_confirmada = $${paramCount}`);
      values.push(data.entrega_confirmada);
      paramCount++;
    }
    if (data.quantidade_entregue !== undefined) {
      fields.push(`quantidade_entregue = $${paramCount}`);
      values.push(data.quantidade_entregue);
      paramCount++;
    }
    if (data.data_entrega !== undefined) {
      fields.push(`data_entrega = $${paramCount}`);
      values.push(data.data_entrega);
      paramCount++;
    }
    if (data.nome_quem_recebeu !== undefined) {
      fields.push(`nome_quem_recebeu = $${paramCount}`);
      values.push(data.nome_quem_recebeu);
      paramCount++;
    }
    if (data.nome_quem_entregou !== undefined) {
      fields.push(`nome_quem_entregou = $${paramCount}`);
      values.push(data.nome_quem_entregou);
      paramCount++;
    }
    if (data.para_entrega !== undefined) {
      fields.push(`para_entrega = $${paramCount}`);
      values.push(data.para_entrega);
      paramCount++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await db.run(`
      UPDATE guia_produto_escola 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    return await this.buscarProdutoGuia(id);
  }

  async removerProdutoGuia(id: number): Promise<boolean> {
    const result = await db.run(`
      DELETE FROM guia_produto_escola WHERE id = $1
    `, [id]);
    return result.changes > 0;
  }

  async removerProdutosPorGuia(guiaId: number, produtoId?: number, escolaId?: number): Promise<boolean> {
    let query = 'DELETE FROM guia_produto_escola WHERE guia_id = $1';
    const params = [guiaId];

    if (produtoId) {
      query += ' AND produto_id = $2';
      params.push(produtoId);
    }

    if (escolaId) {
      query += ` AND escola_id = $${params.length + 1}`;
      params.push(escolaId);
    }

    const result = await db.run(query, params);
    return result.changes > 0;
  }

  // Métodos específicos para entregas
  async listarEscolasComItensParaEntrega(tenantId: string): Promise<any[]> {
    const result = await db.all(`
      SELECT DISTINCT
        e.id,
        e.nome,
        e.endereco,
        e.telefone,
        COUNT(gpe.id) as total_itens,
        SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) as itens_entregues
      FROM escolas e
      INNER JOIN guia_produto_escola gpe ON e.id = gpe.escola_id
      INNER JOIN guias g ON gpe.guia_id = g.id
      WHERE gpe.para_entrega = true 
        AND g.status = 'aberta'
        AND e.tenant_id = $1
        AND g.tenant_id = $1
      GROUP BY e.id, e.nome, e.endereco, e.telefone
      ORDER BY e.nome
    `, [tenantId]);
    return result;
  }

  async listarItensParaEntregaPorEscola(escolaId: number, tenantId: string): Promise<any[]> {
    const result = await db.all(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        p.unidade as produto_unidade,
        g.mes,
        g.ano,
        g.observacao as guia_observacao
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id AND p.tenant_id = $2
      INNER JOIN guias g ON gpe.guia_id = g.id AND g.tenant_id = $2
      INNER JOIN escolas e ON gpe.escola_id = e.id AND e.tenant_id = $2
      WHERE gpe.escola_id = $1 
        AND gpe.para_entrega = true
        AND g.status = 'aberta'
      ORDER BY g.mes DESC, g.ano DESC, p.nome, gpe.lote
    `, [escolaId, tenantId]);
    return result;
  }

  async confirmarEntrega(itemId: number, dadosEntrega: {
    quantidade_entregue: number;
    nome_quem_entregou: string;
    nome_quem_recebeu: string;
  }): Promise<GuiaProdutoEscola> {
    await db.run(`
      UPDATE guia_produto_escola 
      SET 
        entrega_confirmada = true,
        quantidade_entregue = $1,
        data_entrega = NOW(),
        nome_quem_entregou = $2,
        nome_quem_recebeu = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [
      dadosEntrega.quantidade_entregue,
      dadosEntrega.nome_quem_entregou,
      dadosEntrega.nome_quem_recebeu,
      itemId
    ]);

    return await this.buscarProdutoGuia(itemId);
  }
}

export default new GuiaModel();
