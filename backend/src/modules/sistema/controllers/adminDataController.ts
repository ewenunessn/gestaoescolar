import { Request, Response } from 'express';
import db from '../../../database';

export async function getSystemStats(req: Request, res: Response) {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM instituicoes) as total_instituicoes,
        (SELECT COUNT(*) FROM escolas) as total_escolas,
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM produtos) as total_produtos,
        (SELECT COUNT(*) FROM contratos) as total_contratos,
        (SELECT COUNT(*) FROM pedidos) as total_pedidos,
        (SELECT COALESCE(SUM(em.quantidade_alunos), 0)
         FROM escola_modalidades em
         INNER JOIN escolas e ON em.escola_id = e.id
         WHERE e.ativo = true) as total_alunos
    `);

    const instituicoesPorStatus = await db.query(`
      SELECT
        CASE WHEN ativo = true THEN 'Ativa' ELSE 'Inativa' END as plan_name,
        COUNT(*) as count
      FROM instituicoes
      GROUP BY ativo
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        ...stats.rows[0],
        instituicoes_por_status: instituicoesPorStatus.rows,
      },
    });
  } catch (error) {
    console.error('Erro ao obter estatisticas do sistema:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatisticas do sistema',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
