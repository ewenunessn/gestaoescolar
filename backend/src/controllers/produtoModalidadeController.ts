// Controller de produto-modalidades para PostgreSQL
import { Request, Response } from "express";
const db = require("../database");

export async function listarProdutoModalidades(req: Request, res: Response) {
  try {
    const produtoModalidades = await db.all(`
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
      data: produtoModalidades,
      total: produtoModalidades.length
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
    
    const produtoModalidade = await db.get(`
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

    if (!produtoModalidade) {
      return res.status(404).json({
        success: false,
        message: "Produto-modalidade não encontrado"
      });
    }

    res.json({
      success: true,
      data: produtoModalidade
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
    const existente = await db.get(`
      SELECT id FROM produto_modalidades 
      WHERE produto_id = $1 AND modalidade_id = $2
    `, [produto_id, modalidade_id]);

    if (existente) {
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

    res.json({
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

    // Verificar se não existe outra associação com os mesmos produto_id e modalidade_id
    if (produto_id && modalidade_id) {
      const existente = await db.get(`
        SELECT id FROM produto_modalidades 
        WHERE produto_id = $1 AND modalidade_id = $2 AND id != $3
      `, [produto_id, modalidade_id, id]);

      if (existente) {
        return res.status(409).json({
          success: false,
          message: "Já existe outra associação com este produto e modalidade"
        });
      }
    }

    const result = await db.query(`
      UPDATE produto_modalidades SET
        produto_id = $1,
        modalidade_id = $2,
        ativo = $3,
        updated_at = CURRENT_TIMESTAMP
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
      message: "Produto-modalidade removido com sucesso",
      data: result.rows[0]
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

// Função para listar modalidades de um produto específico
export async function listarModalidadesPorProduto(req: Request, res: Response) {
  try {
    const { produto_id } = req.params;

    const modalidades = await db.all(`
      SELECT 
        pm.id,
        pm.modalidade_id,
        pm.ativo,
        m.nome as modalidade_nome,
        m.descricao as modalidade_descricao,
        m.valor_repasse
      FROM produto_modalidades pm
      INNER JOIN modalidades m ON pm.modalidade_id = m.id
      WHERE pm.produto_id = $1
      ORDER BY m.nome
    `, [produto_id]);

    res.json({
      success: true,
      data: modalidades,
      total: modalidades.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar modalidades por produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar modalidades por produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Função para listar produtos de uma modalidade específica
export async function listarProdutosPorModalidade(req: Request, res: Response) {
  try {
    const { modalidade_id } = req.params;

    const produtos = await db.all(`
      SELECT 
        pm.id,
        pm.produto_id,
        pm.ativo,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade as unidade_medida,
        p.categoria
      FROM produto_modalidades pm
      INNER JOIN produtos p ON pm.produto_id = p.id
      WHERE pm.modalidade_id = $1
      ORDER BY p.nome
    `, [modalidade_id]);

    res.json({
      success: true,
      data: produtos,
      total: produtos.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos por modalidade:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar produtos por modalidade",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}