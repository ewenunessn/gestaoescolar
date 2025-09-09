// Controller de escola-modalidades para PostgreSQL
import { Request, Response } from "express";
const db = require("../database");

export async function listarEscolaModalidades(req: Request, res: Response) {
  try {
    const escolaModalidades = await db.all(`
      SELECT 
        em.id,
        em.escola_id,
        em.modalidade_id,
        em.quantidade_alunos,
        e.nome as escola_nome,
        m.nome as modalidade_nome
      FROM escola_modalidades em
      LEFT JOIN escolas e ON em.escola_id = e.id
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      ORDER BY e.nome, m.nome
    `);

    res.json({
      success: true,
      data: escolaModalidades,
      total: escolaModalidades.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar escola-modalidades:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar escola-modalidades",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarEscolaModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const escolaModalidade = await db.get(`
      SELECT 
        em.id,
        em.escola_id,
        em.modalidade_id,
        em.quantidade_alunos,
        e.nome as escola_nome,
        m.nome as modalidade_nome
      FROM escola_modalidades em
      LEFT JOIN escolas e ON em.escola_id = e.id
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      WHERE em.id = $1
    `, [id]);

    if (!escolaModalidade) {
      return res.status(404).json({
        success: false,
        message: "Escola-modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      data: escolaModalidade
    });
  } catch (error) {
    console.error("❌ Erro ao buscar escola-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar escola-modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarModalidadesPorEscola(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;
    
    const modalidades = await db.all(`
      SELECT 
        em.id,
        em.escola_id,
        em.modalidade_id,
        em.quantidade_alunos,
        m.nome as modalidade_nome,
        m.descricao as modalidade_descricao
      FROM escola_modalidades em
      LEFT JOIN modalidades m ON em.modalidade_id = m.id
      WHERE em.escola_id = $1
      ORDER BY m.nome
    `, [escola_id]);

    res.json({
      success: true,
      data: modalidades,
      total: modalidades.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar modalidades por escola:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar modalidades por escola",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarEscolaModalidade(req: Request, res: Response) {
  try {
    const { escola_id, modalidade_id, quantidade_alunos } = req.body;

    const result = await db.query(`
      INSERT INTO escola_modalidades (escola_id, modalidade_id, quantidade_alunos)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [escola_id, modalidade_id, quantidade_alunos]);

    res.json({
      success: true,
      message: "Escola-modalidade criada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar escola-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar escola-modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarEscolaModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { quantidade_alunos } = req.body;

    // Validar se quantidade_alunos foi fornecida
    if (quantidade_alunos === undefined || quantidade_alunos === null) {
      return res.status(400).json({
        success: false,
        message: "Quantidade de alunos é obrigatória"
      });
    }

    // Validar se quantidade_alunos é um número positivo
    if (isNaN(quantidade_alunos) || quantidade_alunos < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantidade de alunos deve ser um número positivo"
      });
    }

    const result = await db.query(`
      UPDATE escola_modalidades SET
        quantidade_alunos = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [quantidade_alunos, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola-modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Escola-modalidade atualizada com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar escola-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar escola-modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerEscolaModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM escola_modalidades WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Escola-modalidade não encontrada"
      });
    }

    res.json({
      success: true,
      message: "Escola-modalidade removida com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao remover escola-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover escola-modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Aliases para compatibilidade com as rotas existentes
export const atualizarEscolaModalidade = editarEscolaModalidade;
export const deletarEscolaModalidade = removerEscolaModalidade;