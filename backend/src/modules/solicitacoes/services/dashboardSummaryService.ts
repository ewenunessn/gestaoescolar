import db from "../../../database";

export interface SolicitacoesDashboardResumo {
  total: number;
  atendidas: number;
}

export async function getSolicitacoesDashboardResumo(): Promise<SolicitacoesDashboardResumo> {
  const result = await db.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status IN ('concluida','parcial')) as atendidas
    FROM solicitacoes
  `);

  return {
    total: Number(result.rows[0].total),
    atendidas: Number(result.rows[0].atendidas),
  };
}
