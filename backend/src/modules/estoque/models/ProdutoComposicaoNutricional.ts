const db = require("../database");

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
  // Usar conexão direta do PostgreSQL
  await db.exec(`
    CREATE TABLE IF NOT EXISTS produto_composicao_nutricional (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL UNIQUE,
      valor_energetico_kcal REAL,
      carboidratos_g REAL,
      acucares_totais_g REAL,
      acucares_adicionados_g REAL,
      proteinas_g REAL,
      gorduras_totais_g REAL,
      gorduras_saturadas_g REAL,
      gorduras_trans_g REAL,
      fibra_alimentar_g REAL,
      sodio_mg REAL,
      FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
    )
  `);
  await db.close();
}

export async function getProdutoComposicaoNutricional(
  produto_id: number
): Promise<ProdutoComposicaoNutricional | null> {
  // Função desabilitada - usar SQL direto
  const comp = await db.get(
    "SELECT * FROM produto_composicao_nutricional WHERE produto_id = ?",
    produto_id
  );
  await db.close();
  return comp || null;
}

export async function upsertComposicaoNutricional(
  produto_id: number,
  data: Omit<ProdutoComposicaoNutricional, "id" | "produto_id">
): Promise<ProdutoComposicaoNutricional> {
  // Função desabilitada - usar SQL direto
  const existente = await db.get(
    "SELECT * FROM produto_composicao_nutricional WHERE produto_id = ?",
    produto_id
  );
  if (existente) {
    await db.run(
      `UPDATE produto_composicao_nutricional SET
        valor_energetico_kcal = ?,
        carboidratos_g = ?,
        acucares_totais_g = ?,
        acucares_adicionados_g = ?,
        proteinas_g = ?,
        gorduras_totais_g = ?,
        gorduras_saturadas_g = ?,
        gorduras_trans_g = ?,
        fibra_alimentar_g = ?,
        sodio_mg = ?
      WHERE produto_id = ?`,
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
    );
  } else {
    await db.run(
      `INSERT INTO produto_composicao_nutricional (
        produto_id, valor_energetico_kcal, carboidratos_g, acucares_totais_g, acucares_adicionados_g, proteinas_g, gorduras_totais_g, gorduras_saturadas_g, gorduras_trans_g, fibra_alimentar_g, sodio_mg
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    );
  }
  const comp = await db.get(
    "SELECT * FROM produto_composicao_nutricional WHERE produto_id = ?",
    produto_id
  );
  await db.close();
  if (!comp) {
    throw new Error("Falha ao recuperar a composição nutricional após upsert.");
  }
  return comp;
}