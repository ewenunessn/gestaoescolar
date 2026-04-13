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
import { cacheService } from "../../../utils/cacheService";

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
  const cacheKey = 'produtos:list:all';
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const result = await db.query(`
    SELECT
      p.id,
      p.nome,
      p.descricao,
      p.tipo_processamento,
      p.categoria,
      p.validade_minima,
      p.imagem_url,
      p.perecivel,
      p.ativo,
      p.created_at,
      p.updated_at,
      p.estoque_minimo,
      p.fator_correcao::text as fator_correcao,
      p.tipo_fator_correcao,
      p.indice_coccao::text as indice_coccao,
      p.unidade_medida_id,
      COALESCE(um.codigo, 'UN') as unidade,
      COALESCE(um.nome, 'Unidade') as unidade_nome,
      p.peso::text as peso,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM produto_composicao_nutricional pcn
          WHERE pcn.produto_id = p.id
        ) THEN true
        ELSE false
      END as tem_composicao_nutricional,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM contrato_produtos cp
          INNER JOIN contratos c ON cp.contrato_id = c.id
          WHERE cp.produto_id = p.id AND cp.ativo = true AND c.ativo = true
        ) THEN true
        ELSE false
      END as tem_contrato
    FROM produtos p
    LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
    ORDER BY p.nome
  `);

  const response = { success: true, data: result.rows, total: result.rows.length };
  await cacheService.set(cacheKey, response, cacheService.TTL.list);
  res.json(response);
});

export const buscarProduto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const cacheKey = `produtos:${id}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const result = await db.query(`
    SELECT
      p.id, p.nome, p.descricao, p.tipo_processamento, p.categoria,
      p.validade_minima, p.imagem_url, p.perecivel, p.ativo,
      p.created_at, p.updated_at, p.estoque_minimo,
      p.fator_correcao::text as fator_correcao,
      p.tipo_fator_correcao,
      p.indice_coccao::text as indice_coccao,
      p.unidade_medida_id,
      COALESCE(um.codigo, 'UN') as unidade,
      COALESCE(um.nome, 'Unidade') as unidade_nome,
      p.peso::text as peso
    FROM produtos p
    LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
    WHERE p.id = $1
  `, [id]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Produto', id);
  }

  const response = { success: true, data: result.rows[0] };
  await cacheService.set(cacheKey, response, cacheService.TTL.single);
  res.json(response);
});

export const criarProduto = asyncHandler(async (req: Request, res: Response) => {
  const {
    nome,
    descricao,
    tipo_processamento,
    categoria,
    validade_minima,
    imagem_url,
    perecivel = false,
    ativo = true,
    estoque_minimo = 0,
    fator_correcao = 1.0,
    tipo_fator_correcao = 'perda',
    indice_coccao = 1.0,
    unidade_medida_id,
    peso
  } = req.body;

  // Validar campos obrigatórios
  if (!nome || !nome.trim()) {
    throw new ValidationError('Nome do produto é obrigatório');
  }

  // Validar tipo de processamento
  const tiposProcessamentoValidos = ['in natura', 'minimamente processado', 'ingrediente culinário', 'processado', 'ultraprocessado'];
  if (tipo_processamento && !tiposProcessamentoValidos.includes(tipo_processamento)) {
    throw new ValidationError(`Tipo de processamento inválido. Valores aceitos: ${tiposProcessamentoValidos.join(', ')}`);
  }

  const fatorCorrecaoNormalizado = num(fator_correcao) || 1.0;
  const indiceCoccaoNormalizado = num(indice_coccao) || 1.0;
  const pesoNormalizado = peso !== undefined ? num(peso) : null;

  // Validar fator de correção (sempre >= 1.0 - perda no pré-preparo)
  if (fatorCorrecaoNormalizado < 1.0) {
    throw new ValidationError('Fator de correção deve ser maior ou igual a 1.0 (representa perda no pré-preparo)');
  }

  // Validar índice de cocção (pode ser qualquer valor > 0)
  if (indiceCoccaoNormalizado <= 0) {
    throw new ValidationError('Índice de cocção deve ser maior que 0');
  }

  try {
    const result = await db.query(`
      INSERT INTO produtos (
        nome, descricao, tipo_processamento, categoria, validade_minima,
        imagem_url, perecivel, ativo, estoque_minimo, fator_correcao,
        tipo_fator_correcao, indice_coccao, unidade_medida_id, peso, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      nome.trim(), descricao, tipo_processamento, categoria, validade_minima,
      imagem_url, perecivel, ativo, estoque_minimo, fatorCorrecaoNormalizado,
      tipo_fator_correcao, indiceCoccaoNormalizado, unidade_medida_id, pesoNormalizado
    ]);

    res.status(201).json({
      success: true,
      message: "Produto criado com sucesso",
      data: result.rows[0]
    });
    // Invalidar cache
    cacheService.invalidateEntity('produtos');
  } catch (error) {
    handleDatabaseError(error);
  }
});

