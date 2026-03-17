import db from '../database';

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
