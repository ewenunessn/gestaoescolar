// Controller para estoque consolidado - visão geral por produto
import { Request, Response } from "express";
const db = require("../database");

export async function buscarEstoqueConsolidadoProduto(req: Request, res: Response) {
  try {
    const { produto_id } = req.params;

    // Buscar informações do produto
    const produtoResult = await db.query(`
      SELECT id, nome, descricao, unidade, categoria
      FROM produtos 
      WHERE id = $1 AND ativo = true
    `, [produto_id]);

    if (produtoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado"
      });
    }

    const produto = produtoResult.rows[0];

    // Buscar estoque do produto em todas as escolas
    const estoqueResult = await db.query(`
      SELECT 
        e.id as escola_id,
        e.nome as escola_nome,
        $1::integer as produto_id,
        COALESCE(ee.quantidade_atual, 0) as quantidade_atual,
        $2 as unidade,
        CASE 
          WHEN COALESCE(ee.quantidade_atual, 0) = 0 THEN 'sem_estoque'
          ELSE 'normal'
        END as status_estoque,
        COALESCE(ee.updated_at, CURRENT_TIMESTAMP) as data_ultima_atualizacao
      FROM escolas e
      LEFT JOIN estoque_escolas ee ON (ee.escola_id = e.id AND ee.produto_id = $1)
      WHERE e.ativo = true
      ORDER BY e.nome
    `, [produto_id, produto.unidade]);

    const escolas = estoqueResult.rows;
    const totalQuantidade = escolas.reduce((sum, escola) => sum + parseFloat(escola.quantidade_atual), 0);
    const escolasComEstoque = escolas.filter(escola => parseFloat(escola.quantidade_atual) > 0).length;

    const resultado = {
      produto_id: produto.id,
      produto_nome: produto.nome,
      produto_descricao: produto.descricao,
      unidade: produto.unidade,
      categoria: produto.categoria,
      escolas: escolas,
      total_quantidade: totalQuantidade,
      total_escolas_com_estoque: escolasComEstoque,
      total_escolas: escolas.length
    };

    res.json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error("❌ Erro ao buscar estoque consolidado do produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar estoque consolidado do produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarEstoqueConsolidado(req: Request, res: Response) {
  try {
    // Buscar resumo do estoque de todos os produtos
    const result = await db.query(`
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade,
        p.categoria,
        (SELECT COUNT(*) FROM escolas WHERE ativo = true) as total_escolas,
        COUNT(CASE WHEN ee.quantidade_atual > 0 THEN 1 END) as total_escolas_com_estoque,
        SUM(COALESCE(ee.quantidade_atual, 0)) as total_quantidade
      FROM produtos p
      LEFT JOIN estoque_escolas ee ON ee.produto_id = p.id
      LEFT JOIN escolas e ON e.id = ee.escola_id AND e.ativo = true
      WHERE p.ativo = true
      GROUP BY p.id, p.nome, p.descricao, p.unidade, p.categoria
      ORDER BY p.categoria, p.nome
    `);

    const produtos = result.rows.map(row => ({
      produto_id: row.produto_id,
      produto_nome: row.produto_nome,
      produto_descricao: row.produto_descricao,
      unidade: row.unidade,
      categoria: row.categoria,
      total_escolas: parseInt(row.total_escolas),
      total_escolas_com_estoque: parseInt(row.total_escolas_com_estoque),
      total_quantidade: parseFloat(row.total_quantidade) || 0
    }));

    res.json({
      success: true,
      data: produtos,
      total: produtos.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar estoque consolidado:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar estoque consolidado",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}