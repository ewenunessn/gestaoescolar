import { Request, Response } from "express";
import db from "../../../database";
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
  BusinessError,
  validateRequired,
  handleDatabaseError
} from "../../../utils/errorHandler";

const STATUS_COMPRA = {
  pendente: { label: 'Pendente', color: 'warning' },
  recebido_parcial: { label: 'Recebido Parcial', color: 'info' },
  concluido: { label: 'Concluído', color: 'success' },
  suspenso: { label: 'Suspenso', color: 'secondary' },
  cancelado: { label: 'Cancelado', color: 'error' }
} as const;

export async function listarCompras(req: Request, res: Response) {
  try {
    const { status, contrato_id, escola_id, data_inicio, data_fim, page = 1, limit = 50 } = req.query;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereClause += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    if (contrato_id) {
      paramCount++;
      whereClause += ` AND p.contrato_id = $${paramCount}`;
      params.push(contrato_id);
    }

    if (escola_id) {
      paramCount++;
      whereClause += ` AND p.escola_id = $${paramCount}`;
      params.push(escola_id);
    }

    if (data_inicio) {
      paramCount++;
      whereClause += ` AND p.data_pedido >= $${paramCount}`;
      params.push(data_inicio);
    }

    if (data_fim) {
      paramCount++;
      whereClause += ` AND p.data_pedido <= $${paramCount}`;
      params.push(data_fim);
    }

    const offset = (Number(page) - 1) * Number(limit);
    paramCount++;
    const limitParam = `$${paramCount}`;
    paramCount++;
    const offsetParam = `$${paramCount}`;
    params.push(Number(limit), offset);

    const pedidosResult = await db.query(`
      SELECT
        p.*,
        u.nome as usuario_criacao_nome,
        ua.nome as usuario_aprovacao_nome,
        COUNT(DISTINCT pi.id) as total_itens,
        COALESCE(SUM(pi.quantidade), 0) as quantidade_total,
        COUNT(DISTINCT c.fornecedor_id) as total_fornecedores,
        STRING_AGG(DISTINCT f.nome, ', ') as fornecedores_nomes
      FROM pedidos p
      JOIN usuarios u ON p.usuario_criacao_id = u.id
      LEFT JOIN usuarios ua ON p.usuario_aprovacao_id = ua.id
      LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
      LEFT JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE ${whereClause}
      GROUP BY p.id, u.nome, ua.nome
      ORDER BY p.created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `, params);

    const totalResult = await db.query(`
      SELECT COUNT(*) as total
      FROM pedidos p
      WHERE ${whereClause}
    `, params.slice(0, -2));

    res.json({
      success: true,
      data: pedidosResult.rows,
      total: Number(totalResult.rows[0].total),
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(Number(totalResult.rows[0].total) / Number(limit))
    });

  } catch (error: any) {
    console.error('Erro ao listar compras:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar compras',
      error: error.message
    });
  }
}


