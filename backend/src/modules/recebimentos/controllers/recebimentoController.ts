import { Request, Response } from 'express';
import db from '../../../database';

// Listar pedidos pendentes e parciais (com itens agrupados por fornecedor)
export async function listarPedidosPendentes(req: Request, res: Response) {
  try {
    const pedidos = await db.query(`
      SELECT 
        p.id,
        p.numero,
        p.data_pedido,
        p.status,
        p.valor_total,
        p.competencia_mes_ano,
        COUNT(DISTINCT pi.id) as total_itens,
        COUNT(DISTINCT f.id) as total_fornecedores,
        COALESCE(SUM(r.quantidade_recebida * pi.preco_unitario), 0) as valor_recebido,
        COUNT(DISTINCT CASE 
          WHEN pi.quantidade <= COALESCE((
            SELECT SUM(quantidade_recebida) 
            FROM recebimentos 
            WHERE pedido_item_id = pi.id
          ), 0)
          THEN pi.id 
        END) as itens_completos
      FROM pedidos p
      JOIN pedido_itens pi ON p.id = pi.pedido_id
      JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN recebimentos r ON pi.id = r.pedido_item_id
      WHERE p.status IN ('pendente', 'recebido_parcial')
      GROUP BY p.id, p.numero, p.data_pedido, p.status, p.valor_total, p.competencia_mes_ano
      ORDER BY p.data_pedido DESC
    `);

    res.json({
      success: true,
      data: pedidos.rows
    });
  } catch (error) {
    console.error('❌ Erro ao listar pedidos pendentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar pedidos pendentes',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Listar pedidos concluídos
export async function listarPedidosConcluidos(req: Request, res: Response) {
  try {
    const pedidos = await db.query(`
      SELECT 
        p.id,
        p.numero,
        p.data_pedido,
        p.status,
        p.valor_total,
        p.competencia_mes_ano,
        COUNT(DISTINCT pi.id) as total_itens,
        COUNT(DISTINCT f.id) as total_fornecedores,
        COALESCE(SUM(r.quantidade_recebida * pi.preco_unitario), 0) as valor_recebido,
        MAX(r.data_recebimento) as data_conclusao,
        COUNT(DISTINCT CASE 
          WHEN pi.quantidade <= COALESCE((
            SELECT SUM(quantidade_recebida) 
            FROM recebimentos 
            WHERE pedido_item_id = pi.id
          ), 0)
          THEN pi.id 
        END) as itens_completos
      FROM pedidos p
      JOIN pedido_itens pi ON p.id = pi.pedido_id
      JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN recebimentos r ON pi.id = r.pedido_item_id
      WHERE p.status = 'concluido'
      GROUP BY p.id, p.numero, p.data_pedido, p.status, p.valor_total, p.competencia_mes_ano
      ORDER BY p.data_pedido DESC
      LIMIT 50
    `);

    res.json({
      success: true,
      data: pedidos.rows
    });
  } catch (error) {
    console.error('❌ Erro ao listar pedidos concluídos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar pedidos concluídos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Buscar fornecedores de um pedido
export async function listarFornecedoresPedido(req: Request, res: Response) {
  try {
    const { pedidoId } = req.params;

    const fornecedores = await db.query(`
      SELECT DISTINCT
        f.id,
        f.nome,
        f.cnpj,
        COUNT(DISTINCT pi.id) as total_itens,
        SUM(pi.valor_total) as valor_total,
        COALESCE(SUM(r.quantidade_recebida * pi.preco_unitario), 0) as valor_recebido,
        COUNT(DISTINCT r.id) as total_recebimentos,
        COUNT(DISTINCT CASE 
          WHEN pi.quantidade <= COALESCE((
            SELECT SUM(quantidade_recebida) 
            FROM recebimentos 
            WHERE pedido_item_id = pi.id
          ), 0)
          THEN pi.id 
        END) as itens_completos,
        COUNT(DISTINCT CASE 
          WHEN pi.data_entrega_prevista < CURRENT_DATE 
          AND pi.quantidade > COALESCE((
            SELECT SUM(quantidade_recebida) 
            FROM recebimentos 
            WHERE pedido_item_id = pi.id
          ), 0)
          THEN pi.id 
        END) as itens_atrasados
      FROM fornecedores f
      JOIN contratos c ON f.id = c.fornecedor_id
      JOIN contrato_produtos cp ON c.id = cp.contrato_id
      JOIN pedido_itens pi ON cp.id = pi.contrato_produto_id
      LEFT JOIN recebimentos r ON pi.id = r.pedido_item_id
      WHERE pi.pedido_id = $1
      GROUP BY f.id, f.nome, f.cnpj
      ORDER BY f.nome
    `, [pedidoId]);

    res.json({
      success: true,
      data: fornecedores.rows
    });
  } catch (error) {
    console.error('❌ Erro ao listar fornecedores:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar fornecedores do pedido',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Buscar itens de um fornecedor em um pedido
export async function listarItensFornecedor(req: Request, res: Response) {
  try {
    const { pedidoId, fornecedorId } = req.params;

    const itens = await db.query(`
      SELECT
        pi.id,
        pi.quantidade,
        pi.preco_unitario,
        pi.valor_total,
        pi.data_entrega_prevista,
        pi.observacoes,
        prod.id as produto_id,
        prod.nome as produto_nome,
        COALESCE(um.codigo, 'UN') as unidade,
        c.numero as contrato_numero,
        COALESCE(SUM(r.quantidade_recebida), 0) as quantidade_recebida,
        (pi.quantidade - COALESCE(SUM(r.quantidade_recebida), 0)) as saldo_pendente,
        COUNT(r.id) as total_recebimentos
      FROM pedido_itens pi
      JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
      JOIN produtos prod ON cp.produto_id = prod.id
      LEFT JOIN unidades_medida um ON prod.unidade_medida_id = um.id
      JOIN contratos c ON cp.contrato_id = c.id
      LEFT JOIN recebimentos r ON pi.id = r.pedido_item_id
      WHERE pi.pedido_id = $1 AND c.fornecedor_id = $2
      GROUP BY pi.id, pi.quantidade, pi.preco_unitario, pi.valor_total,
               pi.data_entrega_prevista, pi.observacoes, prod.id, prod.nome,
               um.codigo, c.numero
      ORDER BY pi.data_entrega_prevista ASC NULLS LAST, prod.nome
    `, [pedidoId, fornecedorId]);

    res.json({
      success: true,
      data: itens.rows
    });
  } catch (error) {
    console.error('❌ Erro ao listar itens:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar itens do fornecedor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Registrar recebimento
export async function registrarRecebimento(req: Request, res: Response) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { pedidoId, pedidoItemId, quantidadeRecebida, observacoes } = req.body;
    const usuarioId = req.user?.id || 1;

    // Validar quantidade
    if (!quantidadeRecebida || quantidadeRecebida <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantidade recebida deve ser maior que zero'
      });
    }

    // Buscar item do pedido
    const itemResult = await client.query(`
      SELECT pi.quantidade, COALESCE(SUM(r.quantidade_recebida), 0) as ja_recebido
      FROM pedido_itens pi
      LEFT JOIN recebimentos r ON pi.id = r.pedido_item_id
      WHERE pi.id = $1 AND pi.pedido_id = $2
      GROUP BY pi.id, pi.quantidade
    `, [pedidoItemId, pedidoId]);

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Item do pedido não encontrado'
      });
    }

    const item = itemResult.rows[0];
    const saldoPendente = parseFloat(item.quantidade) - parseFloat(item.ja_recebido);

    // Validar se quantidade não excede o saldo
    if (parseFloat(quantidadeRecebida) > saldoPendente) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Quantidade recebida (${quantidadeRecebida}) excede o saldo pendente (${saldoPendente})`
      });
    }

    // Inserir recebimento
    const recebimentoResult = await client.query(`
      INSERT INTO recebimentos (
        pedido_id, pedido_item_id, quantidade_recebida, 
        observacoes, usuario_id, data_recebimento
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `, [pedidoId, pedidoItemId, quantidadeRecebida, observacoes, usuarioId]);

    // Verificar se todos os itens do pedido foram recebidos completamente
    const statusCheck = await client.query(`
      SELECT 
        COUNT(DISTINCT pi.id) as total_itens,
        COUNT(DISTINCT CASE 
          WHEN pi.quantidade <= COALESCE((
            SELECT SUM(quantidade_recebida) 
            FROM recebimentos 
            WHERE pedido_item_id = pi.id
          ), 0)
          THEN pi.id 
        END) as itens_completos
      FROM pedido_itens pi
      WHERE pi.pedido_id = $1
    `, [pedidoId]);

    const { total_itens, itens_completos } = statusCheck.rows[0] || { total_itens: 0, itens_completos: 0 };
    let novoStatus = 'recebido_parcial';

    if (parseInt(itens_completos) === parseInt(total_itens)) {
      novoStatus = 'concluido';
    }

    // Atualizar status do pedido
    await client.query(`
      UPDATE pedidos 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [novoStatus, pedidoId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Recebimento registrado com sucesso',
      data: {
        recebimento: recebimentoResult.rows[0],
        pedido_status: novoStatus
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao registrar recebimento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar recebimento',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}

// Listar recebimentos de um item
export async function listarRecebimentosItem(req: Request, res: Response) {
  try {
    const { pedidoItemId } = req.params;

    const recebimentos = await db.query(`
      SELECT 
        r.*,
        u.nome as usuario_nome
      FROM recebimentos r
      JOIN usuarios u ON r.usuario_id = u.id
      WHERE r.pedido_item_id = $1
      ORDER BY r.data_recebimento DESC
    `, [pedidoItemId]);

    res.json({
      success: true,
      data: recebimentos.rows
    });
  } catch (error) {
    console.error('❌ Erro ao listar recebimentos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar recebimentos do item',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Histórico de recebimentos de um pedido
export async function historicoRecebimentosPedido(req: Request, res: Response) {
  try {
    const { pedidoId } = req.params;

    const historico = await db.query(`
      SELECT * FROM vw_recebimentos_detalhados
      WHERE pedido_id = $1
      ORDER BY data_recebimento DESC
    `, [pedidoId]);

    res.json({
      success: true,
      data: historico.rows
    });
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de recebimentos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
