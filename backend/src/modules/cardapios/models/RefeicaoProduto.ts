// Model de RefeicaoProduto para PostgreSQL
import db from "../../../database";

export interface RefeicaoProduto {
  id: number;
  refeicao_id: number;
  produto_id: number;
  per_capita: number;
  tipo_medida: 'gramas' | 'mililitros' | 'unidades';
  created_at?: Date;
  updated_at?: Date;
  per_capita_por_modalidade?: Array<{
    modalidade_id: number;
    per_capita: number;
  }>;
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
        json_build_object(
          'id', p.id,
          'nome', p.nome,
          'unidade', COALESCE(um.codigo, 'UN'),
          'fator_correcao', p.fator_correcao,
          'ativo', p.ativo
        ) as produto,
        (
          SELECT json_agg(
            json_build_object(
              'modalidade_id', rpm.modalidade_id,
              'modalidade_nome', m.nome,
              'per_capita', rpm.per_capita_ajustado
            )
          )
          FROM refeicao_produto_modalidade rpm
          INNER JOIN modalidades m ON m.id = rpm.modalidade_id
          WHERE rpm.refeicao_produto_id = rp.id
        ) as per_capita_por_modalidade
      FROM refeicao_produtos rp
      LEFT JOIN produtos p ON rp.produto_id = p.id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
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
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const query = `
      INSERT INTO refeicao_produtos (refeicao_id, produto_id, per_capita, tipo_medida)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await client.query(query, [
      data.refeicao_id,
      data.produto_id,
      data.per_capita,
      data.tipo_medida
    ]);

    const refeicaoProduto = result.rows[0];

    // Se houver per capita por modalidade, salvar os ajustes
    if (data.per_capita_por_modalidade && data.per_capita_por_modalidade.length > 0) {
      for (const ajuste of data.per_capita_por_modalidade) {
        await client.query(
          `INSERT INTO refeicao_produto_modalidade 
            (refeicao_produto_id, modalidade_id, per_capita_ajustado)
          VALUES ($1, $2, $3)
          ON CONFLICT (refeicao_produto_id, modalidade_id) 
          DO UPDATE SET per_capita_ajustado = $3`,
          [refeicaoProduto.id, ajuste.modalidade_id, ajuste.per_capita]
        );
      }
    }

    await client.query('COMMIT');
    return refeicaoProduto;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erro ao adicionar produto à refeição:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Atualizar per_capita e tipo_medida de um produto da refeição
export async function updateRefeicaoProduto(
  id: number,
  per_capita: number,
  tipo_medida?: 'gramas' | 'mililitros' | 'unidades',
  per_capita_por_modalidade?: Array<{modalidade_id: number, per_capita: number}>
): Promise<RefeicaoProduto | null> {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
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

    const result = await client.query(query, params);
    const refeicaoProduto = result.rows[0];

    if (!refeicaoProduto) {
      await client.query('ROLLBACK');
      return null;
    }

    // Se houver per capita por modalidade, atualizar os ajustes
    if (per_capita_por_modalidade && per_capita_por_modalidade.length > 0) {
      // Deletar ajustes existentes
      await client.query(
        'DELETE FROM refeicao_produto_modalidade WHERE refeicao_produto_id = $1',
        [id]
      );

      // Inserir novos ajustes
      for (const ajuste of per_capita_por_modalidade) {
        await client.query(
          `INSERT INTO refeicao_produto_modalidade 
            (refeicao_produto_id, modalidade_id, per_capita_ajustado)
          VALUES ($1, $2, $3)`,
          [id, ajuste.modalidade_id, ajuste.per_capita]
        );
      }
    }

    await client.query('COMMIT');
    return refeicaoProduto;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erro ao atualizar produto da refeição:", error);
    throw error;
  } finally {
    client.release();
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