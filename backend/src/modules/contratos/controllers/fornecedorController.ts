// Controller de fornecedores para PostgreSQL - SIMPLIFICADO
import { Request, Response } from "express";
import db from "../../../database";

export async function listarFornecedores(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        f.id,
        f.nome,
        f.cnpj,
        f.email,
        f.ativo,
        f.tipo_fornecedor,
        f.created_at
      FROM fornecedores f
      ORDER BY f.nome
    `);

    // Desabilitar cache no Vercel
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar fornecedores:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar fornecedores",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarFornecedor(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        f.id,
        f.nome,
        f.cnpj,
        f.email,
        f.endereco,
        f.ativo,
        f.tipo_fornecedor,
        f.created_at,
        f.updated_at
      FROM fornecedores f
      WHERE f.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fornecedor não encontrado"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao buscar fornecedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarFornecedor(req: Request, res: Response) {
  try {
    const {
      nome,
      cnpj,
      email,
      ativo = true,
      tipo_fornecedor = 'CONVENCIONAL',
      dap_caf,
      data_validade_dap
    } = req.body;

    const result = await db.query(`
      INSERT INTO fornecedores (
        nome, cnpj, email, ativo, tipo_fornecedor, dap_caf, data_validade_dap, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nome, cnpj, email || null, ativo, tipo_fornecedor, dap_caf || null, data_validade_dap || null]);

    res.json({
      success: true,
      message: "Fornecedor criado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao criar fornecedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function editarFornecedor(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      nome,
      cnpj,
      email,
      ativo,
      tipo_fornecedor,
      dap_caf,
      data_validade_dap
    } = req.body;

    const result = await db.query(`
      UPDATE fornecedores SET
        nome = $1,
        cnpj = $2,
        email = $3,
        ativo = $4,
        tipo_fornecedor = $5,
        dap_caf = $6,
        data_validade_dap = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [nome, cnpj, email || null, ativo, tipo_fornecedor, dap_caf || null, data_validade_dap || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fornecedor não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Fornecedor atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao editar fornecedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao editar fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerFornecedor(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await db.query(`
      DELETE FROM fornecedores WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fornecedor não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Fornecedor removido com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao remover fornecedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function verificarRelacionamentosFornecedor(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Buscar informações do fornecedor
    const fornecedorResult = await db.query(`
      SELECT nome FROM fornecedores WHERE id = $1
    `, [id]);

    if (fornecedorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fornecedor não encontrado"
      });
    }

    // Contar contratos ativos
    const contratosAtivosResult = await db.query(`
      SELECT COUNT(*) as total FROM contratos WHERE fornecedor_id = $1 AND ativo = true
    `, [id]);

    // Contar todos os contratos
    const todosContratosResult = await db.query(`
      SELECT COUNT(*) as total FROM contratos WHERE fornecedor_id = $1
    `, [id]);

    // Buscar detalhes dos contratos (máximo 10)
    const contratosDetalhes = await db.query(`
      SELECT 
        c.id,
        c.numero,
        c.status,
        c.ativo,
        c.data_inicio as "dataInicio",
        c.data_fim as "dataFim",
        c.valor_total as "valorTotal",
        COUNT(cp.id) as "totalProdutos"
      FROM contratos c
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id
      WHERE c.fornecedor_id = $1
      GROUP BY c.id
      ORDER BY c.ativo DESC, c.created_at DESC
      LIMIT 10
    `, [id]);

    const contratosAtivos = parseInt(contratosAtivosResult.rows[0].total);
    const totalContratos = parseInt(todosContratosResult.rows[0].total);
    const podeExcluir = contratosAtivos === 0;

    res.json({
      success: true,
      data: {
        fornecedor: fornecedorResult.rows[0].nome,
        podeExcluir,
        totalContratos,
        contratosAtivos,
        contratos: contratosDetalhes.rows
      }
    });
  } catch (error) {
    console.error("❌ Erro ao verificar relacionamentos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao verificar relacionamentos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}