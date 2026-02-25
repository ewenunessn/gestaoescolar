import { Request, Response } from 'express';
const db = require('../database');

/**
 * Controller para visualização de dados no painel admin
 */

// Obter estatísticas gerais do sistema
export async function getSystemStats(req: Request, res: Response) {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM institutions) as total_institutions,
        (SELECT COUNT(*) FROM escolas) as total_escolas,
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM produtos) as total_produtos,
        (SELECT COUNT(*) FROM contratos) as total_contratos,
        (SELECT COUNT(*) FROM pedidos) as total_pedidos,
        (SELECT COALESCE(SUM(quantidade_alunos), 0) FROM escola_modalidades) as total_alunos
    `);

    // Instituições por plano
    const institutionsByPlan = await db.query(`
      SELECT 
        p.name as plan_name,
        COUNT(i.id) as count
      FROM institutions i
      LEFT JOIN plans p ON i.plan_id = p.id
      GROUP BY p.name
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        ...stats.rows[0],
        institutions_by_plan: institutionsByPlan.rows
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas do sistema',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
