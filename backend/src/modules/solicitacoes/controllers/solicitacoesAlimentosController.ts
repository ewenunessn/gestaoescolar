import { Request, Response } from 'express';
import db from '../../../database';
import { asyncHandler, ValidationError } from '../../../utils/errorHandler';
import { criarNotificacao } from '../../../utils/notificacoesHelper';
import solicitacaoEmergencialService from '../services/SolicitacaoEmergencialService';
import { publishRealtimeEvent } from '../../../services/realtimeEvents';

// ── helpers ───────────────────────────────────────────────────────────────────

async function getSolicitacaoComItens(id: number) {
  const sol = await db.query(`
    SELECT s.*, e.nome as escola_nome, u.nome as respondido_por_nome
    FROM solicitacoes s
    LEFT JOIN escolas e ON s.escola_id = e.id
    LEFT JOIN usuarios u ON s.respondido_por = u.id
    WHERE s.id = $1
  `, [id]);
  if (sol.rows.length === 0) return null;

  const itens = await db.query(`
    SELECT i.*, u.nome as respondido_por_nome
    FROM solicitacoes_itens i
    LEFT JOIN usuarios u ON i.respondido_por = u.id
    WHERE i.solicitacao_id = $1
    ORDER BY i.id
  `, [id]);

  return { ...sol.rows[0], itens: itens.rows };
}

function publicarSolicitacaoAlterada(
  action: string,
  solicitacao: { id?: unknown; escola_id?: unknown; status?: unknown } | null | undefined,
) {
  if (!solicitacao?.id) return;

  publishRealtimeEvent({
    domain: 'solicitacoes_alimentos',
    action,
    entityId: Number(solicitacao.id),
    escolaId: solicitacao.escola_id ? Number(solicitacao.escola_id) : undefined,
    payload: {
      status: typeof solicitacao.status === 'string' ? solicitacao.status : null,
    },
  });
}

export function canRespondToSolicitacaoStatus(status: string | null | undefined): boolean {
  return status === 'pendente' || status === 'parcial';
}

async function recalcularStatusSolicitacao(solicitacaoId: number, respondidoPor: number) {
  const itens = await db.query(
    'SELECT status FROM solicitacoes_itens WHERE solicitacao_id = $1',
    [solicitacaoId]
  );
  const todos = itens.rows;
  const pendentes = todos.filter((i: any) => i.status === 'pendente').length;
  const aceitos   = todos.filter((i: any) => i.status === 'aceito' || i.status === 'contemplado').length;
  const recusados = todos.filter((i: any) => i.status === 'recusado').length;

  let novoStatus: string;
  if (pendentes > 0) {
    novoStatus = aceitos > 0 || recusados > 0 ? 'parcial' : 'pendente';
  } else if (aceitos > 0 && recusados > 0) {
    novoStatus = 'parcial';
  } else if (aceitos > 0) {
    novoStatus = 'concluida';
  } else {
    novoStatus = 'cancelada';
  }

  await db.query(
    `UPDATE solicitacoes SET status = $1, respondido_por = $2, respondido_em = NOW(), updated_at = NOW() WHERE id = $3`,
    [novoStatus, respondidoPor, solicitacaoId]
  );
}

// ── PORTAL DA ESCOLA ──────────────────────────────────────────────────────────

export const listarMinhasSolicitacoes = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user.escola_id) throw new ValidationError('Usuário não está associado a uma escola');

  const sols = await db.query(`
    SELECT s.*, e.nome as escola_nome
    FROM solicitacoes s
    LEFT JOIN escolas e ON s.escola_id = e.id
    WHERE s.escola_id = $1
    ORDER BY s.created_at DESC
  `, [user.escola_id]);

  const ids = sols.rows.map((s: any) => s.id);
  let itensMap: Record<number, any[]> = {};
  if (ids.length > 0) {
    const itens = await db.query(
      `SELECT * FROM solicitacoes_itens WHERE solicitacao_id = ANY($1) ORDER BY id`,
      [ids]
    );
    for (const item of itens.rows) {
      if (!itensMap[item.solicitacao_id]) itensMap[item.solicitacao_id] = [];
      itensMap[item.solicitacao_id].push(item);
    }
  }

  const data = sols.rows.map((s: any) => ({ 
    ...s, 
    itens: itensMap[s.id] || [],
    total_itens: (itensMap[s.id] || []).length
  }));
  res.json({ success: true, data });
});

