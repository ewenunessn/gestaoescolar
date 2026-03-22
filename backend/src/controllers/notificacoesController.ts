import { Request, Response } from 'express';
import db from '../database';
import { asyncHandler, ValidationError } from '../utils/errorHandler';

export const listarNotificacoes = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { apenas_nao_lidas } = req.query;

  const where = apenas_nao_lidas === 'true' ? 'AND lida = false' : '';
  const rows = await db.query(
    `SELECT * FROM notificacoes WHERE usuario_id = $1 ${where} ORDER BY created_at DESC LIMIT 50`,
    [user.id]
  );
  const naoLidas = await db.query(
    `SELECT COUNT(*) as total FROM notificacoes WHERE usuario_id = $1 AND lida = false`,
    [user.id]
  );

  res.json({ success: true, data: rows.rows, nao_lidas: Number(naoLidas.rows[0].total) });
});

export const marcarLida = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  await db.query(`UPDATE notificacoes SET lida = true WHERE id = $1 AND usuario_id = $2`, [id, user.id]);
  res.json({ success: true });
});

export const marcarTodasLidas = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  await db.query(`UPDATE notificacoes SET lida = true WHERE usuario_id = $1 AND lida = false`, [user.id]);
  res.json({ success: true });
});

export const deletarNotificacao = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { id } = req.params;
  const result = await db.query(`DELETE FROM notificacoes WHERE id = $1 AND usuario_id = $2`, [id, user.id]);
  if (result.rowCount === 0) throw new ValidationError('Notificação não encontrada');
  res.json({ success: true });
});
