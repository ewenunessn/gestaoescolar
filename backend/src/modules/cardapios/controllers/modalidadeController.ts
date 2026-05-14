// Controller de modalidades para PostgreSQL
import { Request, Response } from "express";
import db from "../../../database";
import { cacheService } from '../../../utils/cacheService';

async function resolverCategoriaFinanceira(body: any) {
  if (body.categoria_financeira_id) {
    return Number(body.categoria_financeira_id);
  }

  const nomeCategoria = String(body.categoria_financeira_nome || '').trim();
  if (!nomeCategoria) return null;

  const existente = await db.query(
    'SELECT id FROM categorias_financeiras_modalidade WHERE LOWER(nome) = LOWER($1) LIMIT 1',
    [nomeCategoria]
  );

  if (existente.rows.length > 0) {
    return existente.rows[0].id;
  }

  return null;
}

function resolverCategoriasFinanceirasIds(body: any): number[] {
  const origem = Array.isArray(body.categorias_financeiras_ids)
    ? body.categorias_financeiras_ids
    : Array.isArray(body.categoria_financeira_ids)
      ? body.categoria_financeira_ids
      : body.categoria_financeira_id
        ? [body.categoria_financeira_id]
        : [];

  return Array.from(new Set<number>(
    origem
      .map((id: any) => Number(id))
      .filter((id: number) => Number.isInteger(id) && id > 0)
  ));
}

async function sincronizarCategoriasFinanceiras(modalidadeId: number, categoriaIds: number[]) {
  if (categoriaIds.length === 0) return;

  await db.query(
    'UPDATE modalidade_categorias_financeiras SET ativo = false, updated_at = CURRENT_TIMESTAMP WHERE modalidade_id = $1',
    [modalidadeId]
  );

  for (const categoriaId of categoriaIds) {
    await db.query(`
      INSERT INTO modalidade_categorias_financeiras (modalidade_id, categoria_financeira_id, ativo, created_at, updated_at)
      VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (modalidade_id, categoria_financeira_id) DO UPDATE
        SET ativo = true,
            updated_at = CURRENT_TIMESTAMP
    `, [modalidadeId, categoriaId]);
  }
}

async function resolverOrigemRepasse(body: any) {
  if (body.origem_repasse_id) return Number(body.origem_repasse_id);

  const nomeOrigem = String(body.origem_repasse_nome || body.nome || '').replace(/\s+/g, ' ').trim();
  if (!nomeOrigem) return null;

  const codigo = String(body.origem_repasse_codigo || body.codigo || nomeOrigem)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 40);

  const result = await db.query(`
    INSERT INTO origens_repasse (nome, codigo, customizada, ativo)
    VALUES ($1, $2, true, true)
    ON CONFLICT (nome) DO UPDATE
      SET ativo = true,
          updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `, [nomeOrigem, codigo || null]);

  return result.rows[0]?.id ?? null;
}