export async function buscarCompra(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const compraResult = await db.query(`
      SELECT 
        p.*,
        u.nome as usuario_criacao_nome,
        ua.nome as usuario_aprovacao_nome
      FROM pedidos p
      JOIN usuarios u ON p.usuario_criacao_id = u.id
      LEFT JOIN usuarios ua ON p.usuario_aprovacao_id = ua.id
      WHERE p.id = $1
    `, [id]);

    if (compraResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Compra não encontrada"
      });
    }

    // Query sempre busca unidade do produto
    const itensQuery = `
      SELECT
        pi.*,
        p.nome as produto_nome,
        COALESCE(um.codigo, 'UN') as unidade,
        cp.quantidade_contratada,
        cp.preco_unitario as preco_contrato,
        COALESCE(cp.marca, '') as marca,
        c.numero as contrato_numero,
        c.id as contrato_id,
        f.nome as fornecedor_nome,
        f.cnpj as fornecedor_cnpj,
        f.id as fornecedor_id,
        (pi.quantidade * pi.preco_unitario) as valor_total,
        COALESCE(
          (SELECT SUM(cpm2.quantidade_disponivel)
           FROM contrato_produtos_modalidades cpm2
           WHERE cpm2.contrato_produto_id = cp.id AND cpm2.ativo = true),
          0
        ) as saldo_disponivel
      FROM pedido_itens pi
      LEFT JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      LEFT JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE pi.pedido_id = $1
      ORDER BY p.nome
    `;

    const itensResult = await db.query(itensQuery, [id]);

    const compra = {
      ...compraResult.rows[0],
      itens: itensResult.rows
    };

    res.json({
      success: true,
      data: compra
    });
  } catch (error) {
    console.error("❌ Erro ao buscar compra:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar compra",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarCompra(req: Request, res: Response) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const {
      observacoes,
      itens,
      salvar_como_rascunho,
      competencia_mes_ano
    } = req.body;

    const usuario_criacao_id = req.user?.id || 1;

    // Permitir criar compra vazia (será preenchida depois)
    const temItens = itens && Array.isArray(itens) && itens.length > 0;

    // Usar competência fornecida ou data atual
    const competencia = competencia_mes_ano || new Date().toISOString().substring(0, 7); // YYYY-MM
    const [ano, mes] = competencia.split('-');
    
    // Mapa de meses em português (3 letras maiúsculas)
    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const mesAbrev = meses[parseInt(mes) - 1];
    
    // Buscar o próximo número sequencial disponível para a competência
    const maxNumeroResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM LENGTH(numero) - 5) AS INTEGER)), 0) as max_sequencial
      FROM pedidos 
      WHERE competencia_mes_ano = $1
    `, [competencia]);

    const proximoSequencial = (parseInt(maxNumeroResult.rows[0].max_sequencial) + 1).toString().padStart(6, '0');
    const numero = `PED-${mesAbrev}${ano}${proximoSequencial}`;

    const status_inicial = salvar_como_rascunho ? 'pendente' : 'pendente';

    // Validar e calcular valor total em batch (evita N+1 queries)
    let valor_total = 0;
    const contratoProdutosMap = new Map<number, any>();
    if (temItens) {
      const cpIds = [...new Set((itens as any[]).map((i: any) => Number(i.contrato_produto_id)).filter(id => !isNaN(id)))];
      if (cpIds.length > 0) {
        const cpResult = await client.query(`
          SELECT cp.id, cp.preco_unitario, cp.produto_id, p.nome as produto_nome, c.status as contrato_status
          FROM contrato_produtos cp
          JOIN produtos p ON cp.produto_id = p.id
          JOIN contratos c ON cp.contrato_id = c.id
          WHERE cp.id = ANY($1::int[]) AND cp.ativo = true
        `, [cpIds]);
        for (const row of cpResult.rows) {
          contratoProdutosMap.set(Number(row.id), row);
        }
      }
      for (const item of itens) {
        const cpId = Number(item.contrato_produto_id);
        if (isNaN(cpId)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: `contrato_produto_id inválido` });
        }
        const cp = contratoProdutosMap.get(cpId);
        if (!cp) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: `Produto contrato_produto_id=${cpId} não encontrado ou inativo` });
        }
        if (cp.contrato_status !== 'ativo') {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: `Contrato do produto ${cp.produto_nome} não está ativo` });
        }
        const qtd = Number(item.quantidade);
        if (isNaN(qtd) || qtd <= 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: `Quantidade inválida para ${cp.produto_nome}` });
        }
        valor_total += qtd * cp.preco_unitario;
      }
    }

    const compraResult = await client.query(`
      INSERT INTO pedidos (
        numero, data_pedido, status, valor_total, observacoes, usuario_criacao_id, competencia_mes_ano
      )
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
      RETURNING *
    `, [numero, status_inicial, valor_total, observacoes, usuario_criacao_id, competencia]);

    const compra_id = compraResult.rows[0].id;

    // Inserir itens apenas se houver (usar dados já obtidos da validação acima)
    if (temItens && (itens as any[]).length > 0) {
      const values = (itens as any[]).map((item: any) => {
        const cp = contratoProdutosMap.get(Number(item.contrato_produto_id))!;
        const qtd = Number(item.quantidade || 0);
        return [
          compra_id, item.contrato_produto_id, cp.produto_id, qtd,
          cp.preco_unitario, qtd * cp.preco_unitario,
          item.data_entrega_prevista || null, item.observacoes || null
        ];
      });

      const placeholders = values.map((_, i) => {
        const base = i * 8 + 1;
        return `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
      }).join(', ');

      const params = values.flat();

      await client.query(`
        INSERT INTO pedido_itens (
          pedido_id, contrato_produto_id, produto_id, quantidade,
          preco_unitario, valor_total, data_entrega_prevista, observacoes
        ) VALUES ${placeholders}
      `, params);
    }

    await client.query('COMMIT');

    const compraCompletaResult = await db.query(`
      SELECT 
        p.*,
        u.nome as usuario_criacao_nome,
        COUNT(DISTINCT c.fornecedor_id) as total_fornecedores
      FROM pedidos p
      JOIN usuarios u ON p.usuario_criacao_id = u.id
      LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
      LEFT JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      LEFT JOIN contratos c ON cp.contrato_id = c.id
      WHERE p.id = $1
      GROUP BY p.id, u.nome
    `, [compra_id]);

    const mensagem = salvar_como_rascunho
      ? "Compra salva como rascunho com sucesso"
      : "Compra criada com sucesso";

    res.status(201).json({
      success: true,
      message: mensagem,
      data: compraCompletaResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erro ao criar compra:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar compra",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}

export async function atualizarCompra(req: Request, res: Response) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { observacoes, itens, competencia_mes_ano } = req.body;

    const pedidoResult = await client.query(`
      SELECT status FROM pedidos WHERE id = $1
    `, [id]);

    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }

    // Permitir edição em qualquer status
    // Remover restrição de apenas rascunho

    // Atualizar observações e competência se fornecidos
    let updateFields = ['updated_at = CURRENT_TIMESTAMP'];
    const updateValues: any[] = [];
    let paramCount = 0;

    if (observacoes !== undefined) {
      paramCount++;
      updateFields.push(`observacoes = $${paramCount}`);
      updateValues.push(observacoes);
    }

    if (competencia_mes_ano !== undefined) {
      paramCount++;
      updateFields.push(`competencia_mes_ano = $${paramCount}`);
      updateValues.push(competencia_mes_ano);
    }

    // Se houver itens, atualizar
    if (itens && Array.isArray(itens)) {
      // Buscar itens existentes
      const itensExistentesResult = await client.query(`
        SELECT id FROM pedido_itens WHERE pedido_id = $1
      `, [id]);

      const idsExistentes = new Set(itensExistentesResult.rows.map((item: any) => item.id));
      const idsRecebidos = new Set(itens.filter((i: any) => i.id).map((i: any) => i.id));

      // Identificar itens a remover (que existem no banco mas não foram enviados)
      const itensParaRemover = itensExistentesResult.rows.filter(
        (item: any) => !idsRecebidos.has(item.id)
      );

      // Remover apenas itens que não estão mais na lista
      for (const itemRemover of itensParaRemover) {
        await client.query(`DELETE FROM pedido_itens WHERE id = $1`, [itemRemover.id]);
      }

      // Validar contrato_produtos em batch (evita N+1)
      const cpIds = [...new Set((itens as any[]).map((i: any) => Number(i.contrato_produto_id)).filter(Boolean))];
      const cpMap = new Map<number, any>();
      if (cpIds.length > 0) {
        const cpResult = await client.query(`
          SELECT cp.id, cp.preco_unitario, cp.produto_id, p.nome as produto_nome, c.status as contrato_status
          FROM contrato_produtos cp
          JOIN produtos p ON cp.produto_id = p.id
          JOIN contratos c ON cp.contrato_id = c.id
          WHERE cp.id = ANY($1::int[]) AND cp.ativo = true
        `, [cpIds]);
        for (const row of cpResult.rows) {
          cpMap.set(Number(row.id), row);
        }
      }

      let valor_total = 0;
      const newItems: any[] = [];
      const updateItems: any[] = [];

      for (const item of itens) {
        const cpId = Number(item.contrato_produto_id);
        const cp = cpMap.get(cpId);
        if (!cp) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: `Produto contrato_produto_id=${cpId} não encontrado ou inativo` });
        }
        if (cp.contrato_status !== 'ativo') {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: `Contrato do produto ${cp.produto_nome} não está ativo` });
        }
        const qtd = Number(item.quantidade);
        if (isNaN(qtd) || qtd <= 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: `Quantidade inválida para ${cp.produto_nome}` });
        }

        const valor_item = qtd * cp.preco_unitario;
        valor_total += valor_item;

        const itemData = {
          pedido_id: id,
          contrato_produto_id: item.contrato_produto_id,
          produto_id: cp.produto_id,
          quantidade: qtd,
          preco_unitario: cp.preco_unitario,
          valor_total: valor_item,
          data_entrega_prevista: item.data_entrega_prevista || null,
          observacoes: item.observacoes || null
        };

        if (item.id && idsExistentes.has(item.id)) {
          updateItems.push({ ...itemData, item_id: item.id });
        } else {
          newItems.push(itemData);
        }
      }

      // Bulk UPDATE para itens existentes
      if (updateItems.length > 0) {
        const updatePlaceholders = updateItems.map((_, i) => {
          const base = i * 6 + 1;
          return `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
        }).join(', ');
        const updateParams = updateItems.flatMap(it => [
          it.quantidade, it.preco_unitario, it.valor_total,
          it.data_entrega_prevista, it.observacoes, it.item_id
        ]);
        await client.query(`
          UPDATE pedido_itens SET
            quantidade = T.quantidade,
            preco_unitario = T.preco_unitario,
            valor_total = T.valor_total,
            data_entrega_prevista = T.data_entrega_prevista,
            observacoes = T.observacoes
          FROM (VALUES ${updatePlaceholders}) AS T(quantidade, preco_unitario, valor_total, data_entrega_prevista, observacoes, id)
          WHERE pedido_itens.id = T.id
        `, updateParams);
      }

      // Bulk INSERT para novos itens
      if (newItems.length > 0) {
        const insertPlaceholders = newItems.map((_, i) => {
          const base = i * 8 + 1;
          return `($${base}, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
        }).join(', ');
        const insertParams = newItems.flatMap(it => [
          it.pedido_id, it.contrato_produto_id, it.produto_id, it.quantidade,
          it.preco_unitario, it.valor_total, it.data_entrega_prevista, it.observacoes
        ]);
        await client.query(`
          INSERT INTO pedido_itens (
            pedido_id, contrato_produto_id, produto_id, quantidade,
            preco_unitario, valor_total, data_entrega_prevista, observacoes
          ) VALUES ${insertPlaceholders}
        `, insertParams);
      }

      // Adicionar valor_total ao update
      paramCount++;
      updateFields.push(`valor_total = $${paramCount}`);
      updateValues.push(valor_total);
    }

    // Executar update se houver campos para atualizar
    if (updateFields.length > 1) { // Mais que apenas updated_at
      paramCount++;
      const query = `
        UPDATE pedidos
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      updateValues.push(id);

      const result = await client.query(query, updateValues);
      await client.query('COMMIT');

      res.json({
        success: true,
        message: "Pedido atualizado com sucesso",
        data: result.rows[0]
      });
    } else {
      await client.query('COMMIT');
      res.json({
        success: true,
        message: "Nenhuma alteração realizada"
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erro ao atualizar pedido:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}


export async function atualizarStatusCompra(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, motivo } = req.body;
    const usuario_id = req.user?.id || 1;

    const statusValidos = ['pendente', 'recebido_parcial', 'concluido', 'suspenso', 'cancelado'];

    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status inválido. Use: pendente, recebido_parcial, concluido, suspenso ou cancelado"
      });
    }

    const pedidoResult = await db.query(`
      SELECT status, numero FROM pedidos WHERE id = $1
    `, [id]);

    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }

    // Adicionar motivo às observações se fornecido
    let query = `
      UPDATE pedidos
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    const values: any[] = [status];
    let paramCount = 1;

    if (motivo) {
      paramCount++;
      const statusLabel = STATUS_COMPRA[status as keyof typeof STATUS_COMPRA]?.label || status;
      query += `, observacoes = COALESCE(observacoes, '') || '\\n[' || $` + paramCount + ` || ']: ' || $` + (paramCount + 1);
      values.push(statusLabel);
      paramCount++;
      values.push(motivo);
    }

    paramCount++;
    query += ` WHERE id = $` + paramCount + ` RETURNING *`;
    values.push(id);

    const result = await db.query(query, values);

    res.json({
      success: true,
      message: `Status alterado para ${STATUS_COMPRA[status as keyof typeof STATUS_COMPRA]?.label}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar status:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar status do pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}



export async function excluirCompra(req: Request, res: Response) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const pedidoResult = await client.query(`
      SELECT status, numero FROM pedidos WHERE id = $1
    `, [id]);

    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }

    const status = pedidoResult.rows[0].status;
    const numero = pedidoResult.rows[0].numero;

    // Permitir excluir pedidos em qualquer status

    // Excluir faturamentos relacionados
    // Primeiro, buscar os faturamentos_pedidos relacionados
    const faturamentosPedidosResult = await client.query(`
      SELECT id FROM faturamentos_pedidos WHERE pedido_id = $1
    `, [id]);

    // Deletar faturamentos_itens relacionados
    if (faturamentosPedidosResult.rows.length > 0) {
      const faturamentoPedidoIds = faturamentosPedidosResult.rows.map(r => r.id);
      await client.query(`
        DELETE FROM faturamentos_itens 
        WHERE faturamento_pedido_id = ANY($1)
      `, [faturamentoPedidoIds]);
    }

    // Deletar faturamentos_pedidos
    await client.query(`DELETE FROM faturamentos_pedidos WHERE pedido_id = $1`, [id]);
    
    // Deletar faturamentos
    await client.query(`DELETE FROM faturamentos WHERE pedido_id = $1`, [id]);

    // Excluir itens do pedido
    await client.query(`DELETE FROM pedido_itens WHERE pedido_id = $1`, [id]);

    // Excluir o pedido
    await client.query(`DELETE FROM pedidos WHERE id = $1`, [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Pedido ${numero} excluído com sucesso`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erro ao excluir pedido:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao excluir pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}


export async function obterEstatisticasCompras(req: Request, res: Response) {
  try {
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_pedidos,
        COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
        COUNT(*) FILTER (WHERE status = 'aprovado') as aprovados,
        COUNT(*) FILTER (WHERE status = 'em_separacao') as em_separacao,
        COUNT(*) FILTER (WHERE status = 'enviado') as enviados,
        COUNT(*) FILTER (WHERE status = 'entregue') as entregues,
        COUNT(*) FILTER (WHERE status = 'cancelado') as cancelados,
        COALESCE(SUM(valor_total), 0) as valor_total,
        COALESCE(SUM(valor_total) FILTER (WHERE status = 'aprovado'), 0) as valor_aprovado,
        COALESCE(SUM(valor_total) FILTER (WHERE status = 'entregue'), 0) as valor_entregue
      FROM pedidos
    `);

    const porMesResult = await db.query(`
      SELECT 
        DATE_TRUNC('month', data_pedido) as mes,
        COUNT(*) as total_pedidos,
        COALESCE(SUM(valor_total), 0) as valor_total
      FROM pedidos
      WHERE data_pedido >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', data_pedido)
      ORDER BY mes DESC
    `);

    const porEscolaResult = await db.query(`
      SELECT 
        e.nome as escola_nome,
        COUNT(p.id) as total_pedidos,
        COALESCE(SUM(p.valor_total), 0) as valor_total
      FROM escolas e
      LEFT JOIN pedidos p ON e.id = p.escola_id
      GROUP BY e.id, e.nome
      HAVING COUNT(p.id) > 0
      ORDER BY COUNT(p.id) DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        resumo: statsResult.rows[0],
        por_mes: porMesResult.rows,
        por_escola: porEscolaResult.rows
      }
    });
  } catch (error) {
    console.error("❌ Erro ao obter estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter estatísticas",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}


export async function listarProdutosContrato(req: Request, res: Response) {
  try {
    const { contrato_id } = req.params;

    // Query sempre busca unidade do produto
    const query = `
      SELECT
        cp.*,
        p.nome as produto_nome,
        COALESCE(um.codigo, 'UN') as unidade,
        p.descricao as produto_descricao,
        c.numero as contrato_numero,
        f.nome as fornecedor_nome,
        COALESCE(
          (SELECT SUM(cpm2.quantidade_disponivel)
           FROM contrato_produtos_modalidades cpm2
           WHERE cpm2.contrato_produto_id = cp.id AND cpm2.ativo = true),
          0
        ) as saldo_disponivel
      FROM contrato_produtos cp
      JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE cp.contrato_id = $1 AND cp.ativo = true AND c.status = 'ativo'
      ORDER BY p.nome
    `;

    const produtosResult = await db.query(query, [contrato_id]);

    res.json({
      success: true,
      data: produtosResult.rows
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos do contrato:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar produtos do contrato",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarTodosProdutosDisponiveis(req: Request, res: Response) {
  try {
    
    // Query sempre busca unidade do produto
    const query = `
      SELECT
        cp.id as contrato_produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        COALESCE(
          (SELECT SUM(cpm2.quantidade_disponivel)
           FROM contrato_produtos_modalidades cpm2
           WHERE cpm2.contrato_produto_id = cp.id AND cpm2.ativo = true),
          0
        ) as saldo_disponivel,
        p.id as produto_id,
        p.nome as produto_nome,
        COALESCE(um.codigo, 'UN') as unidade,
        p.descricao as produto_descricao,
        c.id as contrato_id,
        c.numero as contrato_numero,
        f.id as fornecedor_id,
        f.nome as fornecedor_nome,
        f.cnpj as fornecedor_cnpj
      FROM contrato_produtos cp
      JOIN produtos p ON cp.produto_id = p.id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE cp.ativo = true
        AND c.status = 'ativo'
      ORDER BY f.nome, p.nome
    `;

    const produtosResult = await db.query(query);

    if (produtosResult.rows.length > 0) {
    }

    res.json({
      success: true,
      data: produtosResult.rows
    });
  } catch (error) {
    console.error("❌ Erro ao listar produtos disponíveis:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar produtos disponíveis",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}


// Relatório: Resumo de compras por tipo de fornecedor em um pedido
export async function resumoTipoFornecedorCompra(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const resultado = await db.query(`
      SELECT * FROM vw_pedido_resumo_tipo_fornecedor
      WHERE pedido_id = $1
      ORDER BY tipo_fornecedor
    `, [id]);

    res.json({
      success: true,
      data: resultado.rows
    });
  } catch (error) {
    console.error('❌ Erro ao buscar resumo por tipo de fornecedor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar resumo por tipo de fornecedor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
