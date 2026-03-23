// Controller de contratos para PostgreSQL
import { Request, Response } from "express";
import db from "../../../database";

export async function listarContratos(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        c.id,
        c.numero,
        c.fornecedor_id,
        f.nome as fornecedor_nome,
        c.data_inicio,
        c.data_fim,
        c.valor_total,
        c.status,
        c.ativo,
        c.created_at,
        COALESCE(SUM(cp.quantidade_contratada * cp.preco_unitario), 0) as valor_total_contrato,
        STRING_AGG(DISTINCT p.nome, ' | ') as produtos
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id AND cp.ativo = true
      LEFT JOIN produtos p ON cp.produto_id = p.id
      GROUP BY c.id, f.nome
      ORDER BY c.numero
    `);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar contratos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar contratos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarContrato(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT * FROM contratos WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar contrato:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarContrato(req: Request, res: Response) {
  try {
    const { numero, fornecedor_id, data_inicio, data_fim, valor_total, status = 'ativo', ativo = true } = req.body;

    const result = await db.query(`
      INSERT INTO contratos (numero, fornecedor_id, data_inicio, data_fim, valor_total, status, ativo, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [numero, fornecedor_id, data_inicio, data_fim, valor_total, status, ativo]);

    res.json({
      success: true,
      message: "Contrato criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar contrato:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarContrato(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { numero, fornecedor_id, data_inicio, data_fim, valor_total, status, ativo } = req.body;

    const result = await db.query(`
      UPDATE contratos SET
        numero = $1,
        fornecedor_id = $2,
        data_inicio = $3,
        data_fim = $4,
        valor_total = $5,
        status = $6,
        ativo = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [numero, fornecedor_id, data_inicio, data_fim, valor_total, status, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Contrato atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar contrato:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerContrato(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se o contrato tem produtos ATIVOS associados
    const produtosCheck = await db.query(`
      SELECT COUNT(*) as count 
      FROM contrato_produtos 
      WHERE contrato_id = $1 AND ativo = true
    `, [id]);

    const hasProdutos = parseInt(produtosCheck.rows[0].count) > 0;

    if (hasProdutos) {
      return res.status(400).json({
        success: false,
        message: "Não é possível excluir este contrato pois ele possui produtos ativos associados. Desative ou exclua os produtos do contrato primeiro.",
        error: "Contrato possui produtos ativos"
      });
    }

    const result = await db.query(`
      DELETE FROM contratos WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Contrato não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Contrato removido com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao remover contrato:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function obterEstatisticasContratos(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos,
        COUNT(CASE WHEN status = 'inativo' THEN 1 END) as inativos,
        SUM(valor_total) as valor_total
      FROM contratos
    `);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao obter estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter estatísticas",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarContratosPorProduto(req: Request, res: Response) {
  try {
    const { termo } = req.query;

    if (!termo || typeof termo !== 'string' || termo.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Termo de busca deve ter pelo menos 2 caracteres"
      });
    }

    const result = await db.query(`
      SELECT DISTINCT
        c.id,
        c.numero,
        c.fornecedor_id,
        f.nome as fornecedor_nome,
        c.data_inicio,
        c.data_fim,
        c.valor_total,
        c.status,
        c.ativo,
        c.created_at,
        COALESCE(SUM(cp.quantidade_contratada * cp.preco_unitario), 0) as valor_total_contrato,
        STRING_AGG(DISTINCT p.nome, ', ') as produtos_encontrados
      FROM contratos c
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id AND cp.ativo = true
      LEFT JOIN produtos p ON cp.produto_id = p.id
      WHERE LOWER(p.nome) LIKE LOWER($1)
      GROUP BY c.id, f.nome
      ORDER BY c.numero
    `, [`%${termo.trim()}%`]);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      termo: termo.trim()
    });
  } catch (error) {
    console.error("❌ Erro ao buscar contratos por produto:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar contratos por produto",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}