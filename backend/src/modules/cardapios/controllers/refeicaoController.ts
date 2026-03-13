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
        r.categoria,
        r.ativo,
        r.tempo_preparo_minutos,
        r.rendimento_porcoes,
        r.calorias_por_porcao,
        r.custo_por_porcao,
        r.created_at,
        r.updated_at,
        COUNT(rp.id) as total_produtos
      FROM refeicoes r
      LEFT JOIN refeicao_produtos rp ON r.id = rp.refeicao_id
      GROUP BY r.id
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
        r.*
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
      categoria,
      modo_preparo,
      tempo_preparo_minutos,
      rendimento_porcoes,
      utensílios,
      calorias_por_porcao,
      proteinas_g,
      carboidratos_g,
      lipidios_g,
      fibras_g,
      sodio_mg,
      custo_por_porcao,
      observacoes_tecnicas,
      ativo = true
    } = req.body;

    const result = await db.query(`
      INSERT INTO refeicoes (
        nome, descricao, tipo, categoria, modo_preparo, tempo_preparo_minutos,
        rendimento_porcoes, utensílios, calorias_por_porcao, proteinas_g,
        carboidratos_g, lipidios_g, fibras_g, sodio_mg, custo_por_porcao,
        observacoes_tecnicas, ativo, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      nome, descricao, tipo, categoria, modo_preparo, tempo_preparo_minutos,
      rendimento_porcoes, utensílios, calorias_por_porcao, proteinas_g,
      carboidratos_g, lipidios_g, fibras_g, sodio_mg, custo_por_porcao,
      observacoes_tecnicas, ativo
    ]);

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
      categoria,
      modo_preparo,
      tempo_preparo_minutos,
      rendimento_porcoes,
      utensílios,
      calorias_por_porcao,
      proteinas_g,
      carboidratos_g,
      lipidios_g,
      fibras_g,
      sodio_mg,
      custo_por_porcao,
      observacoes_tecnicas,
      ativo
    } = req.body;

    const result = await db.query(`
      UPDATE refeicoes SET
        nome = COALESCE($1, nome),
        descricao = COALESCE($2, descricao),
        tipo = COALESCE($3, tipo),
        categoria = COALESCE($4, categoria),
        modo_preparo = $5,
        tempo_preparo_minutos = $6,
        rendimento_porcoes = $7,
        utensílios = $8,
        calorias_por_porcao = $9,
        proteinas_g = $10,
        carboidratos_g = $11,
        lipidios_g = $12,
        fibras_g = $13,
        sodio_mg = $14,
        custo_por_porcao = $15,
        observacoes_tecnicas = $16,
        ativo = COALESCE($17, ativo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *
    `, [
      nome, descricao, tipo, categoria, modo_preparo, tempo_preparo_minutos,
      rendimento_porcoes, utensílios, calorias_por_porcao, proteinas_g,
      carboidratos_g, lipidios_g, fibras_g, sodio_mg, custo_por_porcao,
      observacoes_tecnicas, ativo, id
    ]);

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