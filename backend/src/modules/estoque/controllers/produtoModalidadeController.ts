import { Request, Response } from "express";
const db = require("../../../database");

export async function listarProdutoModalidades(req: Request, res: Response) {
  try {
    const produtoModalidades = await db.query(`
      SELECT 
        pm.id,
        pm.produto_id,
        pm.modalidade_id,
        pm.ativo,
        pm.created_at,
        pm.updated_at,
        p.nome as produto_nome,
        m.nome as modalidade_nome
      FROM produto_modalidades pm
      LEFT JOIN produtos p ON pm.produto_id = p.id
      LEFT JOIN modalidades m ON pm.modalidade_id = m.id
      ORDER BY p.nome, m.nome
    `);

    res.json({
      success: true,
      data: produtoModalidades.rows,
      total: produtoModalidades.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar produto-modalidades:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar produto-modalidades",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarProdutoModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const produtoModalidade = await db.query(`
      SELECT 
        pm.id,
        pm.produto_id,
        pm.modalidade_id,
        pm.ativo,
        pm.created_at,
        pm.updated_at,
        p.nome as produto_nome,
        m.nome as modalidade_nome
      FROM produto_modalidades pm
      LEFT JOIN produtos p ON pm.produto_id = p.id
      LEFT JOIN modalidades m ON pm.modalidade_id = m.id
      WHERE pm.id = $1
    `, [id]);

    if (produtoModalidade.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto-modalidade não encontrado"
      });
    }

    res.json({
      success: true,
      data: produtoModalidade.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar produto-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar produto-modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarProdutoModalidade(req: Request, res: Response) {
  try {
    const { produto_id, modalidade_id, ativo = true } = req.body;

    // Verificar se já existe a associação
    const existente = await db.query(`
      SELECT id FROM produto_modalidades 
      WHERE produto_id = $1 AND modalidade_id = $2
    `, [produto_id, modalidade_id]);

    if (existente.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Associação produto-modalidade já existe"
      });
    }

    const result = await db.query(`
      INSERT INTO produto_modalidades (produto_id, modalidade_id, ativo)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [produto_id, modalidade_id, ativo]);

    res.status(201).json({
      success: true,
      message: "Produto-modalidade criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar produto-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar produto-modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarProdutoModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { produto_id, modalidade_id, ativo } = req.body;

    const result = await db.query(`
      UPDATE produto_modalidades 
      SET produto_id = $1, modalidade_id = $2, ativo = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [produto_id, modalidade_id, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto-modalidade não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Produto-modalidade atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar produto-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar produto-modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerProdutoModalidade(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM produto_modalidades WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto-modalidade não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Produto-modalidade removido com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao remover produto-modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover produto-modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}