export async function listarModalidades(req: Request, res: Response) {
  try {
    const cached = await cacheService.get('modalidades:list:all');
    if (cached) return res.json(cached);

    // Permitir filtrar por status ativo via query param
    const { ativo } = req.query;
    const whereClause = ativo !== undefined ? 'WHERE m.ativo = $1' : '';
    const params = ativo !== undefined ? [ativo === 'true'] : [];

    const result = await db.query(`
      SELECT
        m.id,
        m.nome,
        m.descricao,
        categorias_financeiras.ids[1] as categoria_financeira_id,
        COALESCE(categorias_financeiras.ids, ARRAY[]::integer[]) as categorias_financeiras_ids,
        COALESCE(categorias_financeiras.itens, '[]'::jsonb) as categorias_financeiras,
        categorias_financeiras.nomes as categoria_financeira_nome,
        categorias_financeiras.codigos as codigo_financeiro,
        COALESCE(categorias_financeiras.valor_repasse, 0) as valor_repasse,
        COALESCE(categorias_financeiras.parcelas, 1) as parcelas,
        m.ativo,
        m.created_at,
        m.updated_at,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
        COUNT(em.id) as total_escolas
      FROM modalidades m
      LEFT JOIN LATERAL (
        SELECT
          ARRAY_AGG(cfmv.id ORDER BY cfmv.nome) as ids,
          JSONB_AGG(JSONB_BUILD_OBJECT(
            'id', cfmv.id,
            'nome', cfmv.nome,
            'codigo_financeiro', cfmv.codigo_financeiro,
            'valor_repasse', cfmv.valor_repasse,
            'parcelas', cfmv.parcelas,
            'origem_repasse_id', cfmv.origem_repasse_id
          ) ORDER BY cfmv.nome) as itens,
          STRING_AGG(cfmv.nome, ', ' ORDER BY cfmv.nome) as nomes,
          STRING_AGG(cfmv.codigo_financeiro, ', ' ORDER BY cfmv.nome) FILTER (WHERE cfmv.codigo_financeiro IS NOT NULL) as codigos,
          SUM(COALESCE(cfmv.valor_repasse, 0)) as valor_repasse,
          MAX(COALESCE(cfmv.parcelas, 1)) as parcelas
        FROM modalidade_categorias_financeiras mcf
        JOIN categorias_financeiras_modalidade cfmv ON cfmv.id = mcf.categoria_financeira_id
        WHERE mcf.modalidade_id = m.id
          AND mcf.ativo = true
          AND cfmv.ativo = true
      ) categorias_financeiras ON true
      LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
      ${whereClause}
      GROUP BY m.id, m.nome, m.descricao, categorias_financeiras.ids, categorias_financeiras.itens, categorias_financeiras.nomes, categorias_financeiras.codigos, categorias_financeiras.valor_repasse, categorias_financeiras.parcelas, m.ativo, m.created_at, m.updated_at
      ORDER BY m.nome
    `, params);

    const response = {
      success: true,
      data: result.rows,
      total: result.rows.length
    };
    await cacheService.set('modalidades:list:all', response, cacheService.TTL.list);
    res.json(response);
  } catch (error) {
    console.error("❌ Erro ao listar modalidades:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar modalidades",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const cached = await cacheService.get(`modalidades:${id}`);
    if (cached) return res.json(cached);

    const result = await db.query(`
      SELECT
        m.id,
        m.nome,
        m.descricao,
        categorias_financeiras.ids[1] as categoria_financeira_id,
        COALESCE(categorias_financeiras.ids, ARRAY[]::integer[]) as categorias_financeiras_ids,
        COALESCE(categorias_financeiras.itens, '[]'::jsonb) as categorias_financeiras,
        categorias_financeiras.nomes as categoria_financeira_nome,
        categorias_financeiras.codigos as codigo_financeiro,
        COALESCE(categorias_financeiras.valor_repasse, 0) as valor_repasse,
        COALESCE(categorias_financeiras.parcelas, 1) as parcelas,
        m.ativo,
        m.created_at,
        m.updated_at,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
        COUNT(em.id) as total_escolas
      FROM modalidades m
      LEFT JOIN LATERAL (
        SELECT
          ARRAY_AGG(cfmv.id ORDER BY cfmv.nome) as ids,
          JSONB_AGG(JSONB_BUILD_OBJECT(
            'id', cfmv.id,
            'nome', cfmv.nome,
            'codigo_financeiro', cfmv.codigo_financeiro,
            'valor_repasse', cfmv.valor_repasse,
            'parcelas', cfmv.parcelas,
            'origem_repasse_id', cfmv.origem_repasse_id
          ) ORDER BY cfmv.nome) as itens,
          STRING_AGG(cfmv.nome, ', ' ORDER BY cfmv.nome) as nomes,
          STRING_AGG(cfmv.codigo_financeiro, ', ' ORDER BY cfmv.nome) FILTER (WHERE cfmv.codigo_financeiro IS NOT NULL) as codigos,
          SUM(COALESCE(cfmv.valor_repasse, 0)) as valor_repasse,
          MAX(COALESCE(cfmv.parcelas, 1)) as parcelas
        FROM modalidade_categorias_financeiras mcf
        JOIN categorias_financeiras_modalidade cfmv ON cfmv.id = mcf.categoria_financeira_id
        WHERE mcf.modalidade_id = m.id
          AND mcf.ativo = true
          AND cfmv.ativo = true
      ) categorias_financeiras ON true
      LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
      WHERE m.id = $1
      GROUP BY m.id, m.nome, m.descricao, categorias_financeiras.ids, categorias_financeiras.itens, categorias_financeiras.nomes, categorias_financeiras.codigos, categorias_financeiras.valor_repasse, categorias_financeiras.parcelas, m.ativo, m.created_at, m.updated_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    const response = {
      success: true,
      data: result.rows[0]
    };
    await cacheService.set(`modalidades:${id}`, response, cacheService.TTL.single);
    res.json(response);
  } catch (error) {
    console.error("❌ Erro ao buscar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarModalidade(req: Request, res: Response) {
  try {
    const {
      nome,
      descricao,
      ativo = true
    } = req.body;
    const categoriaFinanceiraId = await resolverCategoriaFinanceira(req.body);
    const categoriasFinanceirasIds = resolverCategoriasFinanceirasIds(req.body);
    const categoriasFinanceirasFinal = categoriasFinanceirasIds.length > 0
      ? categoriasFinanceirasIds
      : categoriaFinanceiraId
        ? [categoriaFinanceiraId]
        : [];

    if (categoriasFinanceirasFinal.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Informe uma categoria financeira válida"
      });
    }

    const result = await db.query(`
      INSERT INTO modalidades (nome, descricao, ativo, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nome, descricao || null, ativo]);

    await sincronizarCategoriasFinanceiras(Number(result.rows[0].id), categoriasFinanceirasFinal);

    res.json({
      success: true,
      message: "Modalidade criada com sucesso",
      data: result.rows[0]
    });
    cacheService.invalidateEntity('modalidades');
  } catch (error) {
    console.error("❌ Erro ao criar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      categoria_financeira_id,
      ativo
    } = req.body;
    const categoriaFinanceiraId = await resolverCategoriaFinanceira(req.body);
    const categoriasFinanceirasIds = resolverCategoriasFinanceirasIds(req.body);
    const categoriasFinanceirasFinal = categoriasFinanceirasIds.length > 0
      ? categoriasFinanceirasIds
      : categoriaFinanceiraId ?? categoria_financeira_id
        ? [Number(categoriaFinanceiraId ?? categoria_financeira_id)]
        : [];

    if (categoriasFinanceirasFinal.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Informe uma categoria financeira válida"
      });
    }

    const result = await db.query(`
      UPDATE modalidades SET
        nome = $1,
        descricao = $2,
        ativo = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [nome, descricao || null, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    await sincronizarCategoriasFinanceiras(Number(id), categoriasFinanceirasFinal);

    res.json({
      success: true,
      message: "Modalidade atualizada com sucesso",
      data: result.rows[0]
    });
    cacheService.invalidateEntity('modalidades', Number(id));
  } catch (error) {
    console.error("❌ Erro ao editar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM modalidades WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Modalidade removida com sucesso",
      data: result.rows[0]
    });
    cacheService.invalidateEntity('modalidades', Number(id));
  } catch (error) {
    console.error("❌ Erro ao remover modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function desativarModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      UPDATE modalidades SET
        ativo = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Modalidade desativada com sucesso",
      data: result.rows[0]
    });
    cacheService.invalidateEntity('modalidades', Number(id));
  } catch (error) {
    console.error("❌ Erro ao desativar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao desativar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function reativarModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      UPDATE modalidades SET
        ativo = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Modalidade reativada com sucesso",
      data: result.rows[0]
    });
    cacheService.invalidateEntity('modalidades', Number(id));
  } catch (error) {
    console.error("❌ Erro ao reativar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao reativar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarCategoriasFinanceirasModalidade(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT
        id,
        nome,
        codigo_financeiro,
        valor_repasse,
        parcelas,
        origem_repasse_id,
        origem_repasse_nome,
        origem_repasse_codigo,
        ativo,
        created_at,
        updated_at
      FROM (
        SELECT
          cfm.*,
          ore.nome as origem_repasse_nome,
          ore.codigo as origem_repasse_codigo
        FROM categorias_financeiras_modalidade cfm
        LEFT JOIN origens_repasse ore ON ore.id = cfm.origem_repasse_id
      ) categorias
      WHERE ativo = true
      ORDER BY nome
    `);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("Erro ao listar categorias financeiras:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar categorias financeiras",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarCategoriaFinanceiraModalidade(req: Request, res: Response) {
  try {
    const {
      nome,
      codigo_financeiro = null,
      valor_repasse = 0,
      parcelas = 1,
      origem_repasse_id = null,
      origem_repasse_nome = null,
      ativo = true
    } = req.body;
    const nomeNormalizado = String(nome || '').replace(/\s+/g, ' ').trim();

    if (!nomeNormalizado) {
      return res.status(400).json({
        success: false,
        message: "Nome da categoria financeira é obrigatório"
      });
    }

    const existente = await db.query(
      'SELECT id, nome FROM categorias_financeiras_modalidade WHERE LOWER(nome) = LOWER($1) LIMIT 1',
      [nomeNormalizado]
    );

    if (existente.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Categoria financeira "${existente.rows[0].nome}" já existe`,
        data: existente.rows[0]
      });
    }

    const origemRepasseId = await resolverOrigemRepasse({ origem_repasse_id, origem_repasse_nome });

    const result = await db.query(`
      INSERT INTO categorias_financeiras_modalidade
        (nome, codigo_financeiro, valor_repasse, parcelas, origem_repasse_id, ativo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, nome, codigo_financeiro, valor_repasse, parcelas, origem_repasse_id, ativo, created_at, updated_at
    `, [nomeNormalizado, codigo_financeiro || null, Number(valor_repasse) || 0, Number(parcelas) || 1, origemRepasseId, ativo]);

    cacheService.invalidateEntity('modalidades');

    res.status(201).json({
      success: true,
      message: "Categoria financeira criada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Erro ao criar categoria financeira:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar categoria financeira",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarCategoriaFinanceiraModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      nome,
      codigo_financeiro = null,
      valor_repasse = 0,
      parcelas = 1,
      origem_repasse_id = null,
      origem_repasse_nome = null,
      ativo = true
    } = req.body;
    const nomeNormalizado = String(nome || '').replace(/\s+/g, ' ').trim();

    if (!nomeNormalizado) {
      return res.status(400).json({
        success: false,
        message: "Nome da modalidade financeira e obrigatorio"
      });
    }

    const origemRepasseId = await resolverOrigemRepasse({ origem_repasse_id, origem_repasse_nome });
    const result = await db.query(`
      UPDATE categorias_financeiras_modalidade
      SET nome = $1,
          codigo_financeiro = $2,
          valor_repasse = $3,
          parcelas = $4,
          origem_repasse_id = $5,
          ativo = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, nome, codigo_financeiro, valor_repasse, parcelas, origem_repasse_id, ativo, created_at, updated_at
    `, [nomeNormalizado, codigo_financeiro || null, Number(valor_repasse) || 0, Number(parcelas) || 1, origemRepasseId, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade financeira nao encontrada"
      });
    }

    cacheService.invalidateEntity('modalidades');
    res.json({
      success: true,
      message: "Modalidade financeira atualizada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Erro ao editar modalidade financeira:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar modalidade financeira",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerCategoriaFinanceiraModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await db.query(`
      UPDATE categorias_financeiras_modalidade
      SET ativo = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, nome, codigo_financeiro, valor_repasse, parcelas, origem_repasse_id, ativo, created_at, updated_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade financeira nao encontrada"
      });
    }

    await db.query(`
      UPDATE modalidade_categorias_financeiras
      SET ativo = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE categoria_financeira_id = $1
    `, [id]);

    cacheService.invalidateEntity('modalidades');
    res.json({
      success: true,
      message: "Modalidade financeira removida com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Erro ao remover modalidade financeira:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover modalidade financeira",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarOrigensRepasse(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT id, nome, codigo, customizada, ativo, created_at, updated_at
      FROM origens_repasse
      WHERE ativo = true
      ORDER BY customizada, nome
    `);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("Erro ao listar origens de repasse:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar origens de repasse",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarOrigemRepasse(req: Request, res: Response) {
  try {
    const origemId = await resolverOrigemRepasse(req.body || {});
    if (!origemId) {
      return res.status(400).json({
        success: false,
        message: "Nome da origem do repasse e obrigatorio"
      });
    }

    const result = await db.query(`
      SELECT id, nome, codigo, customizada, ativo, created_at, updated_at
      FROM origens_repasse
      WHERE id = $1
    `, [origemId]);

    res.status(201).json({
      success: true,
      message: "Origem do repasse criada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Erro ao criar origem de repasse:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar origem de repasse",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
