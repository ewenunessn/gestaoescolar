// Controller de produtos para PostgreSQL
import { Request, Response } from "express";
import db from "../../../database";
import {
  asyncHandler,
  ValidationError,
  AuthorizationError,
  NotFoundError,
  handleDatabaseError
} from "../../../utils/errorHandler";

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

async function withEnsureRetry<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err: any) {
    const pgCode = err && (err.code || err.original?.code);
    if (pgCode === '42P01') {
      await ensureProdutoComposicaoTable();
      return await op();
    }
    throw err;
  }
}

function num(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '') return null;
    const n = Number(t.replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  if (typeof v === 'number' && isFinite(v)) return v;
  return null;
}

export const standardizarComposicaoNutricional = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user || !user.isSystemAdmin) {
    throw new AuthorizationError('Apenas administradores do sistema podem executar esta operação');
  }
  
  try {
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
    handleDatabaseError(error);
  }
});

export const listarProdutos = asyncHandler(async (req: Request, res: Response) => {
  const result = await db.query(`
    SELECT 
      p.id,
      p.nome,
      p.unidade,
      p.peso,
      p.descricao,
      p.categoria,
      p.tipo_processamento,
      p.perecivel,
      p.ativo,
      p.created_at
    FROM produtos p
    ORDER BY p.nome
  `);

  res.json({
    success: true,
    data: result.rows,
    total: result.rows.length
  });
});

export const buscarProduto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await db.query(`
    SELECT 
      p.id,
      p.nome,
      p.unidade,
      p.peso,
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
    throw new NotFoundError('Produto', id);
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});

export const criarProduto = asyncHandler(async (req: Request, res: Response) => {
  const { 
    nome, 
    unidade,
    descricao, 
    categoria,
    tipo_processamento,
    peso,
    perecivel = false,
    ativo = true 
  } = req.body;

  // Validar campos obrigatórios
  if (!nome || !nome.trim()) {
    throw new ValidationError('Nome do produto é obrigatório');
  }
  
  if (!unidade || !unidade.trim()) {
    throw new ValidationError('Unidade do produto é obrigatória');
  }

  // Normalizar unidade (remover espaços extras)
  const unidadeNormalizada = unidade.trim();
  const pesoNormalizado = peso ? Number(peso) : null;

  try {
    const result = await db.query(`
      INSERT INTO produtos (nome, unidade, descricao, categoria, tipo_processamento, peso, perecivel, ativo, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nome.trim(), unidadeNormalizada, descricao, categoria, tipo_processamento, pesoNormalizado, perecivel, ativo]);

    res.status(201).json({
      success: true,
      message: "Produto criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    handleDatabaseError(error);
  }
});

export const editarProduto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    nome, 
    unidade,
    descricao, 
    categoria,
    tipo_processamento,
    peso,
    perecivel,
    ativo 
  } = req.body;

  // Validar apenas se campos obrigatórios não estão vazios (quando fornecidos)
  if (nome !== undefined && !nome?.trim()) {
    throw new ValidationError('Nome do produto não pode estar vazio');
  }
  
  if (unidade !== undefined && !unidade?.trim()) {
    throw new ValidationError('Unidade do produto não pode estar vazia');
  }

  // Normalizar valores (aceita qualquer texto, apenas remove espaços extras)
  const nomeNormalizado = nome !== undefined ? nome.trim() : undefined;
  const unidadeNormalizada = unidade !== undefined ? unidade.trim() : undefined;
  const pesoNormalizado = peso !== undefined ? (peso ? Number(peso) : null) : undefined;

  const result = await db.query(`
    UPDATE produtos SET
      nome = COALESCE($1, nome),
      unidade = COALESCE($2, unidade),
      descricao = COALESCE($3, descricao),
      categoria = COALESCE($4, categoria),
      tipo_processamento = COALESCE($5, tipo_processamento),
      peso = COALESCE($6, peso),
      perecivel = COALESCE($7, perecivel),
      ativo = COALESCE($8, ativo),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $9
    RETURNING *
  `, [nomeNormalizado, unidadeNormalizada, descricao, categoria, tipo_processamento, pesoNormalizado, perecivel, ativo, id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Produto', id);
  }

  res.json({
    success: true,
    message: "Produto atualizado com sucesso",
    data: result.rows[0]
  });
});

