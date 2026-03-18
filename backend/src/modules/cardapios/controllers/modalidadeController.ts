// Controller de modalidades para PostgreSQL
import { Request, Response } from "express";
import db from "../../../database";

export async function listarModalidades(req: Request, res: Response) {
  try {
    // Permitir filtrar por status ativo via query param
    const { ativo } = req.query;
    const whereClause = ativo !== undefined ? 'WHERE m.ativo = $1' : '';
    const params = ativo !== undefined ? [ativo === 'true'] : [];
    
    const result = await db.query(`
      SELECT 
        m.id,
        m.nome,
        m.descricao,
        m.codigo_financeiro,
        m.valor_repasse,
        m.parcelas,
        m.ativo,
        m.created_at,
        m.updated_at,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
        COUNT(em.id) as total_escolas
      FROM modalidades m
      LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
      ${whereClause}
      GROUP BY m.id, m.nome, m.descricao, m.codigo_financeiro, m.valor_repasse, m.parcelas, m.ativo, m.created_at, m.updated_at
      ORDER BY m.nome
    `, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
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

    const result = await db.query(`
      SELECT 
        m.id,
        m.nome,
        m.descricao,
        m.codigo_financeiro,
        m.valor_repasse,
        m.parcelas,
        m.ativo,
        m.created_at,
        m.updated_at,
        COALESCE(SUM(em.quantidade_alunos), 0) as total_alunos,
        COUNT(em.id) as total_escolas
      FROM modalidades m
      LEFT JOIN escola_modalidades em ON m.id = em.modalidade_id
      WHERE m.id = $1
      GROUP BY m.id, m.nome, m.descricao, m.codigo_financeiro, m.valor_repasse, m.parcelas, m.ativo, m.created_at, m.updated_at
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
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

    const result = await db.query(`
      INSERT INTO modalidades (nome, descricao, codigo_financeiro, valor_repasse, parcelas, ativo, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nome, descricao, codigo_financeiro, valor_repasse, parcelas, ativo]);

    res.json({
      success: true,
      message: "Modalidade criada com sucesso",
      data: result.rows[0]
    });
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
      codigo_financeiro,
      valor_repasse,
      parcelas,
      ativo
    } = req.body;

    const result = await db.query(`
      UPDATE modalidades SET
        nome = $1,
        descricao = $2,
        codigo_financeiro = $3,
        valor_repasse = $4,
        parcelas = $5,
        ativo = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [nome, descricao, codigo_financeiro, valor_repasse, parcelas, ativo, id]);

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
  } catch (error) {
    console.error("❌ Erro ao reativar modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao reativar modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}