export const editarProduto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    nome,
    descricao,
    tipo_processamento,
    categoria,
    validade_minima,
    imagem_url,
    perecivel,
    ativo,
    estoque_minimo,
    fator_correcao,
    tipo_fator_correcao,
    indice_coccao,
    unidade_medida_id,
    peso
  } = req.body;

  // Validar apenas se campos obrigatórios não estão vazios (quando fornecidos)
  if (nome !== undefined && !nome?.trim()) {
    throw new ValidationError('Nome do produto não pode estar vazio');
  }

  // Validar tipo de processamento se fornecido
  const tiposProcessamentoValidos = ['in natura', 'minimamente processado', 'ingrediente culinário', 'processado', 'ultraprocessado'];
  if (tipo_processamento && !tiposProcessamentoValidos.includes(tipo_processamento)) {
    throw new ValidationError(`Tipo de processamento inválido. Valores aceitos: ${tiposProcessamentoValidos.join(', ')}`);
  }

  // Validar fator de correção se fornecido (sempre >= 1.0)
  if (fator_correcao !== undefined) {
    const fatorNum = num(fator_correcao) || 1.0;
    if (fatorNum < 1.0) {
      throw new ValidationError('Fator de correção deve ser maior ou igual a 1.0 (representa perda no pré-preparo)');
    }
  }

  // Validar índice de cocção se fornecido (pode ser qualquer valor > 0)
  if (indice_coccao !== undefined) {
    const indiceNum = num(indice_coccao) || 1.0;
    if (indiceNum <= 0) {
      throw new ValidationError('Índice de cocção deve ser maior que 0');
    }
  }

  const nomeNormalizado = nome !== undefined ? nome.trim() : undefined;
  const fatorCorrecaoNormalizado = fator_correcao !== undefined ? num(fator_correcao) || 1.0 : undefined;
  const indiceCoccaoNormalizado = indice_coccao !== undefined ? num(indice_coccao) || 1.0 : undefined;
  const pesoNormalizado = peso !== undefined ? num(peso) : undefined;

  console.log('📝 [editarProduto] Params:', {
    id, nomeNormalizado, descricao, tipo_processamento, categoria,
    fatorCorrecaoNormalizado, pesoNormalizado
  });

  const result = await db.query(`
    UPDATE produtos SET
      nome = COALESCE($1, nome),
      descricao = COALESCE($2, descricao),
      tipo_processamento = COALESCE($3, tipo_processamento),
      categoria = COALESCE($4, categoria),
      validade_minima = COALESCE($5, validade_minima),
      imagem_url = COALESCE($6, imagem_url),
      perecivel = COALESCE($7, perecivel),
      ativo = COALESCE($8, ativo),
      estoque_minimo = COALESCE($9, estoque_minimo),
      fator_correcao = COALESCE($10, fator_correcao),
      tipo_fator_correcao = COALESCE($11, tipo_fator_correcao),
      indice_coccao = COALESCE($12, indice_coccao),
      unidade_medida_id = COALESCE($13, unidade_medida_id),
      peso = COALESCE($14, peso),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $15
    RETURNING *
  `, [
    nomeNormalizado, descricao, tipo_processamento, categoria, validade_minima,
    imagem_url, perecivel, ativo, estoque_minimo, fatorCorrecaoNormalizado,
    tipo_fator_correcao, indiceCoccaoNormalizado, unidade_medida_id, pesoNormalizado, id
  ]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Produto', id);
  }

  res.json({
    success: true,
    message: "Produto atualizado com sucesso",
    data: result.rows[0]
  });

  // Invalidar cache
  cacheService.invalidateEntity('produtos', Number(id));
});

export const removerProduto = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const checkResult = await db.query(`SELECT id FROM produtos WHERE id = $1`, [id]);
  if (checkResult.rows.length === 0) {
    throw new NotFoundError('Produto', id);
  }

  try {
    // ON DELETE CASCADE cuida de todas as tabelas dependentes automaticamente
    await db.query(`DELETE FROM produtos WHERE id = $1`, [id]);
  } catch (error) {
    handleDatabaseError(error);
  }

  res.json({ success: true, message: "Produto removido com sucesso" });
  cacheService.invalidateEntity('produtos', Number(id));
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
            vitamina_c_mg as vitamina_c,
            vitamina_a_mcg as vitamina_a
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
          vitamina_c_mg as vitamina_c,
          vitamina_a_mcg as vitamina_a
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
              vitamina_c_mg = $13,
              vitamina_a_mcg = $14,
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
              vitamina_c_mg as vitamina_c,
              vitamina_a_mcg as vitamina_a
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
              calcio_mg, ferro_mg, vitamina_c_mg, vitamina_a_mcg, criado_em
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
              vitamina_c_mg as vitamina_c,
              vitamina_a_mcg as vitamina_a
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
