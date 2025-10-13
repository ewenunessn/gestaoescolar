import db from '../../../database';

export interface EscolaEntrega {
  id: number;
  nome: string;
  endereco?: string;
  telefone?: string;
  total_itens: number;
  itens_entregues: number;
  percentual_entregue: number;
}

export interface ItemEntrega {
  id: number;
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
  lote?: string;
  observacao?: string;
  para_entrega: boolean;
  entrega_confirmada: boolean;
  quantidade_entregue?: number;
  data_entrega?: string;
  nome_quem_recebeu?: string;
  nome_quem_entregou?: string;
  observacao_entrega?: string;
  latitude?: number;
  longitude?: number;
  precisao_gps?: number;
  produto_nome: string;
  produto_unidade: string;
  mes: number;
  ano: number;
  guia_observacao?: string;
}

export interface ConfirmarEntregaData {
  quantidade_entregue: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  observacao?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  precisao_gps?: number | null;
}

class EntregaModel {
  async listarEscolasComEntregas(guiaId?: number, rotaId?: number): Promise<EscolaEntrega[]> {
    let whereClause = 'WHERE gpe.para_entrega = true AND g.status = \'aberta\'';
    const params = [];
    let paramCount = 1;

    if (guiaId) {
      whereClause += ` AND g.id = $${paramCount}`;
      params.push(guiaId);
      paramCount++;
    }

    if (rotaId) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM rota_escolas re 
        WHERE re.escola_id = e.id AND re.rota_id = $${paramCount}
      )`;
      params.push(rotaId);
      paramCount++;
    }

    const result = await db.query(`
      SELECT DISTINCT
        e.id,
        e.nome,
        e.endereco,
        e.telefone,
        COUNT(gpe.id) as total_itens,
        SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) as itens_entregues,
        ROUND(
          (SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) * 100.0) / COUNT(gpe.id), 
          2
        ) as percentual_entregue,
        COALESCE(re.posicao, 999) as posicao_rota
      FROM escolas e
      INNER JOIN guia_produto_escola gpe ON e.id = gpe.escola_id
      INNER JOIN guias g ON gpe.guia_id = g.id
      LEFT JOIN rota_escolas re ON e.id = re.escola_id ${rotaId ? `AND re.rota_id = ${rotaId}` : ''}
      ${whereClause}
      GROUP BY e.id, e.nome, e.endereco, e.telefone, re.posicao
      ORDER BY COALESCE(re.posicao, 999), e.nome
    `, params);
    return result.rows;
  }

  async listarItensEntregaPorEscola(escolaId: number, guiaId?: number): Promise<ItemEntrega[]> {
    let whereClause = 'WHERE gpe.escola_id = $1 AND gpe.para_entrega = true AND g.status = \'aberta\'';
    const params = [escolaId];
    let paramCount = 2;

    if (guiaId) {
      whereClause += ` AND g.id = $${paramCount}`;
      params.push(guiaId);
      paramCount++;
    }

    const result = await db.query(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        p.unidade as produto_unidade,
        g.mes,
        g.ano,
        g.observacao as guia_observacao
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN guias g ON gpe.guia_id = g.id
      ${whereClause}
      ORDER BY 
        gpe.entrega_confirmada ASC,
        g.mes DESC, 
        g.ano DESC, 
        p.nome, 
        gpe.lote
    `, params);
    return result.rows;
  }

  async buscarItemEntrega(itemId: number): Promise<ItemEntrega | null> {
    const result = await db.query(`
      SELECT 
        gpe.*,
        p.nome as produto_nome,
        p.unidade as produto_unidade,
        g.mes,
        g.ano,
        g.observacao as guia_observacao,
        e.nome as escola_nome
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN guias g ON gpe.guia_id = g.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      WHERE gpe.id = $1
    `, [itemId]);
    return result.rows[0] || null;
  }

  async confirmarEntrega(itemId: number, dados: ConfirmarEntregaData): Promise<ItemEntrega> {
    // Verificar se o item existe e pode ser entregue
    const item = await this.buscarItemEntrega(itemId);
    if (!item) {
      throw new Error('Item não encontrado');
    }

    if (!item.para_entrega) {
      throw new Error('Este item não está marcado para entrega');
    }

    if (item.entrega_confirmada) {
      throw new Error('Este item já foi entregue');
    }

    // Confirmar a entrega
    await db.query(`
      UPDATE guia_produto_escola 
      SET 
        entrega_confirmada = true,
        quantidade_entregue = $1,
        data_entrega = NOW(),
        nome_quem_entregou = $2,
        nome_quem_recebeu = $3,
        observacao_entrega = $4,
        latitude = $5,
        longitude = $6,
        precisao_gps = $7,
        updated_at = NOW()
      WHERE id = $8
    `, [
      dados.quantidade_entregue,
      dados.nome_quem_entregou,
      dados.nome_quem_recebeu,
      dados.observacao,
      dados.latitude,
      dados.longitude,
      dados.precisao_gps,
      itemId
    ]);

    const updatedItem = await this.buscarItemEntrega(itemId);
    if (!updatedItem) {
      throw new Error('Erro ao buscar item atualizado');
    }
    return updatedItem;
  }

  async cancelarEntrega(itemId: number): Promise<ItemEntrega> {
    // Verificar se o item existe
    const item = await this.buscarItemEntrega(itemId);
    if (!item) {
      throw new Error('Item não encontrado');
    }

    if (!item.entrega_confirmada) {
      throw new Error('Este item não foi entregue ainda');
    }

    // Cancelar a entrega
    await db.query(`
      UPDATE guia_produto_escola 
      SET 
        entrega_confirmada = false,
        quantidade_entregue = NULL,
        data_entrega = NULL,
        nome_quem_entregou = NULL,
        nome_quem_recebeu = NULL,
        observacao_entrega = NULL,
        latitude = NULL,
        longitude = NULL,
        precisao_gps = NULL,
        updated_at = NOW()
      WHERE id = $1
    `, [itemId]);

    const updatedItem = await this.buscarItemEntrega(itemId);
    if (!updatedItem) {
      throw new Error('Erro ao buscar item atualizado');
    }
    return updatedItem;
  }

  async obterEstatisticasEntregas(guiaId?: number, rotaId?: number): Promise<any> {
    let whereClause = 'WHERE gpe.para_entrega = true AND g.status = \'aberta\'';
    const params = [];
    let paramCount = 1;

    if (guiaId) {
      whereClause += ` AND g.id = $${paramCount}`;
      params.push(guiaId);
      paramCount++;
    }

    if (rotaId) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM rota_escolas re 
        WHERE re.escola_id = gpe.escola_id AND re.rota_id = $${paramCount}
      )`;
      params.push(rotaId);
      paramCount++;
    }

    const result = await db.query(`
      SELECT 
        COUNT(DISTINCT gpe.escola_id) as total_escolas,
        COUNT(gpe.id) as total_itens,
        SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) as itens_entregues,
        SUM(CASE WHEN gpe.entrega_confirmada = false THEN 1 ELSE 0 END) as itens_pendentes,
        ROUND(
          (SUM(CASE WHEN gpe.entrega_confirmada = true THEN 1 ELSE 0 END) * 100.0) / COUNT(gpe.id), 
          2
        ) as percentual_entregue
      FROM guia_produto_escola gpe
      INNER JOIN guias g ON gpe.guia_id = g.id
      ${whereClause}
    `, params);
    return result.rows[0];
  }
}

export default new EntregaModel();