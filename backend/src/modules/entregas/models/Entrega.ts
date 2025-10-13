const db = require('../../../database');

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
}

class EntregaModel {
  async listarEscolasComEntregas(): Promise<EscolaEntrega[]> {
    const result = await db.all(`
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
        ) as percentual_entregue
      FROM escolas e
      INNER JOIN guia_produto_escola gpe ON e.id = gpe.escola_id
      INNER JOIN guias g ON gpe.guia_id = g.id
      WHERE gpe.para_entrega = true 
        AND g.status = 'aberta'
      GROUP BY e.id, e.nome, e.endereco, e.telefone
      ORDER BY e.nome
    `);
    return result;
  }

  async listarItensEntregaPorEscola(escolaId: number): Promise<ItemEntrega[]> {
    const result = await db.all(`
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
      WHERE gpe.escola_id = $1 
        AND gpe.para_entrega = true
        AND g.status = 'aberta'
      ORDER BY 
        gpe.entrega_confirmada ASC,
        g.mes DESC, 
        g.ano DESC, 
        p.nome, 
        gpe.lote
    `, [escolaId]);
    return result;
  }

  async buscarItemEntrega(itemId: number): Promise<ItemEntrega | null> {
    const result = await db.get(`
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
    return result;
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
      dados.quantidade_entregue,
      dados.nome_quem_entregou,
      dados.nome_quem_recebeu,
      itemId
    ]);

    return await this.buscarItemEntrega(itemId);
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
    await db.run(`
      UPDATE guia_produto_escola 
      SET 
        entrega_confirmada = false,
        quantidade_entregue = NULL,
        data_entrega = NULL,
        nome_quem_entregou = NULL,
        nome_quem_recebeu = NULL,
        updated_at = NOW()
      WHERE id = $1
    `, [itemId]);

    return await this.buscarItemEntrega(itemId);
  }

  async obterEstatisticasEntregas(): Promise<any> {
    const result = await db.get(`
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
      WHERE gpe.para_entrega = true 
        AND g.status = 'aberta'
    `);
    return result;
  }
}

export default new EntregaModel();