export const removerProduto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.query(`
      DELETE FROM produtos WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Produto', id);
    }

    res.json({
      success: true,
      message: "Produto removido com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    handleDatabaseError(error);
  }
});

export const buscarComposicaoNutricional = asyncHandler(async (req: Request, res: Response) => {
  try {
    const data = await withEnsureRetry(async () => {
      await ensureProdutoComposicaoTable();
      const schema = await detectarSchemaComposicao();
      const { id } = req.params;
      if (schema === 'novo') {
        const r = await db.query(`
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
        return r;
      } else {
        const r = await db.query(`
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
        return r;
      }
    });

    // Se encontrou dados, retornar imediatamente
    if (data.rows.length > 0) {
      return res.json({
        success: true,
        data: data.rows[0],
        message: "Composição nutricional encontrada"
      });
    }

    // Se não encontrou, criar registro vazio e retornar
    const schema = await detectarSchemaComposicao();
    const produtoId = Number(req.params.id);
    
    if (schema === 'novo') {
      await db.query(`
        INSERT INTO produto_composicao_nutricional (produto_id, criado_em)
        VALUES ($1, CURRENT_TIMESTAMP)
        ON CONFLICT (produto_id) DO NOTHING
      `, [produtoId]);
      const created = await db.query(`
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
      `, [produtoId]);
      return res.json({ success: true, data: created.rows[0], message: "Composição criada" });
    } else {
      await db.query(`
        INSERT INTO produto_composicao_nutricional (produto_id, created_at)
        VALUES ($1, CURRENT_TIMESTAMP)
        ON CONFLICT (produto_id) DO NOTHING
      `, [produtoId]);
      const created = await db.query(`
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
      `, [produtoId]);
      return res.json({ success: true, data: created.rows[0], message: "Composição criada" });
    }
  } catch (error) {
    handleDatabaseError(error);
  }
});

export const salvarComposicaoNutricional = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await withEnsureRetry(async () => {
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
      const pv = {
        calorias: num(calorias),
        proteinas: num(proteinas),
        carboidratos: num(carboidratos),
        gorduras: num(gorduras),
        fibras: num(fibras),
        sodio: num(sodio),
        acucares: num(acucares),
        gord_sat: num(gorduras_saturadas_g),
        gord_trans: num(gorduras_trans_g),
        colesterol: num(colesterol),
        calcio: num(calcio),
        ferro: num(ferro),
        vit_c: num(vitamina_c),
        vit_a: num(vitamina_a),
      };
      const existingResult = await db.query(`
        SELECT id FROM produto_composicao_nutricional WHERE produto_id = $1
      `, [id]);
      if (existingResult.rows.length > 0) {
        if (schema === 'novo') {
          return await db.query(`
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
            pv.calorias, pv.proteinas, pv.carboidratos, pv.gorduras, pv.fibras, pv.sodio,
            pv.acucares, pv.gord_sat, pv.gord_trans, pv.colesterol,
            pv.calcio, pv.ferro, pv.vit_c, pv.vit_a, id
          ]);
        } else {
          return await db.query(`
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
            pv.calorias, pv.proteinas, pv.carboidratos, pv.gorduras, pv.fibras, pv.sodio,
            pv.acucares, pv.gord_sat, pv.gord_trans, pv.colesterol,
            pv.calcio, pv.ferro, pv.vit_c, pv.vit_a, id
          ]);
        }
      } else {
        if (schema === 'novo') {
          return await db.query(`
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
            id, pv.calorias, pv.proteinas, pv.carboidratos, pv.gorduras, pv.fibras, pv.sodio,
            pv.acucares, pv.gord_sat, pv.gord_trans, pv.colesterol,
            pv.calcio, pv.ferro, pv.vit_c, pv.vit_a
          ]);
        } else {
          return await db.query(`
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
            id, pv.calorias, pv.proteinas, pv.carboidratos, pv.gorduras, pv.fibras, pv.sodio,
            pv.acucares, pv.gord_sat, pv.gord_trans, pv.colesterol,
            pv.calcio, pv.ferro, pv.vit_c, pv.vit_a
          ]);
        }
      }
    });

    res.json({
      success: true,
      data: result.rows[0],
      message: "Composição nutricional salva com sucesso"
    });
  } catch (error) {
    handleDatabaseError(error);
  }
});