export const criarSolicitacao = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user.escola_id) throw new ValidationError('Usuário não está associado a uma escola');

  const { observacao, itens } = req.body;

  if (!Array.isArray(itens) || itens.length === 0)
    throw new ValidationError('Informe ao menos um item');

  for (const item of itens) {
    if (!item.nome_produto?.trim()) throw new ValidationError('Nome do produto é obrigatório em todos os itens');
    if (!item.quantidade || Number(item.quantidade) <= 0) throw new ValidationError('Quantidade inválida');
    if (!item.unidade?.trim()) throw new ValidationError('Unidade é obrigatória em todos os itens');
  }

  const sol = await db.query(
    `INSERT INTO solicitacoes (escola_id, observacao) VALUES ($1, $2) RETURNING *`,
    [user.escola_id, observacao || null]
  );
  const solId = sol.rows[0].id;

  for (const item of itens) {
    await db.query(
      `INSERT INTO solicitacoes_itens (solicitacao_id, produto_id, nome_produto, quantidade, unidade)
       VALUES ($1, $2, $3, $4, $5)`,
      [solId, item.produto_id || null, item.nome_produto.trim(), Number(item.quantidade), item.unidade.trim()]
    );
  }

  const resultado = await getSolicitacaoComItens(solId);

  const escola = await db.query('SELECT nome FROM escolas WHERE id = $1', [user.escola_id]);
  const escolaNome = escola.rows[0]?.nome ?? 'Escola';
  await criarNotificacao({
    tipo: 'solicitacao_alimentos',
    titulo: 'Nova solicitação de alimentos',
    mensagem: `${escolaNome} enviou uma solicitação com ${itens.length} item(s).`,
    link: '/solicitacoes-alimentos',
  });

  publicarSolicitacaoAlterada('created', resultado);
  res.status(201).json({ success: true, data: resultado });
});

export const cancelarSolicitacao = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user.escola_id) throw new ValidationError('Usuário não está associado a uma escola');

  const { id } = req.params;
  const sol = await db.query(
    'SELECT * FROM solicitacoes WHERE id = $1 AND escola_id = $2',
    [id, user.escola_id]
  );
  if (sol.rows.length === 0) throw new ValidationError('Solicitação não encontrada');
  if (sol.rows[0].status !== 'pendente') throw new ValidationError('Só é possível cancelar solicitações pendentes');

  await db.query('UPDATE solicitacoes SET status = $1, updated_at = NOW() WHERE id = $2', ['cancelada', id]);
  publicarSolicitacaoAlterada('cancelled', { ...sol.rows[0], status: 'cancelada' });
  res.json({ success: true });
});

// ── MÓDULO PRINCIPAL ──────────────────────────────────────────────────────────

export const listarTodasSolicitacoes = asyncHandler(async (req: Request, res: Response) => {
  const { status, escola_id } = req.query;

  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (status) { conditions.push(`s.status = $${idx++}`); params.push(status); }
  if (escola_id) { conditions.push(`s.escola_id = $${idx++}`); params.push(escola_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sols = await db.query(`
    SELECT s.*, e.nome as escola_nome, u.nome as respondido_por_nome
    FROM solicitacoes s
    LEFT JOIN escolas e ON s.escola_id = e.id
    LEFT JOIN usuarios u ON s.respondido_por = u.id
    ${where}
    ORDER BY CASE s.status WHEN 'pendente' THEN 0 WHEN 'parcial' THEN 1 ELSE 2 END, s.created_at DESC
  `, params);

  const ids = sols.rows.map((s: any) => s.id);
  let itensMap: Record<number, any[]> = {};
  if (ids.length > 0) {
    const itens = await db.query(
      `SELECT i.*, u.nome as respondido_por_nome
       FROM solicitacoes_itens i
       LEFT JOIN usuarios u ON i.respondido_por = u.id
       WHERE i.solicitacao_id = ANY($1) ORDER BY i.id`,
      [ids]
    );
    for (const item of itens.rows) {
      if (!itensMap[item.solicitacao_id]) itensMap[item.solicitacao_id] = [];
      itensMap[item.solicitacao_id].push(item);
    }
  }

  const data = sols.rows.map((s: any) => ({ ...s, itens: itensMap[s.id] || [] }));
  res.json({ success: true, data });
});

/** Aceita um item individual */
export const aceitarItem = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const { itemId } = req.params;

  const result = await db.query(`
    UPDATE solicitacoes_itens i
    SET status = 'aceito', respondido_por = $1, respondido_em = NOW()
    FROM solicitacoes s
    WHERE i.solicitacao_id = s.id
      AND i.id = $2
      AND i.status = 'pendente'
      AND s.status IN ('pendente', 'parcial')
    RETURNING i.*
  `, [user.id, itemId]);

  if (result.rows.length === 0) throw new ValidationError('Item não encontrado ou já respondido');

  await recalcularStatusSolicitacao(result.rows[0].solicitacao_id, user.id);
  const sol = await getSolicitacaoComItens(result.rows[0].solicitacao_id);
  publicarSolicitacaoAlterada('updated', sol);
  res.json({ success: true, data: sol });
});

