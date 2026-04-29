import { Request, Response } from 'express';
import db from '../../../database';
import { toNum } from '../../../utils/typeHelpers';
import { publishRealtimeEvent } from '../../../services/realtimeEvents';

function publicarProgramacaoCompraAlterada(action: string, pedidoId: number | string, pedidoItemId?: number | string) {
  publishRealtimeEvent({
    domain: 'compras',
    action,
    entityId: Number(pedidoId),
    payload: {
      pedido_item_id: pedidoItemId !== undefined ? Number(pedidoItemId) : undefined,
    },
  });
}

// ─── Listar programações de um item ──────────────────────────────────────────
export async function listarProgramacoes(req: Request, res: Response) {
  const { pedido_item_id } = req.params;
  try {
    const result = await db.query(`
      SELECT
        pip.id,
        pip.pedido_item_id,
        pip.data_entrega,
        pip.observacoes,
        pip.created_at,
        COALESCE(SUM(pipe.quantidade), 0) AS quantidade_total,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', pipe.id,
            'escola_id', pipe.escola_id,
            'escola_nome', e.nome,
            'quantidade', pipe.quantidade
          ) ORDER BY e.nome
        ) FILTER (WHERE pipe.id IS NOT NULL) AS escolas
      FROM pedido_item_programacoes pip
      LEFT JOIN pedido_item_programacao_escolas pipe ON pipe.programacao_id = pip.id
      LEFT JOIN escolas e ON e.id = pipe.escola_id
      WHERE pip.pedido_item_id = $1
      GROUP BY pip.id
      ORDER BY pip.data_entrega
    `, [pedido_item_id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erro ao listar programações:', error);
    res.status(500).json({ success: false, message: 'Erro ao listar programações' });
  }
}

// ─── Salvar programações (upsert completo) ────────────────────────────────────
// Body: { programacoes: [{ id?, data_entrega, observacoes, escolas: [{ escola_id, quantidade }] }] }
export async function salvarProgramacoes(req: Request, res: Response) {
  const { pedido_item_id } = req.params;
  const { programacoes } = req.body as {
    programacoes: {
      id?: number;
      data_entrega: string;
      observacoes?: string;
      escolas: { escola_id: number; quantidade: number }[];
    }[];
  };

  if (!Array.isArray(programacoes)) {
    return res.status(400).json({ success: false, message: 'programacoes deve ser um array' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const pedidoResult = await client.query(
      'SELECT pedido_id FROM pedido_itens WHERE id = $1',
      [pedido_item_id],
    );
    const pedidoId = pedidoResult.rows[0]?.pedido_id;

    // Remover programações que não estão mais na lista
    const idsEnviados = programacoes.filter(p => p.id).map(p => p.id);
    if (idsEnviados.length > 0) {
      await client.query(`
        DELETE FROM pedido_item_programacoes
        WHERE pedido_item_id = $1 AND id != ALL($2)
      `, [pedido_item_id, idsEnviados]);
    } else {
      await client.query(`DELETE FROM pedido_item_programacoes WHERE pedido_item_id = $1`, [pedido_item_id]);
    }

    for (const prog of programacoes) {
      let prog_id: number;

      if (prog.id) {
        // Atualizar existente
        await client.query(`
          UPDATE pedido_item_programacoes
          SET data_entrega = $1, observacoes = $2, updated_at = NOW()
          WHERE id = $3
        `, [prog.data_entrega, prog.observacoes || null, prog.id]);
        prog_id = prog.id;
      } else {
        // Inserir nova
        const ins = await client.query(`
          INSERT INTO pedido_item_programacoes (pedido_item_id, data_entrega, observacoes)
          VALUES ($1, $2, $3) RETURNING id
        `, [pedido_item_id, prog.data_entrega, prog.observacoes || null]);
        prog_id = ins.rows[0].id;
      }

      // Substituir escolas da programação
      await client.query(`DELETE FROM pedido_item_programacao_escolas WHERE programacao_id = $1`, [prog_id]);
      for (const esc of prog.escolas) {
        if (toNum(esc.quantidade) > 0) {
          await client.query(`
            INSERT INTO pedido_item_programacao_escolas (programacao_id, escola_id, quantidade)
            VALUES ($1, $2, $3)
          `, [prog_id, esc.escola_id, esc.quantidade]);
        }
      }
    }

    // Recalcular quantidade total do item = soma de todas as escolas em todas as programações
    // e sincronizar data_entrega_prevista com a menor data das programações
    await client.query(`
      UPDATE pedido_itens
      SET quantidade = (
        SELECT COALESCE(SUM(pipe.quantidade), 0)
        FROM pedido_item_programacoes pip
        JOIN pedido_item_programacao_escolas pipe ON pipe.programacao_id = pip.id
        WHERE pip.pedido_item_id = $1
      ),
      data_entrega_prevista = (
        SELECT MIN(data_entrega)
        FROM pedido_item_programacoes
        WHERE pedido_item_id = $1
      ),
      updated_at = NOW()
      WHERE id = $1
    `, [pedido_item_id]);

    // Recalcular valor_total do item
    await client.query(`
      UPDATE pedido_itens
      SET valor_total = quantidade * preco_unitario,
          updated_at = NOW()
      WHERE id = $1
    `, [pedido_item_id]);

    // Recalcular valor_total do pedido
    await client.query(`
      UPDATE pedidos
      SET valor_total = (
        SELECT COALESCE(SUM(valor_total), 0) FROM pedido_itens WHERE pedido_id = (
          SELECT pedido_id FROM pedido_itens WHERE id = $1
        )
      ),
      updated_at = NOW()
      WHERE id = (SELECT pedido_id FROM pedido_itens WHERE id = $1)
    `, [pedido_item_id]);

    await client.query('COMMIT');

    if (pedidoId) {
      publicarProgramacaoCompraAlterada('programacao_updated', pedidoId, pedido_item_id);
    }

    // Retornar programações atualizadas
    const updated = await db.query(`
      SELECT
        pip.id, pip.pedido_item_id, pip.data_entrega, pip.observacoes,
        COALESCE(SUM(pipe.quantidade), 0) AS quantidade_total,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', pipe.id,
            'escola_id', pipe.escola_id,
            'escola_nome', e.nome,
            'quantidade', pipe.quantidade
          ) ORDER BY e.nome
        ) FILTER (WHERE pipe.id IS NOT NULL) AS escolas
      FROM pedido_item_programacoes pip
      LEFT JOIN pedido_item_programacao_escolas pipe ON pipe.programacao_id = pip.id
      LEFT JOIN escolas e ON e.id = pipe.escola_id
      WHERE pip.pedido_item_id = $1
      GROUP BY pip.id ORDER BY pip.data_entrega
    `, [pedido_item_id]);

    res.json({ success: true, data: updated.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao salvar programações:', error);
    res.status(500).json({ success: false, message: 'Erro ao salvar programações' });
  } finally {
    client.release();
  }
}

// ─── Mesclar itens do mesmo produto em um único item ─────────────────────────
// Body: { item_ids: number[] } — o primeiro da lista é o item destino
export async function mesclarItens(req: Request, res: Response) {
  const { item_ids } = req.body as { item_ids: number[] };

  if (!Array.isArray(item_ids) || item_ids.length < 2) {
    return res.status(400).json({ success: false, message: 'Informe ao menos 2 itens para mesclar' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que todos pertencem ao mesmo pedido e mesmo produto
    const check = await client.query(`
      SELECT produto_id, pedido_id, COUNT(*) as total
      FROM pedido_itens WHERE id = ANY($1)
      GROUP BY produto_id, pedido_id
    `, [item_ids]);

    if (check.rows.length !== 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Todos os itens devem ser do mesmo produto e pedido' });
    }

    const pedidoId = check.rows[0].pedido_id;
    const destino_id = item_ids[0];
    const todos_ids = item_ids;

    // Coletar quantidades por escola de todos os itens
    const escolasResult = await client.query(`
      SELECT pipe.escola_id, SUM(pipe.quantidade) as quantidade_total
      FROM pedido_item_programacoes pip
      JOIN pedido_item_programacao_escolas pipe ON pipe.programacao_id = pip.id
      WHERE pip.pedido_item_id = ANY($1)
      GROUP BY pipe.escola_id
    `, [todos_ids]);

    // Menor data de entrega
    const dataResult = await client.query(`
      SELECT MIN(data_entrega) as data_min
      FROM pedido_item_programacoes WHERE pedido_item_id = ANY($1)
    `, [todos_ids]);
    const dataEntrega = dataResult.rows[0].data_min;

    // Remover todas as programações de todos os itens do grupo
    await client.query(`DELETE FROM pedido_item_programacoes WHERE pedido_item_id = ANY($1)`, [todos_ids]);

    // Deletar os itens secundários
    await client.query(`DELETE FROM pedido_itens WHERE id = ANY($1)`, [item_ids.slice(1)]);

    // Criar uma única programação no item destino
    const progResult = await client.query(`
      INSERT INTO pedido_item_programacoes (pedido_item_id, data_entrega, observacoes)
      VALUES ($1, $2, 'Itens mesclados') RETURNING id
    `, [destino_id, dataEntrega]);
    const prog_id = progResult.rows[0].id;

    // Inserir escolas consolidadas
    for (const row of escolasResult.rows) {
      if (toNum(row.quantidade_total) > 0) {
        await client.query(`
          INSERT INTO pedido_item_programacao_escolas (programacao_id, escola_id, quantidade)
          VALUES ($1, $2, $3)
        `, [prog_id, row.escola_id, row.quantidade_total]);
      }
    }

    // Recalcular quantidade e valor do item destino
    await client.query(`
      UPDATE pedido_itens
      SET quantidade = (
        SELECT COALESCE(SUM(pipe.quantidade), 0)
        FROM pedido_item_programacoes pip
        JOIN pedido_item_programacao_escolas pipe ON pipe.programacao_id = pip.id
        WHERE pip.pedido_item_id = $1
      ),
      data_entrega_prevista = $2,
      updated_at = NOW()
      WHERE id = $1
    `, [destino_id, dataEntrega]);

    await client.query(`
      UPDATE pedido_itens SET valor_total = quantidade * preco_unitario, updated_at = NOW() WHERE id = $1
    `, [destino_id]);

    // Recalcular valor total do pedido
    await client.query(`
      UPDATE pedidos
      SET valor_total = (SELECT COALESCE(SUM(valor_total), 0) FROM pedido_itens WHERE pedido_id = (
        SELECT pedido_id FROM pedido_itens WHERE id = $1
      )), updated_at = NOW()
      WHERE id = (SELECT pedido_id FROM pedido_itens WHERE id = $1)
    `, [destino_id]);

    await client.query('COMMIT');
    publicarProgramacaoCompraAlterada('itens_merged', pedidoId, destino_id);
    res.json({ success: true, item_destino_id: destino_id });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao mesclar itens:', error);
    res.status(500).json({ success: false, message: 'Erro ao mesclar itens' });
  } finally {
    client.release();
  }
}
