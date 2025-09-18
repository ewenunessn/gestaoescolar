// Model de RefeicaoProduto para PostgreSQL
const db = require("../../../database");

export interface RefeicaoProduto {
  id: number;
  refeicao_id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: 'gramas' | 'unidades';
  created_at?: Date;
  updated_at?: Date;
}

// Listar produtos de uma refeição
export async function getRefeicaoProdutos(
  refeicao_id: number
): Promise<RefeicaoProduto[]> {
  try {
    const query = `
      SELECT 
        rp.id,
        rp.refeicao_id,
        rp.produto_id,
        rp.per_capita,
        rp.tipo_medida,
        rp.created_at,
        rp.updated_at,
        p.nome as produto_nome,
        p.unidade
      FROM refeicao_produtos rp
      LEFT JOIN produtos p ON rp.produto_id = p.id
      WHERE rp.refeicao_id = $1
      ORDER BY p.nome
    `;

    const result = await db.query(query, [refeicao_id]);
    return result.rows;
  } catch (error) {
    console.error("❌ Erro ao buscar produtos da refeição:", error);
    throw error;
  }
}

// Adicionar produto à refeição
export async function addRefeicaoProduto(
  data: Omit<RefeicaoProduto, "id" | "created_at" | "updated_at">
): Promise<RefeicaoProduto> {
  try {
    const query = `
      INSERT INTO refeicao_produtos (refeicao_id, produto_id, per_capita, tipo_medida)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [
      data.refeicao_id,
      data.produto_id,
      data.per_capita,
      data.tipo_medida
    ]);

    return result.rows[0];
  } catch (error) {
    console.error("❌ Erro ao adicionar produto à refeição:", error);
    throw error;
  }
}

// Atualizar per_capita e tipo_medida de um produto da refeição
export async function updateRefeicaoProduto(
  id: number,
  per_capita: number,
  tipo_medida?: 'gramas' | 'unidades'
): Promise<RefeicaoProduto | null> {
  try {
    let query: string;
    let params: any[];

    if (tipo_medida) {
      query = `
        UPDATE refeicao_produtos 
        SET per_capita = $1, tipo_medida = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      params = [per_capita, tipo_medida, id];
    } else {
      query = `
        UPDATE refeicao_produtos 
        SET per_capita = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      params = [per_capita, id];
    }

    const result = await db.query(query, params);
    return result.rows[0] || null;
  } catch (error) {
    console.error("❌ Erro ao atualizar produto da refeição:", error);
    throw error;
  }
}

// Remover produto da refeição
export async function deleteRefeicaoProduto(id: number): Promise<boolean> {
  try {
    const query = `DELETE FROM refeicao_produtos WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error("❌ Erro ao remover produto da refeição:", error);
    throw error;
  }
}

// Verificar se existe associação entre refeição e produto
export async function existeRefeicaoProduto(
  refeicao_id: number,
  produto_id: number
): Promise<boolean> {
  try {
    const query = `
      SELECT COUNT(*) as count 
      FROM refeicao_produtos 
      WHERE refeicao_id = $1 AND produto_id = $2
    `;

    const result = await db.query(query, [refeicao_id, produto_id]);
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error("❌ Erro ao verificar associação refeição-produto:", error);
    throw error;
  }
}