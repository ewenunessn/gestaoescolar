import db from "../../../database";

export interface EscolasDashboardResumo {
  total: number;
  ativas: number;
  alunos: number;
}

export async function getEscolasDashboardResumo(): Promise<EscolasDashboardResumo> {
  const [escolas, alunos] = await Promise.all([
    db.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE ativo = true) as ativas FROM escolas"),
    db.query(`
      SELECT COALESCE(SUM(em.quantidade_alunos), 0) as total
      FROM escola_modalidades em
      INNER JOIN escolas e ON em.escola_id = e.id
      WHERE e.ativo = true
    `),
  ]);

  return {
    total: Number(escolas.rows[0].total),
    ativas: Number(escolas.rows[0].ativas),
    alunos: Number(alunos.rows[0].total),
  };
}
