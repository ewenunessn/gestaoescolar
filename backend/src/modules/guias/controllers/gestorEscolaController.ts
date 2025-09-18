// Controller para autenticação de gestores de escola
import { Request, Response } from "express";
const db = require("../../../database");

export async function listarEscolas(req: Request, res: Response) {
  try {
    const result = await db.query(`
      SELECT 
        id,
        nome,
        endereco,
        telefone,
        email
      FROM escolas 
      WHERE ativo = true 
      ORDER BY nome
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error("❌ Erro ao listar escolas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar escolas",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function autenticarGestor(req: Request, res: Response) {
  try {
    const { escola_id, codigo_acesso } = req.body;

    if (!escola_id || !codigo_acesso) {
      return res.status(400).json({
        success: false,
        message: "Escola e código de acesso são obrigatórios"
      });
    }

    const result = await db.query(`
      SELECT 
        id,
        nome,
        endereco,
        telefone,
        email,
        codigo_acesso
      FROM escolas 
      WHERE id = $1 AND codigo_acesso = $2 AND ativo = true
    `, [escola_id, codigo_acesso]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Código de acesso inválido para esta escola"
      });
    }

    const escola = result.rows[0];

    // Remover o código de acesso da resposta por segurança
    delete escola.codigo_acesso;

    res.json({
      success: true,
      message: "Acesso autorizado",
      data: {
        escola,
        token: `gestor_${escola.id}_${Date.now()}` // Token simples para sessão
      }
    });
  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function verificarAcesso(req: Request, res: Response) {
  try {
    const { escola_id } = req.params;
    const { codigo_acesso } = req.query;

    if (!codigo_acesso) {
      return res.status(400).json({
        success: false,
        message: "Código de acesso é obrigatório"
      });
    }

    const result = await db.query(`
      SELECT 
        id,
        nome
      FROM escolas 
      WHERE id = $1 AND codigo_acesso = $2 AND ativo = true
    `, [escola_id, codigo_acesso]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Acesso negado"
      });
    }

    res.json({
      success: true,
      message: "Acesso válido",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro na verificação:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
}