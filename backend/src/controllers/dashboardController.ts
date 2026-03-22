import { Request, Response } from 'express';
import db from '../database';
import { asyncHandler } from '../utils/errorHandler';

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const [escolas, alunos, solicitacoes] = await Promise.all([
    db.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE ativo = true) as ativas FROM escolas`),
    db.query(`SELECT COALESCE(SUM(quantidade_alunos), 0) as total FROM escola_modalidades`),
    db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('concluida','parcial')) as atendidas
      FROM solicitacoes
    `),
  ]);

  res.json({
    success: true,
    data: {
      escolas: {
        total: Number(escolas.rows[0].total),
        ativas: Number(escolas.rows[0].ativas),
      },
      alunos: Number(alunos.rows[0].total),
      solicitacoes: {
        total: Number(solicitacoes.rows[0].total),
        atendidas: Number(solicitacoes.rows[0].atendidas),
      },
    },
  });
});
