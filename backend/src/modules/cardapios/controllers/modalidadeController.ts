// Controller de modalidades para PostgreSQL
import { Request, Response } from "express";
import db from "../../../database";
import { cacheService } from '../../../utils/cacheService';

async function resolverCategoriaFinanceira(body: any) {
  if (body.categoria_financeira_id) {
    const id = Number(body.categoria_financeira_id);
    await db.query(`
      UPDATE categorias_financeiras_modalidade
      SET codigo_financeiro = $1,
          valor_repasse = $2,
          parcelas = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [body.codigo_financeiro || null, Number(body.valor_repasse) || 0, Number(body.parcelas) || 1, id]);
    return id;
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
        m.categoria_financeira_id,
        cfm.nome as categoria_financeira_nome,
        COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as codigo_financeiro,
        COALESCE(cfm.valor_repasse, m.valor_repasse) as valor_repasse,
        COALESCE(cfm.parcelas, m.parcelas) as parcelas,
        m.ativo,
        m.created_at,
        m.updated_at,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
        COUNT(em.id) as total_escolas
      FROM modalidades m
      LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
      LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
      ${whereClause}
      GROUP BY m.id, m.nome, m.descricao, m.categoria_financeira_id, cfm.nome, cfm.codigo_financeiro, cfm.valor_repasse, cfm.parcelas, m.codigo_financeiro, m.valor_repasse, m.parcelas, m.ativo, m.created_at, m.updated_at
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
        m.categoria_financeira_id,
        cfm.nome as categoria_financeira_nome,
        COALESCE(cfm.codigo_financeiro, m.codigo_financeiro) as codigo_financeiro,
        COALESCE(cfm.valor_repasse, m.valor_repasse) as valor_repasse,
        COALESCE(cfm.parcelas, m.parcelas) as parcelas,
        m.ativo,
        m.created_at,
        m.updated_at,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
        COUNT(em.id) as total_escolas
      FROM modalidades m
      LEFT JOIN categorias_financeiras_modalidade cfm ON cfm.id = m.categoria_financeira_id
      LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
      WHERE m.id = $1
      GROUP BY m.id, m.nome, m.descricao, m.categoria_financeira_id, cfm.nome, cfm.codigo_financeiro, cfm.valor_repasse, cfm.parcelas, m.codigo_financeiro, m.valor_repasse, m.parcelas, m.ativo, m.created_at, m.updated_at
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
      codigo_financeiro,
      valor_repasse = 0,
      parcelas = 1,
      ativo = true
    } = req.body;
    const categoriaFinanceiraId = await resolverCategoriaFinanceira(req.body);

    if (!categoriaFinanceiraId) {
      return res.status(400).json({
        success: false,
        message: "Informe uma categoria financeira válida"
      });
    }

    const result = await db.query(`
      INSERT INTO modalidades (nome, descricao, categoria_financeira_id, codigo_financeiro, valor_repasse, parcelas, ativo, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nome, descricao || null, categoriaFinanceiraId, codigo_financeiro, valor_repasse, parcelas, ativo]);

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
      codigo_financeiro,
      valor_repasse,
      parcelas,
      ativo
    } = req.body;
    const categoriaFinanceiraId = await resolverCategoriaFinanceira(req.body);
    const categoriaFinanceiraFinal = categoriaFinanceiraId ?? categoria_financeira_id ?? null;

    if (!categoriaFinanceiraFinal) {
      return res.status(400).json({
        success: false,
        message: "Informe uma categoria financeira válida"
      });
    }

    const result = await db.query(`
      UPDATE modalidades SET
        nome = $1,
        descricao = $2,
        categoria_financeira_id = $3,
        codigo_financeiro = $4,
        valor_repasse = $5,
        parcelas = $6,
        ativo = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [nome, descricao || null, categoriaFinanceiraFinal, codigo_financeiro, valor_repasse, parcelas, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

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
        ativo,
        created_at,
        updated_at
      FROM categorias_financeiras_modalidade
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

    const result = await db.query(`
      INSERT INTO categorias_financeiras_modalidade
        (nome, codigo_financeiro, valor_repasse, parcelas, ativo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, nome, codigo_financeiro, valor_repasse, parcelas, ativo, created_at, updated_at
    `, [nomeNormalizado, codigo_financeiro || null, Number(valor_repasse) || 0, Number(parcelas) || 1, ativo]);

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
