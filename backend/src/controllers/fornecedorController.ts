// Controller de fornecedores para PostgreSQL - SIMPLIFICADO
import { Request, Response } from "express";
const db = require("../database");

export async function listarFornecedores(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        f.id,
        f.nome,
        f.cnpj,
        f.email,
        f.telefone,
        f.endereco,
        f.cidade,
        f.estado,
        f.cep,
        f.ativo,
        f.created_at
      FROM fornecedores f
      ORDER BY f.nome
    `);

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
      SELECT * FROM fornecedores WHERE id = $1
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
      telefone,
      endereco,
      cidade,
      estado,
      cep,
      contato,
      ativo = true
    } = req.body;

    const result = await db.query(`
      INSERT INTO fornecedores (
        nome, cnpj, email, telefone, endereco, cidade, estado, cep, contato, ativo, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      RETURNING *
    `, [nome, cnpj, email, telefone, endereco, cidade, estado, cep, contato, ativo]);

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
      telefone,
      endereco,
      cidade,
      estado,
      cep,
      contato,
      ativo
    } = req.body;

    const result = await db.query(`
      UPDATE fornecedores SET
        nome = $1,
        cnpj = $2,
        email = $3,
        telefone = $4,
        endereco = $5,
        cidade = $6,
        estado = $7,
        cep = $8,
        contato = $9,
        ativo = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [nome, cnpj, email, telefone, endereco, cidade, estado, cep, contato, ativo, id]);

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

export async function verificarRelacionamentosFornecedor(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se o fornecedor existe
    const fornecedorResult = await db.query(`
      SELECT nome FROM fornecedores WHERE id = $1
    `, [id]);

    if (fornecedorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fornecedor não encontrado"
      });
    }

    const fornecedorNome = fornecedorResult.rows[0].nome;

    // Buscar contratos relacionados
    const contratosResult = await db.query(`
      SELECT 
        c.id,
        c.numero,
        c.data_inicio,
        c.data_fim,
        c.valor_total,
        c.status,
        COUNT(cp.id) as total_produtos
      FROM contratos c
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id
      WHERE c.fornecedor_id = $1
      GROUP BY c.id, c.numero, c.data_inicio, c.data_fim, c.valor_total, c.status
      ORDER BY c.data_inicio DESC
    `, [id]);

    const contratos = contratosResult.rows;
    const totalContratos = contratos.length;
    const contratosAtivos = contratos.filter(c => c.status === 'ativo' || c.status === 'ATIVO').length;
    const podeExcluir = contratosAtivos === 0;

    res.json({
      success: true,
      data: {
        fornecedor: fornecedorNome,
        totalContratos,
        contratosAtivos,
        podeExcluir,
        contratos: contratos.map(c => ({
          id: c.id,
          numero: c.numero,
          dataInicio: c.data_inicio,
          dataFim: c.data_fim,
          valorTotal: parseFloat(c.valor_total || 0),
          status: c.status?.toLowerCase() || 'indefinido',
          totalProdutos: parseInt(c.total_produtos || 0)
        }))
      }
    });
  } catch (error) {
    console.error("❌ Erro ao verificar relacionamentos do fornecedor:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao verificar relacionamentos do fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function removerFornecedor(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Verificar se há contratos ativos antes de excluir
    const contratosAtivos = await db.query(`
      SELECT COUNT(*) as total 
      FROM contratos 
      WHERE fornecedor_id = $1 AND (status = 'ativo' OR status = 'ATIVO')
    `, [id]);

    if (parseInt(contratosAtivos.rows[0].total) > 0) {
      return res.status(400).json({
        success: false,
        message: "Não é possível excluir fornecedor com contratos ativos"
      });
    }

    const result = await db.query(`
      DELETE FROM fornecedores WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Fornecedor não encontrado"
      });
    }

    res.json({
      success: true,
      message: "Fornecedor removido com sucesso"
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