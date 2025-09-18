const db = require('../../../database');

export interface Guia {
  id: number;
  mes: number;
  ano: number;
  observacao?: string;
  status: 'aberta' | 'fechada' | 'cancelada';
  created_at: string;
  updated_at: string;
}

export interface GuiaProdutoEscola {
  id: number;
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGuiaData {
  mes: number;
  ano: number;
  observacao?: string;
}

export interface CreateGuiaProdutoEscolaData {
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
}

class GuiaModel {
  async listarGuias(): Promise<Guia[]> {
    const result = await db.all(`
      SELECT * FROM guias 
      ORDER BY created_at DESC
    `);
    return result;
  }

  async buscarGuia(id: number): Promise<Guia | null> {
    const result = await db.get(`
      SELECT * FROM guias WHERE id = $1
    `, [id]);
    return result;
  }

  async criarGuia(data: CreateGuiaData): Promise<Guia> {
    const result = await db.run(`
      INSERT INTO guias (mes, ano, observacao, status, created_at, updated_at)
      VALUES ($1, $2, $3, 'aberta', NOW(), NOW())
      RETURNING *
    `, [data.mes, data.ano, data.observacao || null]);
    
    return await this.buscarGuia(result.lastID);
  }

  async atualizarGuia(id: number, data: Partial<CreateGuiaData>): Promise<Guia> {
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

    await db.run(`
      UPDATE guias 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    return await this.buscarGuia(id);
  }

  async deletarGuia(id: number): Promise<boolean> {
    const result = await db.run(`
      DELETE FROM guias WHERE id = $1
    `, [id]);
    return result.changes > 0;
  }

  async listarProdutosPorGuia(guiaId: number): Promise<GuiaProdutoEscola[]> {
    const result = await db.all(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        p.unidade as produto_unidade,
        e.nome as escola_nome
      FROM guia_produto_escola gpe
      JOIN produtos p ON gpe.produto_id = p.id
      JOIN escolas e ON gpe.escola_id = e.id
      WHERE gpe.guia_id = $1
      ORDER BY e.nome, p.nome
    `, [guiaId]);
    return result;
  }

  async adicionarProdutoGuia(data: CreateGuiaProdutoEscolaData): Promise<GuiaProdutoEscola> {
    const result = await db.run(`
      INSERT INTO guia_produto_escola (guia_id, produto_id, escola_id, quantidade, unidade, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, [data.guia_id, data.produto_id, data.escola_id, data.quantidade, data.unidade]);
    
    return await this.buscarProdutoGuia(result.lastID);
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
      query += ' AND escola_id = $' + (params.length + 1);
      params.push(escolaId);
    }

    const result = await db.run(query, params);
    return result.changes > 0;
  }
}

export default new GuiaModel();