export const analisarItem = asyncHandler(async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const analise = await solicitacaoEmergencialService.analisarItem(Number(itemId));
  res.json({ success: true, data: analise });
});

export const aprovarItemEmergencial = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const { itemId } = req.params;
  const sol = await db.query(`
    SELECT s.status
    FROM solicitacoes_itens i
    INNER JOIN solicitacoes s ON s.id = i.solicitacao_id
    WHERE i.id = $1
  `, [itemId]);

  if (sol.rows.length === 0) throw new ValidationError('Item nao encontrado');
  if (!canRespondToSolicitacaoStatus(sol.rows[0].status)) {
    throw new ValidationError('Nao e possivel responder uma solicitacao cancelada ou concluida');
  }

  const resultado = await solicitacaoEmergencialService.aprovarItemEmergencial(
    Number(itemId),
    {
      quantidade_aprovada: req.body.quantidade_aprovada !== undefined
        ? Number(req.body.quantidade_aprovada)
        : undefined,
      data_entrega_prevista: req.body.data_entrega_prevista,
      observacao: req.body.observacao || null,
    },
    Number(user.id),
  );
  publicarSolicitacaoAlterada('updated', {
    id: resultado.analise.item.solicitacao_id,
    escola_id: resultado.analise.item.escola_id,
  });
  res.json({ success: true, data: resultado });
});

/** Aceita todos os itens pendentes de uma solicitação */
export const aprovarTudo = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  const sol = await db.query('SELECT id, status FROM solicitacoes WHERE id = $1', [id]);
  if (sol.rows.length === 0) throw new ValidationError('Solicitação não encontrada');

  if (!canRespondToSolicitacaoStatus(sol.rows[0].status)) {
    throw new ValidationError('Nao e possivel aprovar uma solicitacao cancelada ou concluida');
  }

  await db.query(`
    UPDATE solicitacoes_itens
    SET status = 'aceito', respondido_por = $1, respondido_em = NOW()
    WHERE solicitacao_id = $2 AND status = 'pendente'
  `, [user.id, id]);

  await recalcularStatusSolicitacao(Number(id), user.id);
  const resultado = await getSolicitacaoComItens(Number(id));
  publicarSolicitacaoAlterada('updated', resultado);
  res.json({ success: true, data: resultado });
});

/** Recusa um item individual com justificativa */
export const recusarItem = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  const { itemId } = req.params;
  const { justificativa } = req.body;

  if (!justificativa?.trim()) throw new ValidationError('Justificativa é obrigatória para recusar');

  const result = await db.query(`
    UPDATE solicitacoes_itens i
    SET status = 'recusado', justificativa_recusa = $1, respondido_por = $2, respondido_em = NOW()
    FROM solicitacoes s
    WHERE i.solicitacao_id = s.id
      AND i.id = $3
      AND i.status = 'pendente'
      AND s.status IN ('pendente', 'parcial')
    RETURNING i.*
  `, [justificativa.trim(), user.id, itemId]);

  if (result.rows.length === 0) throw new ValidationError('Item não encontrado ou já respondido');

  await recalcularStatusSolicitacao(result.rows[0].solicitacao_id, user.id);
  const sol = await getSolicitacaoComItens(result.rows[0].solicitacao_id);
  publicarSolicitacaoAlterada('updated', sol);
  res.json({ success: true, data: sol });
});
