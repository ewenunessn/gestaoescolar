// Controller de contrato-produtos para PostgreSQL
import { Request, Response } from "express";
const db = require("../database");

export async function listarContratoProdutos(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        cp.id,
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade as limite,
        cp.preco_unitario as preco,
        cp.quantidade as saldo,
        p.nome as produto_nome,
        p.unidade as unidade_medida,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      LEFT JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      ORDER BY c.numero, p.nome
    `);

    const contratoProdutos = result.rows;
    
    res.json({
      success: true,
      data: contratoProdutos,
      total: contratoProdutos.length
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
        cp.contrato_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade as limite,
        cp.preco_unitario as preco,
        cp.quantidade as saldo,
        p.nome as produto_nome,
        p.descricao as produto_descricao,
        p.unidade as unidade_medida,
        p.categoria,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome
      FROM contrato_produtos cp
      LEFT JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE cp.contrato_id = $1
      ORDER BY p.nome
    `, [contrato_id]);

    const produtos = result.rows;
    
    res.json({
      success: true,
      data: produtos,
      total: produtos.length
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

export async function buscarContratoProduto(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        cp.*,
        p.nome as produto_nome,
        p.unidade as unidade_medida,
        c.numero as contrato_numero
      FROM contrato_produtos cp
      LEFT JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      WHERE cp.id = $1
    `, [id]);

    const contratoProduto = result.rows[0];

    if (!contratoProduto) {
      return res.status(404).json({
        success: false,
        message: "Contrato-produto não encontrado"
      });
    }

    res.json({
      success: true,
      data: contratoProduto
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
      quantidade,
      quantidade_contratada,
      preco_unitario
    } = req.body;

    // Usar quantidade_contratada se fornecido, senão usar quantidade
    const quantidadeFinal = quantidade_contratada || quantidade;

    const result = await db.query(`
      INSERT INTO contrato_produtos (contrato_id, produto_id, preco_unitario, quantidade)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [contrato_id, produto_id, preco_unitario, quantidadeFinal]);

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
    const {
      contrato_id,
      produto_id,
      quantidade,
      quantidade_contratada,
      preco_unitario
    } = req.body;

    // Usar quantidade_contratada se fornecido, senão usar quantidade
    const quantidadeFinal = quantidade_contratada || quantidade;

    const result = await db.query(`
      UPDATE contrato_produtos SET
        contrato_id = $1,
        produto_id = $2,
        preco_unitario = $3,
        quantidade = $4
      WHERE id = $5
      RETURNING *
    `, [contrato_id, produto_id, preco_unitario, quantidadeFinal, id]);

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

    // Usar transação para exclusão em cascata
    const result = await db.transaction(async (client) => {
      // Verificar se o contrato-produto existe
      const contratoProdutoResult = await client.query(`
        SELECT * FROM contrato_produtos WHERE id = $1
      `, [id]);

      if (contratoProdutoResult.rows.length === 0) {
        throw new Error("Contrato-produto não encontrado");
      }

      // Contar dependências para informar o usuário
      const dependencias = await client.query(`
        SELECT 
          -- (SELECT COUNT(*) FROM aditivos_contratos_itens WHERE contrato_produto_id = $1) as aditivos -- Removido - módulo de aditivos excluído
      0 as aditivos
      `, [id]);

      const deps = dependencias.rows[0];
      // const totalAditivos = Number(deps.aditivos); // Removido - módulo de aditivos excluído
      // let removidosAditivos = 0; // Removido - módulo de aditivos excluído
      const removidosAditivos = 0; // Módulo de aditivos foi excluído

      // Remover o contrato-produto
      const resultContratoProduto = await client.query(`
        DELETE FROM contrato_produtos WHERE id = $1
        RETURNING *
      `, [id]);

      return {
        contratoProduto: resultContratoProduto.rows[0],
        removidosAditivos: 0, // Módulo de aditivos foi excluído
        totalAditivos: 0 // Módulo de aditivos foi excluído
      };
    });

    // Construir mensagem de sucesso informativa
    let mensagem = "Contrato-produto removido com sucesso";
    const detalhes = [];

    // if (result.removidosAditivos > 0) { // Removido - módulo de aditivos excluído
    //   detalhes.push(`${result.removidosAditivos} aditivos removidos`);
    // }

    if (detalhes.length > 0) {
      mensagem += ` (${detalhes.join(', ')})`;
    }

    res.json({
      success: true,
      message: mensagem,
      data: {
        contrato_produto: result.contratoProduto,
        dependencias_removidas: {
          // aditivos: result.removidosAditivos // Removido - módulo de aditivos excluído
        }
      }
    });
  } catch (error) {
    console.error("❌ Erro ao remover contrato-produto:", error);
    
    if (error instanceof Error && error.message === "Contrato-produto não encontrado") {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Erro ao remover contrato-produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}