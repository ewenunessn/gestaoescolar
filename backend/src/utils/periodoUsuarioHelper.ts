import db from '../database';

export interface PeriodoContexto {
  id: number;
  ano: number;
  descricao?: string | null;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  fechado: boolean;
  ocultar_dados?: boolean;
}

/**
 * Obtém o período do usuário ou período ativo global
 * @param userId ID do usuário autenticado
 * @returns ID do período ou null
 */
export async function obterPeriodoUsuario(userId?: number): Promise<number | null> {
  let periodoId: number | null = null;
  
  // Se usuário está logado, verificar se tem período selecionado
  if (userId) {
    const usuarioPeriodo = await db.query(
      'SELECT periodo_selecionado_id FROM usuarios WHERE id = $1',
      [userId]
    );
    
    if (usuarioPeriodo.rows.length > 0 && usuarioPeriodo.rows[0].periodo_selecionado_id) {
      periodoId = usuarioPeriodo.rows[0].periodo_selecionado_id;
    }
  }
  
  // Se não tem período do usuário, usar período ativo global
  if (!periodoId) {
    const periodoAtivo = await db.query('SELECT id FROM periodos WHERE ativo = true LIMIT 1');
    if (periodoAtivo.rows.length > 0) {
      periodoId = periodoAtivo.rows[0].id;
    }
  }
  
  return periodoId;
}

/**
 * Retorna o contexto completo do periodo selecionado pelo usuario.
 * Se o usuario nao tiver selecao propria, usa o periodo ativo global.
 */
export async function obterPeriodoContexto(userId?: number): Promise<PeriodoContexto | null> {
  const periodoId = await obterPeriodoUsuario(userId);

  if (!periodoId) {
    return null;
  }

  const periodo = await db.query(
    `SELECT id, ano, descricao, data_inicio, data_fim, ativo, fechado, ocultar_dados
     FROM periodos
     WHERE id = $1
     LIMIT 1`,
    [periodoId]
  );

  return periodo.rows[0] ?? null;
}

export function isPeriodoFechado(periodo: Pick<PeriodoContexto, 'fechado'> | null | undefined): boolean {
  return Boolean(periodo?.fechado);
}
