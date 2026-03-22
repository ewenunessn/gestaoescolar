import db from '../database';

interface CriarNotificacaoOpts {
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
  /** IDs dos usuários que devem receber. Se omitido, envia para todos os admins. */
  usuarioIds?: number[];
}

/** Cria notificações para usuários específicos ou para todos os admins */
export async function criarNotificacao(opts: CriarNotificacaoOpts): Promise<void> {
  try {
    let ids = opts.usuarioIds;
    if (!ids || ids.length === 0) {
      const admins = await db.query(`SELECT id FROM usuarios WHERE tipo = 'admin' AND ativo = true`);
      ids = admins.rows.map((r: any) => r.id);
    }
    if (!ids || ids.length === 0) return;

    for (const uid of ids) {
      await db.query(
        `INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES ($1,$2,$3,$4,$5)`,
        [uid, opts.tipo, opts.titulo, opts.mensagem, opts.link ?? null]
      );
    }
  } catch (err) {
    console.error('[notificacoes] Erro ao criar notificação:', err);
  }
}
