import { Request, Response } from 'express';
import db from '../database';
import { asyncHandler, ValidationError, NotFoundError } from '../utils/errorHandler';

// ── Listar disparos ──────────────────────────────────────────────────────────
export const listarDisparos = asyncHandler(async (req: Request, res: Response) => {
  const result = await db.query(`
    SELECT d.*,
           u.nome as criado_por_nome,
           m.nome as modalidade_nome
    FROM disparos_notificacao d
    LEFT JOIN usuarios u ON d.criado_por = u.id
    LEFT JOIN modalidades m ON d.modalidade_id = m.id
    ORDER BY d.created_at DESC
    LIMIT 100
  `);
  res.json({ success: true, data: result.rows });
});

// ── Criar disparo ────────────────────────────────────────────────────────────
export const criarDisparo = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { titulo, mensagem, link, tipo = 'info', alvo, modalidade_id, escola_ids, agendado_para } = req.body;

  if (!titulo || !mensagem) throw new ValidationError('titulo e mensagem são obrigatórios');
  if (!['todas', 'modalidade', 'selecao'].includes(alvo)) throw new ValidationError('alvo inválido');
  if (alvo === 'modalidade' && !modalidade_id) throw new ValidationError('modalidade_id obrigatório para alvo=modalidade');
  if (alvo === 'selecao' && (!escola_ids || !escola_ids.length)) throw new ValidationError('escola_ids obrigatório para alvo=selecao');

  const result = await db.query(`
    INSERT INTO disparos_notificacao
      (titulo, mensagem, link, tipo, alvo, modalidade_id, escola_ids, agendado_para, criado_por)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
  `, [titulo, mensagem, link || null, tipo, alvo, modalidade_id || null,
      escola_ids || null, agendado_para || null, user.id]);

  const disparo = result.rows[0];

  // Disparo imediato: processar agora
  if (!agendado_para) {
    await processarDisparo(disparo.id);
    const updated = await db.query('SELECT * FROM disparos_notificacao WHERE id = $1', [disparo.id]);
    return res.status(201).json({ success: true, data: updated.rows[0], message: 'Notificações enviadas com sucesso' });
  }

  res.status(201).json({ success: true, data: disparo, message: 'Disparo agendado com sucesso' });
});

// ── Cancelar disparo agendado ────────────────────────────────────────────────
export const cancelarDisparo = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await db.query(
    `UPDATE disparos_notificacao SET status = 'cancelado' WHERE id = $1 AND status = 'pendente' RETURNING id`,
    [id]
  );
  if (result.rowCount === 0) throw new ValidationError('Disparo não encontrado ou não pode ser cancelado');
  res.json({ success: true, message: 'Disparo cancelado' });
});

// ── Processar agendados (chamado pelo job) ───────────────────────────────────
export const processarAgendados = asyncHandler(async (req: Request, res: Response) => {
  const pendentes = await db.query(`
    SELECT id FROM disparos_notificacao
    WHERE status = 'pendente'
      AND agendado_para IS NOT NULL
      AND agendado_para <= NOW()
  `);

  const resultados: any[] = [];
  for (const row of pendentes.rows) {
    const r = await processarDisparo(row.id);
    resultados.push(r);
  }

  res.json({ success: true, processados: resultados.length, data: resultados });
});

// ── Lógica interna de envio ──────────────────────────────────────────────────
async function processarDisparo(disparoId: number) {
  // Marcar como processando
  await db.query(`UPDATE disparos_notificacao SET status = 'processando' WHERE id = $1`, [disparoId]);

  try {
    const { rows: [d] } = await db.query('SELECT * FROM disparos_notificacao WHERE id = $1', [disparoId]);
    if (!d) throw new Error('Disparo não encontrado');

    // Resolver lista de usuários alvo (usuários vinculados a escolas)
    let usuarioIds: number[] = [];

    if (d.alvo === 'todas') {
      const r = await db.query(`SELECT id FROM usuarios WHERE escola_id IS NOT NULL AND ativo = true`);
      usuarioIds = r.rows.map((u: any) => u.id);
    } else if (d.alvo === 'modalidade' && d.modalidade_id) {
      // Usuários de escolas que têm alunos nessa modalidade
      const r = await db.query(`
        SELECT DISTINCT u.id
        FROM usuarios u
        JOIN escolas e ON u.escola_id = e.id
        JOIN escola_modalidades em ON em.escola_id = e.id
        WHERE em.modalidade_id = $1 AND u.ativo = true AND u.escola_id IS NOT NULL
      `, [d.modalidade_id]);
      usuarioIds = r.rows.map((u: any) => u.id);
    } else if (d.alvo === 'selecao' && d.escola_ids?.length) {
      const r = await db.query(
        `SELECT id FROM usuarios WHERE escola_id = ANY($1) AND ativo = true`,
        [d.escola_ids]
      );
      usuarioIds = r.rows.map((u: any) => u.id);
    }

    // Inserir notificações em batch
    let total = 0;
    for (const uid of usuarioIds) {
      await db.query(
        `INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, link) VALUES ($1,$2,$3,$4,$5)`,
        [uid, d.tipo, d.titulo, d.mensagem, d.link]
      );
      total++;
    }

    await db.query(`
      UPDATE disparos_notificacao
      SET status = 'enviado', total_enviado = $1, enviado_at = NOW()
      WHERE id = $2
    `, [total, disparoId]);

    return { id: disparoId, total_enviado: total, status: 'enviado' };
  } catch (err: any) {
    await db.query(`
      UPDATE disparos_notificacao SET status = 'erro', erro_msg = $1 WHERE id = $2
    `, [err.message, disparoId]);
    return { id: disparoId, status: 'erro', erro: err.message };
  }
}
