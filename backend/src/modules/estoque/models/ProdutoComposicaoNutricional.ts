import db from "../../../database";

export interface ProdutoComposicaoNutricional {
  id: number;
  produto_id: number;
  valor_energetico_kcal?: number;
  carboidratos_g?: number;
  acucares_totais_g?: number;
  acucares_adicionados_g?: number;
  proteinas_g?: number;
  gorduras_totais_g?: number;
  gorduras_saturadas_g?: number;
  gorduras_trans_g?: number;
  fibra_alimentar_g?: number;
  sodio_mg?: number;
}

export async function createProdutoComposicaoTable() {
  // Tabela já existe no schema PostgreSQL
  await db.query(`
    CREATE TABLE IF NOT EXISTS produto_composicao_nutricional (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER NOT NULL UNIQUE,
      valor_energetico_kcal DECIMAL(10,2),
      carboidratos_g DECIMAL(10,2),
      acucares_totais_g DECIMAL(10,2),
      acucares_adicionados_g DECIMAL(10,2),
      proteinas_g DECIMAL(10,2),
      gorduras_totais_g DECIMAL(10,2),
      gorduras_saturadas_g DECIMAL(10,2),
      gorduras_trans_g DECIMAL(10,2),
      fibra_alimentar_g DECIMAL(10,2),
      sodio_mg DECIMAL(10,2),
      FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
    )
  `);
}

export async function getProdutoComposicaoNutricional(
  produto_id: number
): Promise<ProdutoComposicaoNutricional | null> {
  const result = await db.query(
    "SELECT * FROM produto_composicao_nutricional WHERE produto_id = $1",
    [produto_id]
  );
  return result.rows[0] || null;
}

export async function upsertComposicaoNutricional(
  produto_id: number,
  data: Omit<ProdutoComposicaoNutricional, "id" | "produto_id">
): Promise<ProdutoComposicaoNutricional> {
  const existente = await db.query(
    "SELECT * FROM produto_composicao_nutricional WHERE produto_id = $1",
    [produto_id]
  );
  
  if (existente.rows.length > 0) {
    const result = await db.query(
      `UPDATE produto_composicao_nutricional SET
        valor_energetico_kcal = $1,
        carboidratos_g = $2,
        acucares_totais_g = $3,
        acucares_adicionados_g = $4,
        proteinas_g = $5,
        gorduras_totais_g = $6,
        gorduras_saturadas_g = $7,
        gorduras_trans_g = $8,
        fibra_alimentar_g = $9,
        sodio_mg = $10
      WHERE produto_id = $11
      RETURNING *`,
      [
        data.valor_energetico_kcal ?? null,
        data.carboidratos_g ?? null,
        data.acucares_totais_g ?? null,
        data.acucares_adicionados_g ?? null,
        data.proteinas_g ?? null,
        data.gorduras_totais_g ?? null,
        data.gorduras_saturadas_g ?? null,
        data.gorduras_trans_g ?? null,
        data.fibra_alimentar_g ?? null,
        data.sodio_mg ?? null,
        produto_id
      ]
    );
    return result.rows[0];
  } else {
    const result = await db.query(
      `INSERT INTO produto_composicao_nutricional (
        produto_id, valor_energetico_kcal, carboidratos_g, acucares_totais_g, 
        acucares_adicionados_g, proteinas_g, gorduras_totais_g, gorduras_saturadas_g, 
        gorduras_trans_g, fibra_alimentar_g, sodio_mg
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        produto_id,
        data.valor_energetico_kcal ?? null,
        data.carboidratos_g ?? null,
        data.acucares_totais_g ?? null,
        data.acucares_adicionados_g ?? null,
        data.proteinas_g ?? null,
        data.gorduras_totais_g ?? null,
        data.gorduras_saturadas_g ?? null,
        data.gorduras_trans_g ?? null,
        data.fibra_alimentar_g ?? null,
        data.sodio_mg ?? null
      ]
    );
    return result.rows[0];
  }
}
