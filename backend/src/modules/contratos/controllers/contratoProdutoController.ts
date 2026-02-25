// Controller de contrato-produtos para PostgreSQL
import { Request, Response } from "express";
const db = require("../../../database");

export async function listarContratoProdutos(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        cp.id,
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        cp.ativo,
        p.nome as produto_nome,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      INNER JOIN produtos p ON cp.produto_id = p.id
      INNER JOIN contratos c ON cp.contrato_id = c.id
      ORDER BY c.numero, p.nome
    `);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar contrato-produtos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar contrato-produtos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarProdutosPorContrato(req: Request, res: Response) {
  try {
    const { contrato_id } = req.params;

    const result = await db.query(`
      SELECT 
        cp.id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        cp.unidade,
        cp.marca,
        cp.peso,
        cp.ativo,
        p.nome as produto_nome,
        p.descricao as produto_descricao
      FROM contrato_produtos cp
      INNER JOIN produtos p ON cp.produto_id = p.id
      WHERE cp.contrato_id = $1
      ORDER BY cp.ativo DESC, p.nome
    `, [contrato_id]);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos por contrato:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar produtos por contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarProdutosPorFornecedor(req: Request, res: Response) {
  try {
    const { fornecedor_id } = req.params;

    const result = await db.query(`
      SELECT 
        cp.id,
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        p.nome as produto_nome,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      INNER JOIN produtos p ON cp.produto_id = p.id
      INNER JOIN contratos c ON cp.contrato_id = c.id
      WHERE c.fornecedor_id = $1 AND cp.ativo = true
      ORDER BY c.numero, p.nome
    `, [fornecedor_id]);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos por fornecedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar produtos por fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarContratoProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        cp.id,
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        cp.ativo,
        p.nome as produto_nome,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      INNER JOIN produtos p ON cp.produto_id = p.id
      INNER JOIN contratos c ON cp.contrato_id = c.id
      WHERE cp.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar contrato-produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar contrato-produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarContratoProduto(req: Request, res: Response) {
  try {
    const { 
      contrato_id, 
      produto_id, 
      preco_unitario, 
      quantidade_contratada, 
      unidade,
      marca,
      peso,
      ativo = true 
    } = req.body;

    if (!contrato_id || !produto_id || preco_unitario === undefined || quantidade_contratada === undefined) {
      return res.status(400).json({ 
        success: false,
        message: 'Campos obrigatórios: contrato_id, produto_id, preco_unitario, quantidade_contratada' 
      });
    }

    // Verificar se o contrato existe
    const contratoCheck = await db.query(`
      SELECT id FROM contratos WHERE id = $1
    `, [contrato_id]);

    if (contratoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
      });
    }

    // Check if product already exists in this contract
    const existingCheck = await db.query(`
      SELECT cp.id 
      FROM contrato_produtos cp
      WHERE cp.contrato_id = $1 AND cp.produto_id = $2
    `, [contrato_id, produto_id]);

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Este produto já está adicionado a este contrato"
      });
    }

    const result = await db.query(`
      INSERT INTO contrato_produtos (contrato_id, produto_id, preco_unitario, quantidade_contratada, unidade, marca, peso, ativo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [contrato_id, produto_id, preco_unitario, quantidade_contratada, unidade || '', marca || '', peso || '', ativo]);

    res.json({
      success: true,
      message: "Contrato-produto criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar contrato-produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar contrato-produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarContratoProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { preco_unitario, quantidade_contratada, unidade, marca, peso, ativo = true } = req.body;

    const result = await db.query(`
      UPDATE contrato_produtos SET
        preco_unitario = $1,
        quantidade_contratada = $2,
        unidade = $3,
        marca = $4,
        peso = $5,
        ativo = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [preco_unitario, quantidade_contratada, unidade || '', marca || '', peso || '', ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Contrato-produto atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar contrato-produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar contrato-produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerContratoProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se o contrato-produto está sendo usado em pedidos
    const usageCheck = await db.query(`
      SELECT COUNT(*) as count 
      FROM pedido_itens 
      WHERE contrato_produto_id = $1
    `, [id]);

    const isUsed = parseInt(usageCheck.rows[0].count) > 0;

    if (isUsed) {
      return res.status(400).json({
        success: false,
        message: "Não é possível excluir este item pois ele está sendo usado em pedidos. Exclua os pedidos relacionados primeiro ou desative o item.",
        error: "Item em uso"
      });
    }

    // Se não está sendo usado, pode deletar
    const result = await db.query(`
      DELETE FROM contrato_produtos WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Contrato-produto removido com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao remover contrato-produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover contrato-produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}