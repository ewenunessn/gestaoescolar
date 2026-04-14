import { Request, Response } from 'express';
import db from '../../../database';
import { asyncHandler } from '../../../utils/errorHandler';
import { cacheService } from '../../../utils/cacheService';

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const cached = await cacheService.get('dashboard:stats');
  if (cached) return res.json(cached);

  const [escolas, alunos, solicitacoes] = await Promise.all([
    db.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE ativo = true) as ativas FROM escolas`),
    db.query(`
      SELECT COALESCE(SUM(em.quantidade_alunos), 0) as total 
      FROM escola_modalidades em
      INNER JOIN escolas e ON em.escola_id = e.id
      WHERE e.ativo = true
    `),
    db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('concluida','parcial')) as atendidas
      FROM solicitacoes
    `),
  ]);

  const response = {
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
  };
  await cacheService.set('dashboard:stats', response, cacheService.TTL.stats);
  res.json(response);
});
