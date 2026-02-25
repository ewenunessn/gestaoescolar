// Controller de cardápios para PostgreSQL
import { Request, Response } from "express";
const db = require("../../../database");

export async function listarCardapios(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        c.id,
        c.nome,
        c.data_inicio,
        c.data_fim,
        c.ativo,
        c.created_at,
        c.updated_at,
        STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) as modalidades
      FROM cardapios c
      LEFT JOIN cardapio_refeicoes cr ON c.id = cr.cardapio_id
      LEFT JOIN modalidades m ON cr.modalidade_id = m.id
      GROUP BY c.id, c.nome, c.data_inicio, c.data_fim, c.ativo, c.created_at, c.updated_at
      ORDER BY c.data_inicio DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar cardápios:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar cardápios",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarCardapio(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        c.id,
        c.nome,
        c.data_inicio,
        c.data_fim,
        c.ativo,
        c.created_at,
        c.updated_at
      FROM cardapios c
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cardápio não encontrado"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarCardapio(req: Request, res: Response) {
  try {
    const {
      nome,
      data_inicio,
      data_fim,
      ativo = true
    } = req.body;

    const result = await db.query(`
      INSERT INTO cardapios (nome, data_inicio, data_fim, ativo, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nome, data_inicio, data_fim, ativo]);

    res.json({
      success: true,
      message: "Cardápio criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarCardapio(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      nome,
      data_inicio,
      data_fim,
      ativo
    } = req.body;

    const result = await db.query(`
      UPDATE cardapios SET
        nome = $1,
        data_inicio = $2,
        data_fim = $3,
        ativo = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [nome, data_inicio, data_fim, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cardápio não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Cardápio atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerCardapio(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM cardapios WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cardápio não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Cardápio removido com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao remover cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function calcularCustoRefeicoes(req: Request, res: Response) {
  try {
    const { cardapio_id } = req.params;

    const result = await db.query(`
      SELECT 
        SUM(cp.preco_unitario * rp.quantidade) as custo_total
      FROM cardapio_refeicoes cr
      JOIN refeicao_produtos rp ON cr.refeicao_id = rp.refeicao_id
      JOIN contrato_produtos cp ON rp.produto_id = cp.produto_id
      WHERE cr.cardapio_id = $1
    `, [cardapio_id]);

    res.json({
      success: true,
      data: {
        custo_total: result.rows[0].custo_total || 0
      }
    });
  } catch (error) {
    console.error("❌ Erro ao calcular custo:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao calcular custo",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}


export async function listarCardapioRefeicoes(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        cr.id,
        cr.cardapio_id,
        cr.refeicao_id,
        cr.modalidade_id,
        cr.frequencia_mensal,
        cr.created_at,
        cr.updated_at,
        r.nome as refeicao_nome,
        r.descricao as refeicao_descricao,
        m.nome as modalidade_nome
      FROM cardapio_refeicoes cr
      LEFT JOIN refeicoes r ON cr.refeicao_id = r.id
      LEFT JOIN modalidades m ON cr.modalidade_id = m.id
      WHERE cr.cardapio_id = $1
      ORDER BY r.nome, m.nome
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar refeições do cardápio:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar refeições do cardápio",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
