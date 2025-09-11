import { Request, Response } from "express";
const db = require("../database");

// Função auxiliar para formatar quantidades removendo zeros desnecessários
function formatarQuantidade(quantidade: number): string {
  return parseFloat(quantidade.toFixed(3)).toString();
}

// Inicializar sistema (compatibilidade)
export async function initRecebimentoSimplificado(req: Request, res: Response) {
  try {
    res.json({
      success: true,
      message: "Sistema de recebimento já inicializado com PostgreSQL"
    });
  } catch (error) {
    console.error("❌ Erro ao inicializar recebimento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao inicializar sistema de recebimento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Listar pedidos pendentes de recebimento
export async function listarPedidosPendentes(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10, busca } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    let whereClause = "WHERE pm.status IN ('CONFIRMADO')";
    const params: any[] = [];
    
    if (busca) {
      params.push(`%${busca}%`);
      whereClause += ` AND (pm.numero_pedido ILIKE $${params.length} OR pm.observacoes ILIKE $${params.length})`;
    }
    
    // Buscar pedidos pendentes
    params.push(parseInt(limit as string));
    params.push(offset);
    
    const pedidos = await db.query(`
      WITH pedido_stats AS (
        SELECT 
          pm.id,
          pm.numero_pedido,
          pm.status,
          pm.valor_total,
          pm.created_at as data_criacao,
          COUNT(DISTINCT pi.id) as total_itens,
          COUNT(DISTINCT pf.fornecedor_id) as total_fornecedores,
          COUNT(DISTINCT CASE WHEN recebimentos.total_recebido > 0 THEN pf.fornecedor_id END) as fornecedores_faturados,
          COALESCE(SUM(pi.quantidade * COALESCE(pi.preco_unitario, 0)), 0) as valor_total_pedido,
          COALESCE(SUM(recebimentos.total_recebido * COALESCE(pi.preco_unitario, 0)), 0) as valor_total_recebido,
          COALESCE(SUM(DISTINCT pi.quantidade), 0) as quantidade_total,
          COALESCE(SUM(recebimentos.total_recebido), 0) as quantidade_recebida_total
        FROM pedidos pm
        LEFT JOIN pedidos_fornecedores pf ON pm.id = pf.pedido_id
        LEFT JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
        LEFT JOIN (
          SELECT pedido_item_id, SUM(COALESCE(quantidade_recebida, 0)) as total_recebido
          FROM recebimento_itens_controle
          GROUP BY pedido_item_id
        ) recebimentos ON pi.id = recebimentos.pedido_item_id
        ${whereClause}
        GROUP BY pm.id, pm.numero_pedido, pm.status, pm.valor_total, pm.created_at
      )
      SELECT *,
        CASE
          WHEN valor_total_pedido > 0
          THEN LEAST((valor_total_recebido * 100.0 / valor_total_pedido), 100.0)
          ELSE 0
        END AS percentual_recebido
      FROM pedido_stats
      WHERE (
        valor_total_pedido = 0 OR 
        (valor_total_recebido * 100.0 / valor_total_pedido) < 100.0
      )
      ORDER BY data_criacao DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    
    // Contar total
    const countParams = params.slice(0, -2); // Remove limit e offset
    const totalResult = await db.query(`
      SELECT COUNT(DISTINCT pm.id) as total
      FROM pedidos pm
      
      ${whereClause.replace(/LIMIT.*$/, '')}
    `, countParams);
    
    const total = parseInt(totalResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit as string));
    
    res.json({
      success: true,
      data: pedidos.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages,
        hasNext: parseInt(page as string) < totalPages,
        hasPrev: parseInt(page as string) > 1
      }
    });
  } catch (error) {
    console.error("❌ Erro ao listar pedidos pendentes:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar pedidos pendentes",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Listar pedidos recebidos
export async function listarPedidosRecebidos(req: Request, res: Response) {
  try {
    const { page = 1, limit = 50, busca } = req.query;
    
    // Primeiro, contar o total de pedidos que atendem aos critérios
    const countQuery = await db.query(`
      WITH stats AS (
        SELECT
          p.id AS pedido_id,
          COALESCE(SUM(pi.quantidade * COALESCE(pi.preco_unitario, 0)), 0) AS valor_total_pedido,
          COALESCE(SUM(recebimentos_agrupados.total_recebido * COALESCE(pi.preco_unitario, 0)), 0) AS valor_total_recebido
        FROM
          pedidos p
        INNER JOIN pedidos_fornecedores pf ON p.id = pf.pedido_id
        INNER JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
        LEFT JOIN (
          SELECT 
            pedido_item_id,
            SUM(COALESCE(quantidade_recebida, 0)) as total_recebido
          FROM recebimento_itens_controle 
          GROUP BY pedido_item_id
        ) recebimentos_agrupados ON pi.id = recebimentos_agrupados.pedido_item_id
        WHERE p.status = 'CONFIRMADO'
        GROUP BY p.id
        HAVING
          COALESCE(SUM(recebimentos_agrupados.total_recebido), 0) > 0
          AND COALESCE(SUM(pi.quantidade * COALESCE(pi.preco_unitario, 0)), 0) > 0
          AND (COALESCE(SUM(recebimentos_agrupados.total_recebido * COALESCE(pi.preco_unitario, 0)), 0) * 100.0 / COALESCE(SUM(pi.quantidade * COALESCE(pi.preco_unitario, 0)), 1)) >= 100.0
      )
      SELECT COUNT(*) as total FROM stats
    `);
    
    const total = parseInt(countQuery.rows[0]?.total || 0);
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Buscar pedidos que tiveram recebimento completo
    const pedidos = await db.query(`
      WITH stats AS (
        SELECT
          p.id AS pedido_id,
          STRING_AGG(DISTINCT f.nome, ', ') AS fornecedor_nome,
          COUNT(DISTINCT f.id) AS total_fornecedores,
          COUNT(DISTINCT pi.id) AS total_itens,
          COUNT(DISTINCT CASE WHEN recebimentos_agrupados.total_recebido > 0 THEN pi.id END) AS total_recebimentos,
          COALESCE(SUM(pi.quantidade * COALESCE(pi.preco_unitario, 0)), 0) AS valor_total_pedido,
          COALESCE(SUM(recebimentos_agrupados.total_recebido * COALESCE(pi.preco_unitario, 0)), 0) AS valor_total_recebido
        FROM
          pedidos p
        INNER JOIN pedidos_fornecedores pf ON p.id = pf.pedido_id
        INNER JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
        LEFT JOIN (
          SELECT 
            pedido_item_id,
            SUM(COALESCE(quantidade_recebida, 0)) as total_recebido
          FROM recebimento_itens_controle 
          GROUP BY pedido_item_id
        ) recebimentos_agrupados ON pi.id = recebimentos_agrupados.pedido_item_id
        LEFT JOIN fornecedores f ON pf.fornecedor_id = f.id
        WHERE p.status = 'CONFIRMADO'
        GROUP BY p.id
        HAVING
          COALESCE(SUM(recebimentos_agrupados.total_recebido), 0) > 0
          AND COALESCE(SUM(pi.quantidade * COALESCE(pi.preco_unitario, 0)), 0) > 0
          AND (COALESCE(SUM(recebimentos_agrupados.total_recebido * COALESCE(pi.preco_unitario, 0)), 0) * 100.0 / COALESCE(SUM(pi.quantidade * COALESCE(pi.preco_unitario, 0)), 1)) >= 100.0
      )
      SELECT
        pm.id,
        pm.numero_pedido,
        pm.status AS status_pedido,
        pm.created_at as data_criacao,
        pm.valor_total,
        stats.fornecedor_nome,
        stats.total_fornecedores,
        pm.created_at AS data_ultimo_recebimento,
        stats.total_itens,
        stats.total_recebimentos,
        stats.valor_total_pedido,
        stats.valor_total_recebido,
        CASE
          WHEN stats.valor_total_pedido > 0
          THEN LEAST((stats.valor_total_recebido * 100.0 / stats.valor_total_pedido), 100.0)
          ELSE 0
        END AS percentual_recebido
      FROM
        pedidos pm
      JOIN stats ON pm.id = stats.pedido_id
      ${busca ? `WHERE (pm.numero_pedido ILIKE '%${busca}%' OR stats.fornecedor_nome ILIKE '%${busca}%')` : ''}
      ORDER BY
         pm.created_at DESC
      LIMIT ${parseInt(limit as string)} OFFSET ${offset}
    `);
    
    // Determinar status baseado no percentual recebido
    const pedidosComStatus = pedidos.rows.map((pedido: any) => {
      let status = 'PARCIAL';
      
      if ((pedido.percentual_recebido || 0) >= 100) {
        status = 'RECEBIDO';
      }
      
      // Se já foi faturado, manter esse status
      if (pedido.status_pedido === 'FATURADO') {
        status = 'FINALIZADO';
      }

      return {
        ...pedido,
        status,
        valor_total_pedido: parseFloat(pedido.valor_total_pedido || 0),
        valor_total_recebido: parseFloat(pedido.valor_total_recebido || 0),
        percentual_recebido: parseFloat(pedido.percentual_recebido || 0)
      };
    });
    
    const totalPages = Math.ceil(total / parseInt(limit as string));
    
    res.json({
      success: true,
      data: pedidosComStatus,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages,
        hasNext: parseInt(page as string) < totalPages,
        hasPrev: parseInt(page as string) > 1
      }
    });
  } catch (error) {
    console.error("❌ Erro ao listar pedidos recebidos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar pedidos recebidos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Listar itens de um pedido para recebimento
export async function listarItensRecebimento(req: Request, res: Response) {
  try {
    const { pedido_id } = req.params;
    
    // Validar se pedido_id foi fornecido
    if (!pedido_id || pedido_id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: "ID do pedido é obrigatório"
      });
    }
    
    // Verificar se o pedido existe
    const pedidoExiste = await db.query(`
      SELECT id FROM pedidos WHERE id = $1
    `, [pedido_id]);
    
    if (pedidoExiste.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }
    
    // Buscar itens do pedido
    const itens = await db.query(`
      SELECT 
        pi.id,
        pf.pedido_id,
        pi.produto_id,
        COALESCE(pi.quantidade, 0) as quantidade_esperada,
        COALESCE(SUM(rs.quantidade_recebida), 0) as quantidade_recebida,
        CASE 
          WHEN COALESCE(SUM(rs.quantidade_recebida), 0) >= pi.quantidade THEN 'RECEBIDO'
          WHEN COALESCE(SUM(rs.quantidade_recebida), 0) > 0 THEN 'PARCIAL'
          ELSE 'PENDENTE'
        END as status,
        pi.created_at,
        p.nome as nome_produto,
        p.unidade as unidade,
        pf.fornecedor_id as fornecedor_id,
        f.nome as nome_fornecedor,

      FROM pedidos_itens pi
      LEFT JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
      LEFT JOIN pedidos pm ON pf.pedido_id = pm.id
      LEFT JOIN produtos p ON pi.produto_id = p.id
      LEFT JOIN recebimento_itens_controle rs ON pi.id = rs.pedido_item_id

      LEFT JOIN fornecedores f ON pf.fornecedor_id = f.id
      WHERE pf.pedido_id = $1
      GROUP BY pi.id, pf.pedido_id, pi.produto_id, pi.quantidade, pi.created_at, p.nome, p.unidade, pf.fornecedor_id, f.nome
      ORDER BY COALESCE(f.nome, 'ZZZ'), p.nome
    `, [pedido_id]);
    
    // Mapear itens para o formato esperado pelo frontend
    const itensFormatados = itens.rows.map((item: any) => ({
      id: item.id,
      pedido_item_id: item.id, // Mesmo ID para compatibilidade
      produto_id: item.produto_id,
      fornecedor_id: item.fornecedor_id || 0,
      quantidade_esperada: parseFloat(item.quantidade_esperada || 0),
      quantidade_recebida: parseFloat(item.quantidade_recebida || 0),
      status: item.status || 'PENDENTE',
      nome_produto: item.nome_produto || 'Produto não identificado',
      unidade: item.unidade || 'UN',
      nome_fornecedor: item.nome_fornecedor || 'Fornecedor não identificado',

    }));
    
    // Calcular estatísticas
    const totalItens = itensFormatados.length;
    const itensPendentes = itensFormatados.filter((item: any) => item.status === 'PENDENTE').length;
    const itensParciais = itensFormatados.filter((item: any) => item.status === 'PARCIAL').length;
    const itensCompletos = itensFormatados.filter((item: any) => item.status === 'RECEBIDO').length;
    const itensExcedentes = itensFormatados.filter((item: any) => item.quantidade_recebida > item.quantidade_esperada).length;
    
    const totalEsperado = itensFormatados.reduce((sum: number, item: any) => sum + item.quantidade_esperada, 0);
    const totalRecebido = itensFormatados.reduce((sum: number, item: any) => sum + item.quantidade_recebida, 0);
    const percentualCompleto = totalEsperado > 0 ? Math.round((totalRecebido / totalEsperado) * 100) : 0;
    
    const estatisticas = {
      total_itens: totalItens,
      itens_pendentes: itensPendentes,
      itens_parciais: itensParciais,
      itens_recebidos: itensCompletos,
      itens_excedentes: itensExcedentes,
      percentual_recebido: percentualCompleto,
      quantidade_total: totalEsperado,
      quantidade_recebida: totalRecebido,
      total_fornecedores: new Set(itensFormatados.map((item: any) => item.fornecedor_id)).size,

    };
    
    res.json({
      success: true,
      data: {
        itens: itensFormatados,
        estatisticas: estatisticas
      }
    });
  } catch (error) {
    console.error("❌ Erro ao listar itens para recebimento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar itens para recebimento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Registrar recebimento de um item
export async function receberItem(req: Request, res: Response) {
  try {
    const { pedido_item_id } = req.params;
    const { quantidade, numero_lote, data_validade, observacoes } = req.body;
    
    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantidade deve ser maior que zero"
      });
    }
    
    // Buscar item do pedido com informações do contrato
    const item = await db.query(`
      SELECT pi.*, pf.pedido_id, pi.contrato_id, pi.produto_id, pi.preco_unitario
      FROM pedidos_itens pi
      JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
      JOIN pedidos pm ON pf.pedido_id = pm.id
      WHERE pi.id = $1
    `, [pedido_item_id]);
    
    if (item.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item do pedido não encontrado"
      });
    }
    
    const itemData = item.rows[0];
    
    // Verificar quantidade já recebida para este item
    const quantidadeJaRecebida = await db.query(`
      SELECT COALESCE(quantidade_recebida, 0) as total_recebido
      FROM recebimento_itens_controle 
      WHERE pedido_item_id = $1
    `, [pedido_item_id]);
    
    const quantidadeAtual = parseFloat(quantidadeJaRecebida.rows[0].total_recebido || 0);
    const novaQuantidadeRecebida = quantidadeAtual + parseFloat(quantidade);
    const quantidadePedida = parseFloat(itemData.quantidade);
    
    if (novaQuantidadeRecebida > quantidadePedida) {
      return res.status(400).json({
        success: false,
        message: `Quantidade recebida (${novaQuantidadeRecebida}) não pode exceder a quantidade pedida (${quantidadePedida})`
      });
    }
    
    // Determinar novo status
    let novoStatus = 'PENDENTE';
    if (novaQuantidadeRecebida >= quantidadePedida) {
      novoStatus = 'RECEBIDO';
    } else if (novaQuantidadeRecebida > 0) {
      novoStatus = 'PARCIAL';
    }
    
    // Inserir novo recebimento
    // Atualizar recebimento no controle existente
    await db.query(`
      UPDATE recebimento_itens_controle 
      SET quantidade_recebida = COALESCE(quantidade_recebida, 0) + $2,
          data_ultimo_recebimento = CURRENT_TIMESTAMP,
          usuario_ultimo_recebimento = 1,
          observacoes = COALESCE(observacoes, '') || CASE WHEN observacoes IS NOT NULL THEN '; ' ELSE '' END || $5,
          status = CASE WHEN (COALESCE(quantidade_recebida, 0) + $2) >= quantidade_esperada THEN 'COMPLETO' ELSE 'PARCIAL' END
      WHERE pedido_item_id = $1
    `, [pedido_item_id, parseFloat(quantidade), numero_lote || null, data_validade || null, observacoes || null]);

    // Integração com controle de consumo de contratos
    if (itemData.contrato_id) {
      try {
        // Buscar contrato_produto_id
        const contratoResult = await db.query(`
          SELECT id as contrato_produto_id 
          FROM contrato_produtos 
          WHERE contrato_id = $1 AND produto_id = $2
        `, [itemData.contrato_id, itemData.produto_id]);
        
        if (contratoResult.rows.length > 0) {
          const contrato_produto_id = contratoResult.rows[0].contrato_produto_id;
          
          // Importar e usar ReservaSaldoService
          const { ReservaSaldoService } = await import('../services/reservaSaldoService');
          const reservaSaldoService = new ReservaSaldoService(db);
          
          // Buscar reserva ativa para este pedido e contrato
          const reservas = await reservaSaldoService.buscarPorPedido(itemData.pedido_id);
          const reservaAtiva = reservas.find(r => r.contrato_id === itemData.contrato_id && r.status === 'ativa');
          
          if (reservaAtiva) {
            await reservaSaldoService.consumirReserva(reservaAtiva.id!, parseFloat(quantidade) * itemData.preco_unitario);
            console.log(`✅ Reserva ${reservaAtiva.id} consumida para recebimento`);
          }
          
          console.log(`✅ Reserva convertida em consumo para contrato_produto_id ${contrato_produto_id}, quantidade ${quantidade}`);
        } else {
          console.warn(`⚠️ Contrato produto não encontrado para contrato ${itemData.contrato_id} e produto ${itemData.produto_id}`);
        }
      } catch (consumoError) {
        console.error('❌ Erro ao converter reserva em consumo:', consumoError);
        // Não falha o recebimento, apenas loga o erro
      }
    }
    
    // Verificar e atualizar status do pedido se necessário
    await atualizarStatusPedido(itemData.pedido_id);
    
    // Registrar entrada no estoque
    if (typeof numero_lote !== 'undefined' && numero_lote) {
      try {
        console.log('🔍 DEBUG: Tentando criar lote no estoque...', {
          produto_id: itemData.produto_id,
          lote: numero_lote,
          quantidade: parseFloat(quantidade),
          data_validade: data_validade,
          fornecedor_id: itemData.fornecedor_id
        });
        
        // Importar função do estoque
        const { criarLoteEstoque } = await import('../models/EstoqueCentral');
        
        const loteResult = await criarLoteEstoque({
          produto_id: itemData.produto_id,
          lote: numero_lote,
          quantidade: parseFloat(quantidade),
          data_validade: data_validade,
          fornecedor_id: itemData.fornecedor_id || undefined,
          usuario_id: 1, // ID padrão do usuário
          observacoes: `Recebimento - ${novoStatus}`
        });
        
        console.log(`✅ Lote criado no estoque:`, loteResult);
      } catch (estoqueError) {
        console.error('❌ Erro detalhado ao criar lote no estoque:', estoqueError);
        // Não falha o recebimento, apenas loga o erro
      }
    } else {
      // Criar lote genérico se não informado
      try {
        const { criarLoteEstoque } = await import('../models/EstoqueCentral');
        const loteGenerico = `REC-${Date.now()}-${itemData.produto_id}`;
        
        await criarLoteEstoque({
          produto_id: itemData.produto_id,
          lote: loteGenerico,
          quantidade: parseFloat(quantidade),
          data_validade: data_validade,
          fornecedor_id: itemData.fornecedor_id || undefined,
          usuario_id: 1,
          observacoes: `Recebimento sem lote - ${novoStatus}`
        });
        
        console.log(`✅ Entrada genérica criada no estoque: ${loteGenerico}`);
      } catch (estoqueError) {
        console.warn('⚠️ Erro ao criar entrada no estoque:', estoqueError);
      }
    }
    
    res.json({
      success: true,
      message: "Recebimento registrado com sucesso",
      data: {
        item_id: pedido_item_id,
        quantidade_recebida: quantidade,
        quantidade_total_recebida: novaQuantidadeRecebida,
        novo_status: novoStatus,
        numero_lote: numero_lote || null,
        data_validade: data_validade || null,
        observacoes: observacoes || null
      }
    });
  } catch (error) {
    console.error("❌ Erro ao registrar recebimento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao registrar recebimento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Confirmar recebimento de pedido
export async function confirmarRecebimento(req: Request, res: Response) {
  try {
    const { pedido_id, itens_recebidos, observacoes } = req.body;
    
    if (!pedido_id || !itens_recebidos || !Array.isArray(itens_recebidos)) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos para confirmação de recebimento"
      });
    }
    
    // Atualizar quantidades recebidas dos itens
    for (const item of itens_recebidos) {
      const novaQuantidade = parseFloat(item.quantidade_recebida);
      let novoStatus = 'PENDENTE';
      
      // Buscar quantidade pedida para determinar status
      const itemPedido = await db.query(`
        SELECT quantidade FROM pedidos_itens WHERE id = $1
      `, [item.item_id]);
      
      if (itemPedido.rows.length > 0) {
        const quantidadePedida = parseFloat(itemPedido.rows[0].quantidade);
        if (novaQuantidade >= quantidadePedida) {
          novoStatus = 'RECEBIDO';
        } else if (novaQuantidade > 0) {
          novoStatus = 'PARCIAL';
        }
      }
      
      await db.query(`
        UPDATE pedidos_itens 
        SET quantidade_recebida = $1,
            status = $2
        WHERE id = $3 AND pedido_fornecedor_id IN (
          SELECT id FROM pedidos_fornecedores WHERE pedido_id = $4
        )
      `, [novaQuantidade, novoStatus, item.item_id, pedido_id]);
    }
    
    // Verificar e atualizar status do pedido usando a função auxiliar
    await atualizarStatusPedido(pedido_id);
    
    res.json({
      success: true,
      message: "Recebimento confirmado com sucesso",
      data: {
        pedido_id,
        itens_processados: itens_recebidos.length
      }
    });
  } catch (error) {
    console.error("❌ Erro ao confirmar recebimento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao confirmar recebimento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Buscar detalhes de recebimento de um pedido
export async function buscarRecebimento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Buscar pedido com detalhes
    const pedido = await db.query(`
      SELECT pm.*
      FROM pedidos pm
      WHERE pm.id = $1
    `, [id]);
    
    if (pedido.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }
    
    // Buscar itens do pedido com status de recebimento
    const itens = await db.query(`
      SELECT 
        pi.*,
        p.nome as nome_produto,
        p.unidade as unidade,
        f.nome as nome_fornecedor,

      FROM pedidos_fornecedores pf
      JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
      LEFT JOIN produtos p ON pi.produto_id = p.id

      LEFT JOIN fornecedores f ON pf.fornecedor_id = f.id
      WHERE pf.pedido_id = $1
      ORDER BY COALESCE(f.nome, 'ZZZ'), p.nome
    `, [id]);
    
    res.json({
      success: true,
      data: {
        pedido: pedido.rows[0],
        itens: itens.rows
      }
    });
  } catch (error) {
    console.error("❌ Erro ao buscar recebimento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar recebimento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Estatísticas de pedido
export async function estatisticasPedido(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const stats = await db.query(`
      WITH itens_com_status AS (
        SELECT 
          pi.id,
          pi.quantidade,
          COALESCE(SUM(rs.quantidade_recebida), 0) as quantidade_recebida_total,
          CASE 
            WHEN COALESCE(SUM(rs.quantidade_recebida), 0) >= pi.quantidade THEN 'RECEBIDO'
            WHEN COALESCE(SUM(rs.quantidade_recebida), 0) > 0 THEN 'PARCIAL'
            ELSE 'PENDENTE'
          END as status_item
        FROM pedidos_fornecedores pf
        JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
        LEFT JOIN recebimento_itens_controle rs ON pi.id = rs.pedido_item_id
        WHERE pf.pedido_id = $1
        GROUP BY pi.id, pi.quantidade
      )
      SELECT 
        COUNT(*) as total_itens,
        COALESCE(SUM(quantidade), 0) as quantidade_total,
        COALESCE(SUM(quantidade_recebida_total), 0) as quantidade_recebida,
        COUNT(CASE WHEN status_item = 'RECEBIDO' THEN 1 END) as itens_recebidos,
        COUNT(CASE WHEN status_item = 'PARCIAL' THEN 1 END) as itens_parciais,
        COUNT(CASE WHEN status_item = 'PENDENTE' THEN 1 END) as itens_pendentes
      FROM itens_com_status
    `, [id]);
    
    // Buscar informações de fornecedores separadamente
    const fornecedoresStats = await db.query(`
      SELECT 
        COUNT(DISTINCT pf.fornecedor_id) as total_fornecedores
      FROM pedidos_fornecedores pf
      JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
      WHERE pf.pedido_id = $1
    `, [id]);
    
    const statsData = stats.rows[0];
    const fornecedoresData = fornecedoresStats.rows[0];
    const quantidadeTotal = parseFloat(statsData.quantidade_total || 0);
    const quantidadeRecebida = parseFloat(statsData.quantidade_recebida || 0);
    const percentualRecebido = quantidadeTotal > 0 ? (quantidadeRecebida / quantidadeTotal) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        total_itens: parseInt(statsData.total_itens || 0),
        quantidade_total: quantidadeTotal,
        quantidade_recebida: quantidadeRecebida,
        itens_recebidos: parseInt(statsData.itens_recebidos || 0),
        itens_parciais: parseInt(statsData.itens_parciais || 0),
        itens_pendentes: parseInt(statsData.itens_pendentes || 0),
        total_fornecedores: parseInt(fornecedoresData.total_fornecedores || 0),
        fornecedores_faturados: parseInt(fornecedoresData.fornecedores_faturados || 0),
        percentual_recebido: Math.round(percentualRecebido * 100) / 100
      }
    });
  } catch (error) {
    console.error("❌ Erro ao buscar estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar estatísticas",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Buscar histórico de recebimentos de um item
export async function historicoItem(req: Request, res: Response) {
  try {
    const { pedido_item_id } = req.params;
    
    // Buscar dados do item
    const item = await db.query(`
      SELECT 
        pi.*,
        p.nome as nome_produto,
        p.unidade,
        pm.numero_pedido,
        pm.created_at as data_pedido
      FROM pedidos_fornecedores pf
      JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
      LEFT JOIN produtos p ON pi.produto_id = p.id
      LEFT JOIN pedidos pm ON pf.pedido_id = pm.id
      WHERE pi.id = $1
    `, [pedido_item_id]);
    
    if (item.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Item não encontrado"
      });
    }
    
    const itemData = item.rows[0];
    
    // Buscar controle de recebimento deste item
    const recebimentos = await db.query(`
      SELECT 
        rs.*,
        u.nome as nome_usuario
      FROM recebimento_itens_controle rs
      LEFT JOIN usuarios u ON rs.usuario_ultimo_recebimento = u.id
      WHERE rs.pedido_item_id = $1
    `, [pedido_item_id]);
    
    const historico = [];
    
    // 1. Adicionar criação do pedido
    historico.push({
      data: itemData.data_pedido,
      acao: 'PEDIDO_CRIADO',
      descricao: `📋 Item adicionado ao pedido ${itemData.numero_pedido}`,
      quantidade: parseFloat(itemData.quantidade),
      usuario: 'Sistema'
    });
    
    // 2. Adicionar cada recebimento
    let quantidadeAcumulada = 0;
    const quantidadePedida = parseFloat(itemData.quantidade || 0);
    
    for (const recebimento of recebimentos.rows) {
      const quantidadeRecebida = parseFloat(recebimento.quantidade_recebida);
      quantidadeAcumulada += quantidadeRecebida;
      
      const isCompleto = quantidadeAcumulada >= quantidadePedida;
      const isParcial = quantidadeAcumulada > 0 && quantidadeAcumulada < quantidadePedida;
      
      let acao = 'RECEBIMENTO';
      let icone = '📦';
      
      if (isCompleto) {
        acao = 'RECEBIMENTO_COMPLETO';
        icone = '✅';
      } else if (isParcial) {
        acao = 'RECEBIMENTO_PARCIAL';
        icone = '🔄';
      }
      
      let descricao = `${icone} Recebimento de ${formatarQuantidade(quantidadeRecebida)} ${itemData.unidade || 'UN'}`;
      
      if (recebimento.numero_lote) {
        descricao += ` (Lote: ${recebimento.numero_lote})`;
      }
      
      if (recebimento.observacoes) {
        descricao += ` - ${recebimento.observacoes}`;
      }
      
      descricao += ` | Total acumulado: ${formatarQuantidade(quantidadeAcumulada)}/${formatarQuantidade(quantidadePedida)} ${itemData.unidade || 'UN'}`;
      
      historico.push({
        data: recebimento.data_recebimento,
        acao: acao,
        descricao: descricao,
        quantidade: quantidadeRecebida,
        usuario: recebimento.nome_usuario || 'Usuário não identificado'
      });
    }
    
    // 3. Adicionar status atual se ainda há pendências
    const quantidadePendente = quantidadePedida - quantidadeAcumulada;
    
    if (quantidadePendente > 0) {
      historico.push({
        data: new Date().toISOString(),
        acao: 'STATUS_ATUAL',
        descricao: `⏳ Aguardando recebimento de ${formatarQuantidade(quantidadePendente)} ${itemData.unidade || 'UN'}`,
      quantidade: quantidadePendente,
        usuario: 'Sistema'
      });
    }
    
    res.json({
      success: true,
      data: {
        item: itemData,
        historico
      }
    });
  } catch (error) {
    console.error("❌ Erro ao buscar histórico:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar histórico",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Função auxiliar para atualizar status do pedido baseado no recebimento
async function atualizarStatusPedido(pedidoId: number) {
  try {
    console.log(`🔄 Verificando status do pedido ${pedidoId} após recebimento...`);
    
    // Buscar status atual do pedido
    const pedidoAtual = await db.query(`
      SELECT status FROM pedidos WHERE id = $1
    `, [pedidoId]);
    
    if (pedidoAtual.rows.length === 0) {
      console.log(`❌ Pedido ${pedidoId} não encontrado`);
      return;
    }
    
    const statusAtual = pedidoAtual.rows[0].status;
    console.log(`📋 Status atual do pedido ${pedidoId}: ${statusAtual}`);
    
    // Não alterar se estiver cancelado
    if (statusAtual === 'CANCELADO') {
      console.log(`ℹ️ Pedido ${pedidoId} está CANCELADO, não atualizando status`);
      return;
    }
    
    // Verificar estatísticas de recebimento dos itens
    const stats = await db.query(`
      SELECT 
        COUNT(pi.id) as total_itens,
        COALESCE(SUM(pi.quantidade), 0) as quantidade_total,
        COALESCE(SUM(rs.quantidade_recebida), 0) as quantidade_recebida,
        COUNT(CASE WHEN pi.status = 'RECEBIDO' THEN 1 END) as itens_recebidos,
        COUNT(CASE WHEN pi.status = 'PARCIAL' THEN 1 END) as itens_parciais,
        COUNT(CASE WHEN pi.status = 'PENDENTE' THEN 1 END) as itens_pendentes
      FROM pedidos_itens pi
      JOIN pedidos_fornecedores pf ON pi.pedido_fornecedor_id = pf.id
      LEFT JOIN recebimento_itens_controle rs ON pi.id = rs.pedido_item_id
      WHERE pf.pedido_id = $1
    `, [pedidoId]);
    
    const statsData = stats.rows[0];
    const totalItens = parseInt(statsData.total_itens || 0);
    const itensRecebidos = parseInt(statsData.itens_recebidos || 0);
    const itensParciais = parseInt(statsData.itens_parciais || 0);
    const itensPendentes = parseInt(statsData.itens_pendentes || 0);
    
    console.log(`📊 Estatísticas do pedido ${pedidoId}:`, {
      totalItens,
      itensRecebidos,
      itensParciais,
      itensPendentes
    });
    
    // Determinar novo status baseado no recebimento, obedecendo os valores permitidos
    let novoStatus = statusAtual;
    let motivoMudanca = '';
    
    if (totalItens > 0 && itensRecebidos === totalItens) {
      // Todos os itens foram recebidos completamente -> pedido RECEBIDO
      novoStatus = 'RECEBIDO';
      motivoMudanca = 'Todos os itens foram recebidos completamente';
    } else {
      // Recebimento não está 100% completo
      // Se houver legado com status inválido no pedido, normaliza para CONFIRMADO
      if (statusAtual === 'RECEBIDO' || statusAtual === 'RECEBIMENTO') {
        novoStatus = 'CONFIRMADO';
        motivoMudanca = 'Normalização de status: recebimento em andamento';
      }
    }
    
    // Atualizar status se necessário
    if (novoStatus !== statusAtual) {
      console.log(`🔄 Atualizando status do pedido ${pedidoId}: ${statusAtual} → ${novoStatus}`);
      console.log(`📝 Motivo: ${motivoMudanca}`);
      
      await db.query(`
        UPDATE pedidos 
        SET status = $1,
            observacoes = COALESCE(observacoes || ' | ', '') || $2,
            data_atualizacao = CURRENT_TIMESTAMP,
            atualizado_por = 'Sistema Recebimento'
        WHERE id = $3
      `, [novoStatus, `Status atualizado automaticamente: ${motivoMudanca}`, pedidoId]);
      
      console.log(`✅ Status do pedido ${pedidoId} atualizado com sucesso para ${novoStatus}`);
    } else {
      console.log(`ℹ️ Status do pedido ${pedidoId} mantido como ${statusAtual}`);
    }
    
  } catch (error) {
    console.error(`❌ Erro ao atualizar status do pedido ${pedidoId}:`, error);
    // Não propagar o erro para não quebrar o fluxo principal
  }
}

// Inicializar controle (compatibilidade)
export async function inicializarControle(req: Request, res: Response) {
  try {
    res.json({
      success: true,
      message: "Controle já inicializado com PostgreSQL"
    });
  } catch (error) {
    console.error("❌ Erro ao inicializar controle:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao inicializar controle",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}