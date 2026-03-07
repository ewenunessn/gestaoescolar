// Controller de refeições para PostgreSQL
import { Request, Response } from "express";
import db from "../../../database";

export async function listarRefeicoes(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        r.id,
        r.nome,
        r.descricao,
        r.tipo,
        r.ativo,
        r.created_at,
        r.updated_at
      FROM refeicoes r
      ORDER BY r.nome
    `);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar refeições:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar refeições",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        r.id,
        r.nome,
        r.descricao,
        r.tipo,
        r.ativo,
        r.created_at,
        r.updated_at
      FROM refeicoes r
      WHERE r.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarRefeicao(req: Request, res: Response) {
  try {
    const {
      nome,
      descricao,
      tipo,
      ativo = true
    } = req.body;

    const result = await db.query(`
      INSERT INTO refeicoes (nome, descricao, tipo, ativo, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nome, descricao, tipo, ativo]);

    res.json({
      success: true,
      message: "Refeição criada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      tipo,
      ativo
    } = req.body;

    const result = await db.query(`
      UPDATE refeicoes SET
        nome = $1,
        descricao = $2,
        tipo = $3,
        ativo = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [nome, descricao, tipo, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Refeição atualizada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM refeicoes WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Refeição removida com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao remover refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function toggleAtivoRefeicao(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      UPDATE refeicoes SET
        ativo = NOT ativo,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Refeição não encontrada"
      });
    }

    res.json({
      success: true,
      message: `Refeição ${result.rows[0].ativo ? 'ativada' : 'desativada'} com sucesso`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao alterar status da refeição:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao alterar status da refeição",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}