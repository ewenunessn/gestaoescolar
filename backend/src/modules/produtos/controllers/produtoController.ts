// Controller de produtos para PostgreSQL
import { Request, Response } from "express";
const db = require("../../../database");

async function ensureProdutoComposicaoTable() {
  const exists = await db.get(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    ['produto_composicao_nutricional']
  );
  if (!exists) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS produto_composicao_nutricional (
        id SERIAL PRIMARY KEY,
        produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
        energia_kcal DECIMAL(8,2),
        proteina_g DECIMAL(8,2),
        carboidratos_g DECIMAL(8,2),
        lipideos_g DECIMAL(8,2),
        fibra_alimentar_g DECIMAL(8,2),
        sodio_mg DECIMAL(8,2),
        acucares_g DECIMAL(8,2),
        gorduras_saturadas_g DECIMAL(8,2),
        gorduras_trans_g DECIMAL(8,2),
        colesterol_mg DECIMAL(8,2),
        calcio_mg DECIMAL(8,2),
        ferro_mg DECIMAL(8,2),
        vitamina_e_mg DECIMAL(8,2),
        vitamina_b1_mg DECIMAL(8,2),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(produto_id)
      )
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_produto_composicao_produto_id 
      ON produto_composicao_nutricional(produto_id)
    `);
  }
}

async function detectarSchemaComposicao(): Promise<'novo'|'antigo'|'nenhum'> {
  const rows = await db.all(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
    ['produto_composicao_nutricional']
  );
  if (!rows || rows.length === 0) return 'nenhum';
  const cols = rows.map((r: any) => r.column_name);
  if (cols.includes('energia_kcal')) return 'novo';
  return 'antigo';
}

export async function standardizarComposicaoNutricional(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.isSystemAdmin) {
      return res.status(403).json({ success: false, message: 'Acesso negado' });
    }
    await ensureProdutoComposicaoTable();
    const schema = await detectarSchemaComposicao();
    if (schema === 'novo') {
      return res.json({ success: true, message: 'Esquema já está padronizado (v2)' });
    }
    await db.transaction(async () => {
      // Garantir colunas v2
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS energia_kcal DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS proteina_g DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS carboidratos_g DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS lipideos_g DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS fibra_alimentar_g DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS sodio_mg DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS acucares_g DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS gorduras_saturadas_g DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS gorduras_trans_g DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS colesterol_mg DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS calcio_mg DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS ferro_mg DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS vitamina_e_mg DECIMAL(8,2)`);
      await db.query(`ALTER TABLE produto_composicao_nutricional ADD COLUMN IF NOT EXISTS vitamina_b1_mg DECIMAL(8,2)`);
      // Copiar dados v1 -> v2 quando v2 estiver nulo
      await db.query(`
        UPDATE produto_composicao_nutricional SET
          energia_kcal = COALESCE(energia_kcal, calorias),
          proteina_g = COALESCE(proteina_g, proteinas),
          carboidratos_g = COALESCE(carboidratos_g, carboidratos),
          lipideos_g = COALESCE(lipideos_g, gorduras),
          fibra_alimentar_g = COALESCE(fibra_alimentar_g, fibras),
          sodio_mg = COALESCE(sodio_mg, sodio),
          acucares_g = COALESCE(acucares_g, acucares),
          gorduras_saturadas_g = COALESCE(gorduras_saturadas_g, gorduras_saturadas),
          gorduras_trans_g = COALESCE(gorduras_trans_g, gorduras_trans),
          colesterol_mg = COALESCE(colesterol_mg, colesterol),
          calcio_mg = COALESCE(calcio_mg, calcio),
          ferro_mg = COALESCE(ferro_mg, ferro),
          vitamina_e_mg = COALESCE(vitamina_e_mg, vitamina_c),
          vitamina_b1_mg = COALESCE(vitamina_b1_mg, vitamina_a)
      `);
    });
    return res.json({ success: true, message: 'Padronização concluída (v1 -> v2)' });
  } catch (error) {
    console.error('❌ Erro ao padronizar composição nutricional:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao padronizar composição nutricional',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarProdutos(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        p.categoria,
        p.tipo_processamento,
        p.perecivel,
        p.ativo,
        p.created_at,
        (
          SELECT cp.unidade
          FROM contrato_produtos cp
          JOIN contratos c ON cp.contrato_id = c.id
          WHERE cp.produto_id = p.id
            AND c.status = 'ativo'
            AND c.data_inicio <= CURRENT_DATE
            AND c.data_fim >= CURRENT_DATE
          ORDER BY c.data_inicio DESC
          LIMIT 1
        ) as unidade_contrato
      FROM produtos p
      ORDER BY p.nome
    `);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar produtos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        p.id,
        p.nome,
        p.descricao,
        p.categoria,
        p.tipo_processamento,
        p.perecivel,
        p.ativo,
        p.created_at,
        p.updated_at
      FROM produtos p 
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarProduto(req: Request, res: Response) {
  try {
    const { 
      nome, 
      descricao, 
      categoria,
      tipo_processamento,
      perecivel = false,
      ativo = true 
    } = req.body;

    const result = await db.query(`
      INSERT INTO produtos (nome, descricao, categoria, tipo_processamento, perecivel, ativo, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nome, descricao, categoria, tipo_processamento, perecivel, ativo]);

    res.json({
      success: true,
      message: "Produto criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { 
      nome, 
      descricao, 
      categoria,
      tipo_processamento,
      perecivel,
      ativo 
    } = req.body;

    const result = await db.query(`
      UPDATE produtos SET
        nome = $1,
        descricao = $2,
        categoria = $3,
        tipo_processamento = $4,
        perecivel = $5,
        ativo = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [nome, descricao, categoria, tipo_processamento, perecivel, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Produto atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM produtos WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Produto removido com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao remover produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarComposicaoNutricional(req: Request, res: Response) {
  try {
    await ensureProdutoComposicaoTable();
    const schema = await detectarSchemaComposicao();
    const { id } = req.params;

    let result;
    if (schema === 'novo') {
      result = await db.query(`
        SELECT 
          produto_id,
          energia_kcal as calorias,
          proteina_g as proteinas,
          carboidratos_g as carboidratos,
          lipideos_g as gorduras,
          fibra_alimentar_g as fibras,
          sodio_mg as sodio,
          acucares_g as acucares,
          gorduras_saturadas_g,
          gorduras_trans_g,
          colesterol_mg as colesterol,
          calcio_mg as calcio,
          ferro_mg as ferro,
          vitamina_e_mg as vitamina_c,
          vitamina_b1_mg as vitamina_a
        FROM produto_composicao_nutricional 
        WHERE produto_id = $1
      `, [id]);
    } else {
      result = await db.query(`
        SELECT 
          produto_id,
          calorias,
          proteinas,
          carboidratos,
          gorduras,
          fibras,
          sodio,
          acucares,
          gorduras_saturadas as gorduras_saturadas_g,
          gorduras_trans as gorduras_trans_g,
          colesterol,
          calcio,
          ferro,
          vitamina_c,
          vitamina_a
        FROM produto_composicao_nutricional 
        WHERE produto_id = $1
      `, [id]);
    }

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          produto_id: parseInt(id),
          calorias: null,
          proteinas: null,
          carboidratos: null,
          gorduras: null,
          fibras: null,
          sodio: null,
          acucares: null,
          gorduras_saturadas_g: null,
          gorduras_trans_g: null,
          colesterol: null,
          calcio: null,
          ferro: null,
          vitamina_c: null,
          vitamina_a: null
        },
        message: "Composição nutricional não cadastrada"
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: "Composição nutricional encontrada"
    });
  } catch (error) {
    console.error("❌ Erro ao buscar composição nutricional:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar composição nutricional",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function salvarComposicaoNutricional(req: Request, res: Response) {
  try {
    await ensureProdutoComposicaoTable();
    const schema = await detectarSchemaComposicao();
    const { id } = req.params;
    const {
      calorias,
      proteinas,
      carboidratos,
      gorduras,
      fibras,
      sodio,
      acucares,
      gorduras_saturadas_g,
      gorduras_trans_g,
      colesterol,
      calcio,
      ferro,
      vitamina_c,
      vitamina_a
    } = req.body;

    const existingResult = await db.query(`
      SELECT id FROM produto_composicao_nutricional WHERE produto_id = $1
    `, [id]);

    let result;
    if (existingResult.rows.length > 0) {
      if (schema === 'novo') {
        result = await db.query(`
          UPDATE produto_composicao_nutricional SET
            energia_kcal = $1,
            proteina_g = $2,
            carboidratos_g = $3,
            lipideos_g = $4,
            fibra_alimentar_g = $5,
            sodio_mg = $6,
            acucares_g = $7,
            gorduras_saturadas_g = $8,
            gorduras_trans_g = $9,
            colesterol_mg = $10,
            calcio_mg = $11,
            ferro_mg = $12,
            vitamina_e_mg = $13,
            vitamina_b1_mg = $14,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE produto_id = $15
          RETURNING 
            produto_id,
            energia_kcal as calorias,
            proteina_g as proteinas,
            carboidratos_g as carboidratos,
            lipideos_g as gorduras,
            fibra_alimentar_g as fibras,
            sodio_mg as sodio,
            acucares_g as acucares,
            gorduras_saturadas_g,
            gorduras_trans_g,
            colesterol_mg as colesterol,
            calcio_mg as calcio,
            ferro_mg as ferro,
            vitamina_e_mg as vitamina_c,
            vitamina_b1_mg as vitamina_a
        `, [
          calorias, proteinas, carboidratos, gorduras, fibras, sodio,
          acucares, gorduras_saturadas_g, gorduras_trans_g, colesterol,
          calcio, ferro, vitamina_c, vitamina_a, id
        ]);
      } else {
        result = await db.query(`
          UPDATE produto_composicao_nutricional SET
            calorias = $1,
            proteinas = $2,
            carboidratos = $3,
            gorduras = $4,
            fibras = $5,
            sodio = $6,
            acucares = $7,
            gorduras_saturadas = $8,
            gorduras_trans = $9,
            colesterol = $10,
            calcio = $11,
            ferro = $12,
            vitamina_c = $13,
            vitamina_a = $14,
            updated_at = CURRENT_TIMESTAMP
          WHERE produto_id = $15
          RETURNING 
            produto_id,
            calorias,
            proteinas,
            carboidratos,
            gorduras,
            fibras,
            sodio,
            acucares,
            gorduras_saturadas as gorduras_saturadas_g,
            gorduras_trans as gorduras_trans_g,
            colesterol,
            calcio,
            ferro,
            vitamina_c,
            vitamina_a
        `, [
          calorias, proteinas, carboidratos, gorduras, fibras, sodio,
          acucares, gorduras_saturadas_g, gorduras_trans_g, colesterol,
          calcio, ferro, vitamina_c, vitamina_a, id
        ]);
      }
    } else {
      if (schema === 'novo') {
        result = await db.query(`
          INSERT INTO produto_composicao_nutricional (
            produto_id, energia_kcal, proteina_g, carboidratos_g, lipideos_g, fibra_alimentar_g,
            sodio_mg, acucares_g, gorduras_saturadas_g, gorduras_trans_g, colesterol_mg,
            calcio_mg, ferro_mg, vitamina_e_mg, vitamina_b1_mg, criado_em
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP
          ) RETURNING 
            produto_id,
            energia_kcal as calorias,
            proteina_g as proteinas,
            carboidratos_g as carboidratos,
            lipideos_g as gorduras,
            fibra_alimentar_g as fibras,
            sodio_mg as sodio,
            acucares_g as acucares,
            gorduras_saturadas_g,
            gorduras_trans_g,
            colesterol_mg as colesterol,
            calcio_mg as calcio,
            ferro_mg as ferro,
            vitamina_e_mg as vitamina_c,
            vitamina_b1_mg as vitamina_a
        `, [
          id, calorias, proteinas, carboidratos, gorduras, fibras, sodio,
          acucares, gorduras_saturadas_g, gorduras_trans_g, colesterol,
          calcio, ferro, vitamina_c, vitamina_a
        ]);
      } else {
        result = await db.query(`
          INSERT INTO produto_composicao_nutricional (
            produto_id, calorias, proteinas, carboidratos, gorduras, fibras,
            sodio, acucares, gorduras_saturadas, gorduras_trans, colesterol,
            calcio, ferro, vitamina_c, vitamina_a, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP
          ) RETURNING 
            produto_id,
            calorias,
            proteinas,
            carboidratos,
            gorduras,
            fibras,
            sodio,
            acucares,
            gorduras_saturadas as gorduras_saturadas_g,
            gorduras_trans as gorduras_trans_g,
            colesterol,
            calcio,
            ferro,
            vitamina_c,
            vitamina_a
        `, [
          id, calorias, proteinas, carboidratos, gorduras, fibras, sodio,
          acucares, gorduras_saturadas_g, gorduras_trans_g, colesterol,
          calcio, ferro, vitamina_c, vitamina_a
        ]);
      }
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: "Composição nutricional salva com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao salvar composição nutricional:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao salvar composição nutricional",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
