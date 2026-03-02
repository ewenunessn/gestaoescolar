import db from '../../../database';

export interface HistoricoEntregaRecord {
  id: number;
  guia_produto_escola_id: number;
  quantidade_entregue: number;
  data_entrega: string;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  observacao?: string;
  assinatura_base64?: string;
  latitude?: number;
  longitude?: number;
  precisao_gps?: number;
  created_at: string;
  updated_at: string;
}

export interface CriarHistoricoEntregaData {
  guia_produto_escola_id: number;
  quantidade_entregue: number;
  nome_quem_entregou: string;
  nome_quem_recebeu: string;
  observacao?: string | null;
  assinatura_base64?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  precisao_gps?: number | null;
}

export interface ItemComHistorico {
  item_id: number;
  guia_id: number;
  produto_id: number;
  escola_id: number;
  quantidade_programada: number;
  unidade: string;
  quantidade_total_entregue: number;
  saldo_pendente: number;
  entrega_confirmada: boolean;
  para_entrega: boolean;
  produto_nome: string;
  escola_nome: string;
  mes: number;
  ano: number;
  total_entregas: number;
  ultima_entrega?: string;
  historico_entregas: Array<{
    id: number;
    quantidade: number;
    data: string;
    entregador: string;
    recebedor: string;
    observacao?: string;
  }>;
}

class HistoricoEntregaModel {
  /**
   * Criar um novo registro de entrega
   */
  async criar(dados: CriarHistoricoEntregaData): Promise<HistoricoEntregaRecord> {
    const result = await db.query(`
      INSERT INTO historico_entregas (
        guia_produto_escola_id,
        quantidade_entregue,
        nome_quem_entregou,
        nome_quem_recebeu,
        observacao,
        assinatura_base64,
        latitude,
        longitude,
        precisao_gps
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      dados.guia_produto_escola_id,
      dados.quantidade_entregue,
      dados.nome_quem_entregou,
      dados.nome_quem_recebeu,
      dados.observacao,
      dados.assinatura_base64,
      dados.latitude,
      dados.longitude,
      dados.precisao_gps
    ]);

    // Atualizar quantidade total entregue no item
    await db.query(`
      UPDATE guia_produto_escola
      SET 
        quantidade_total_entregue = (
          SELECT COALESCE(SUM(quantidade_entregue), 0)
          FROM historico_entregas
          WHERE guia_produto_escola_id = $1
        ),
        entrega_confirmada = (
          SELECT COALESCE(SUM(quantidade_entregue), 0) >= quantidade
          FROM historico_entregas
          WHERE guia_produto_escola_id = $1
        ),
        status = CASE 
          WHEN (SELECT COALESCE(SUM(quantidade_entregue), 0) FROM historico_entregas WHERE guia_produto_escola_id = $1) >= quantidade THEN 'entregue'
          WHEN (SELECT COALESCE(SUM(quantidade_entregue), 0) FROM historico_entregas WHERE guia_produto_escola_id = $1) > 0 THEN 'parcial'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = $1
    `, [dados.guia_produto_escola_id]);

    return result.rows[0];
  }

  /**
   * Listar histórico de entregas de um item
   */
  async listarPorItem(itemId: number): Promise<HistoricoEntregaRecord[]> {
    const result = await db.query(`
      SELECT * FROM historico_entregas
      WHERE guia_produto_escola_id = $1
      ORDER BY data_entrega DESC
    `, [itemId]);

    return result.rows;
  }

  /**
   * Listar histórico de entregas de uma escola
   */
  async listarPorEscola(escolaId: number, guiaId?: number): Promise<HistoricoEntregaRecord[]> {
    let query = `
      SELECT he.* 
      FROM historico_entregas he
      INNER JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      WHERE gpe.escola_id = $1
    `;
    const params: any[] = [escolaId];

    if (guiaId) {
      query += ` AND gpe.guia_id = $2`;
      params.push(guiaId);
    }

    query += ` ORDER BY he.data_entrega DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Buscar item com histórico completo
   */
  async buscarItemComHistorico(itemId: number): Promise<ItemComHistorico | null> {
    const result = await db.query(`
      SELECT * FROM vw_entregas_completas
      WHERE item_id = $1
    `, [itemId]);

    return result.rows[0] || null;
  }

  /**
   * Listar itens de uma escola com histórico
   */
  async listarItensComHistorico(escolaId: number, guiaId?: number): Promise<ItemComHistorico[]> {
    let query = `
      SELECT * FROM vw_entregas_completas
      WHERE escola_id = $1
    `;
    const params: any[] = [escolaId];

    if (guiaId) {
      query += ` AND guia_id = $2`;
      params.push(guiaId);
    }

    query += ` ORDER BY produto_nome`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Calcular saldo pendente de um item
   */
  async calcularSaldo(itemId: number): Promise<{
    quantidade_programada: number;
    quantidade_entregue: number;
    saldo_pendente: number;
  }> {
    const result = await db.query(`
      SELECT 
        gpe.quantidade as quantidade_programada,
        COALESCE(gpe.quantidade_total_entregue, 0) as quantidade_entregue,
        (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente
      FROM guia_produto_escola gpe
      WHERE gpe.id = $1
    `, [itemId]);

    return result.rows[0];
  }

  /**
   * Deletar um registro de entrega (apenas para correções)
   */
  async deletar(id: number): Promise<void> {
    const result = await db.query(`
      DELETE FROM historico_entregas
      WHERE id = $1
      RETURNING guia_produto_escola_id
    `, [id]);

    if (result.rows.length > 0) {
      const itemId = result.rows[0].guia_produto_escola_id;
      
      // Recalcular quantidade total entregue
      await db.query(`
        UPDATE guia_produto_escola
        SET 
          quantidade_total_entregue = (
            SELECT COALESCE(SUM(quantidade_entregue), 0)
            FROM historico_entregas
            WHERE guia_produto_escola_id = $1
          ),
          entrega_confirmada = (
            SELECT COALESCE(SUM(quantidade_entregue), 0) >= quantidade
            FROM historico_entregas
            WHERE guia_produto_escola_id = $1
          ),
          status = CASE 
            WHEN (SELECT COALESCE(SUM(quantidade_entregue), 0) FROM historico_entregas WHERE guia_produto_escola_id = $1) >= quantidade THEN 'entregue'
            WHEN (SELECT COALESCE(SUM(quantidade_entregue), 0) FROM historico_entregas WHERE guia_produto_escola_id = $1) > 0 THEN 'parcial'
            ELSE 'pendente'
          END,
          updated_at = NOW()
        WHERE id = $1
      `, [itemId]);
    }
  }
}

export default new HistoricoEntregaModel();
