import { Request, Response } from 'express';
import db from '../../../database';
import { toNum } from '../../../utils/typeHelpers';

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
    await client.query(`
      UPDATE pedido_itens
      SET quantidade = (
        SELECT COALESCE(SUM(pipe.quantidade), 0)
        FROM pedido_item_programacoes pip
        JOIN pedido_item_programacao_escolas pipe ON pipe.programacao_id = pip.id
        WHERE pip.pedido_item_id = $1
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
