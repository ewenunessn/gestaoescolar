import { Request, Response } from "express";
import { setTenantContextFromRequest } from "../../../utils/tenantContext";
const db = require("../../../database");

const STATUS_PEDIDO = {
  rascunho: { label: 'Rascunho', color: 'default' },
  pendente: { label: 'Pendente', color: 'warning' },
  aprovado: { label: 'Aprovado', color: 'info' },
  em_separacao: { label: 'Em Separação', color: 'primary' },
  enviado: { label: 'Enviado', color: 'secondary' },
  entregue: { label: 'Entregue', color: 'success' },
  cancelado: { label: 'Cancelado', color: 'error' }
} as const;

export async function listarPedidos(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant

    await setTenantContextFromRequest(req);
    
    // Obter tenant_id do req.tenant ou do header
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    // Validar se tenant está presente
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }
    
    const { status, contrato_id, escola_id, data_inicio, data_fim, page = 1, limit = 50 } = req.query;

    let whereClause = 'p.tenant_id = $1';
    const params: any[] = [tenantId];
    let paramCount = 1;

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
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;
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
      LIMIT $${limitParam} OFFSET $${offsetParam}
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
  } catch (error) {
    console.error("❌ Erro ao listar pedidos:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar pedidos",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function buscarPedido(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Configurar contexto de tenant

    await setTenantContextFromRequest(req);
    
    // Obter tenant_id do req.tenant ou do header
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    // Validar se tenant está presente
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    // IMPORTANTE: Filtrar por tenant_id para segurança
    const pedidoResult = await db.query(`
      SELECT 
        p.*,
        u.nome as usuario_criacao_nome,
        ua.nome as usuario_aprovacao_nome
      FROM pedidos p
      JOIN usuarios u ON p.usuario_criacao_id = u.id
      LEFT JOIN usuarios ua ON p.usuario_aprovacao_id = ua.id
      WHERE p.id = $1 AND p.tenant_id = $2
    `, [id, tenantId]);

    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }

    // Check if unidade column exists in contrato_produtos table
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
    `);
    const unidadeColumnExists = columnCheck.rows.length > 0;

    let itensQuery;
    if (unidadeColumnExists) {
      itensQuery = `
        SELECT 
          pi.*,
          p.nome as produto_nome,
          COALESCE(cp.unidade, 'Kg') as unidade,
          cp.quantidade_contratada,
          cp.preco_unitario as preco_contrato,
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
        LEFT JOIN contratos c ON cp.contrato_id = c.id
        LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE pi.pedido_id = $1
        ORDER BY p.nome
      `;
    } else {
      itensQuery = `
        SELECT 
          pi.*,
          p.nome as produto_nome,
          'Kg' as unidade,
          cp.quantidade_contratada,
          cp.preco_unitario as preco_contrato,
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
        LEFT JOIN contratos c ON cp.contrato_id = c.id
        LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE pi.pedido_id = $1
        ORDER BY p.nome
      `;
    }

    const itensResult = await db.query(itensQuery, [id]);

    const pedido = {
      ...pedidoResult.rows[0],
      itens: itensResult.rows
    };

    res.json({
      success: true,
      data: pedido
    });
  } catch (error) {
    console.error("❌ Erro ao buscar pedido:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function criarPedido(req: Request, res: Response) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Configurar contexto de tenant

    await setTenantContextFromRequest(req);
    
    // Obter tenant_id do req.tenant ou do header
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    // Validar se tenant está presente
    if (!tenantId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    const {
      observacoes,
      itens,
      salvar_como_rascunho
    } = req.body;

    const usuario_criacao_id = (req as any).user?.id || 1;

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: "É necessário incluir pelo menos um item no pedido"
      });
    }

    const ano = new Date().getFullYear();
    
    // Buscar o próximo número sequencial disponível
    const maxNumeroResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 8) AS INTEGER)), 0) as max_sequencial
      FROM pedidos 
      WHERE EXTRACT(YEAR FROM created_at) = $1 AND tenant_id = $2 AND numero LIKE $3
    `, [ano, tenantId, `PED${ano}%`]);

    const proximoSequencial = (parseInt(maxNumeroResult.rows[0].max_sequencial) + 1).toString().padStart(6, '0');
    const numero = `PED${ano}${proximoSequencial}`;

    let valor_total = 0;
    for (const item of itens) {
      // IMPORTANTE: Verificar se o contrato_produto pertence ao tenant
      const cpResult = await client.query(`
        SELECT cp.*, p.nome as produto_nome, c.status as contrato_status
        FROM contrato_produtos cp
        JOIN produtos p ON cp.produto_id = p.id
        JOIN contratos c ON cp.contrato_id = c.id
        WHERE cp.id = $1 AND cp.ativo = true AND c.tenant_id = $2
      `, [item.contrato_produto_id, tenantId]);

      if (cpResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Produto não encontrado ou inativo`
        });
      }

      const contratoProduto = cpResult.rows[0];

      if (contratoProduto.contrato_status !== 'ativo') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `O contrato do produto ${contratoProduto.produto_nome} não está ativo`
        });
      }

      if (item.quantidade <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Quantidade inválida para o produto ${contratoProduto.produto_nome}`
        });
      }

      valor_total += item.quantidade * contratoProduto.preco_unitario;
    }

    const status_inicial = salvar_como_rascunho ? 'rascunho' : 'pendente';

    // IMPORTANTE: Incluir tenant_id no INSERT
    const pedidoResult = await client.query(`
      INSERT INTO pedidos (
        numero, data_pedido, status, valor_total, observacoes, usuario_criacao_id, tenant_id
      )
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
      RETURNING *
    `, [numero, status_inicial, valor_total, observacoes, usuario_criacao_id, tenantId]);

    const pedido_id = pedidoResult.rows[0].id;

    for (const item of itens) {
      const cpResult = await client.query(`
        SELECT preco_unitario, produto_id
        FROM contrato_produtos
        WHERE id = $1
      `, [item.contrato_produto_id]);

      const preco_unitario = cpResult.rows[0].preco_unitario;
      const produto_id = cpResult.rows[0].produto_id;
      const valor_item = item.quantidade * preco_unitario;

      await client.query(`
        INSERT INTO pedido_itens (
          pedido_id, contrato_produto_id, produto_id, quantidade,
          preco_unitario, valor_total, data_entrega_prevista, observacoes, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [pedido_id, item.contrato_produto_id, produto_id, item.quantidade, preco_unitario, valor_item, item.data_entrega_prevista, item.observacoes, tenantId]);
    }

    await client.query('COMMIT');

    const pedidoCompletoResult = await db.query(`
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
    `, [pedido_id]);

    const mensagem = salvar_como_rascunho
      ? "Pedido salvo como rascunho com sucesso"
      : "Pedido criado com sucesso";

    res.status(201).json({
      success: true,
      message: mensagem,
      data: pedidoCompletoResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erro ao criar pedido:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}

export async function atualizarPedido(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant

    await setTenantContextFromRequest(req);
    
    // Obter tenant_id do req.tenant ou do header
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    // Validar se tenant está presente
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    const { id } = req.params;
    const { observacoes } = req.body;

    // IMPORTANTE: Filtrar por tenant_id para segurança
    const pedidoResult = await db.query(`
      SELECT status FROM pedidos WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }

    if (pedidoResult.rows[0].status !== 'rascunho') {
      return res.status(400).json({
        success: false,
        message: "Apenas pedidos em rascunho podem ser editados"
      });
    }

    // IMPORTANTE: Filtrar por tenant_id no UPDATE
    const result = await db.query(`
      UPDATE pedidos 
      SET observacoes = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [observacoes, id, tenantId]);

    res.json({
      success: true,
      message: "Pedido atualizado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar pedido:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function atualizarStatusPedido(req: Request, res: Response) {
  try {
    // Configurar contexto de tenant

    await setTenantContextFromRequest(req);
    
    // Obter tenant_id do req.tenant ou do header
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    // Validar se tenant está presente
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    const { id } = req.params;
    const { status } = req.body;
    const usuario_id = (req as any).user?.id || 1;

    const statusValidos = ['rascunho', 'pendente', 'aprovado', 'em_separacao', 'enviado', 'entregue', 'cancelado'];

    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status inválido"
      });
    }

    let query = `
      UPDATE pedidos 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;

    const values: any[] = [status];
    let paramCount = 2;

    if (status === 'aprovado') {
      query += `, usuario_aprovacao_id = $${paramCount}, data_aprovacao = CURRENT_TIMESTAMP`;
      values.push(usuario_id);
      paramCount++;
    }

    query += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(id);

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }

    res.json({
      success: true,
      message: `Pedido ${status === 'aprovado' ? 'aprovado' : 'atualizado'} com sucesso`,
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

export async function excluirPedido(req: Request, res: Response) {
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

    // Verificar se há faturamento com consumo registrado
    const faturamentoComConsumoResult = await client.query(`
      SELECT f.id, f.numero, COUNT(fi.id) as itens_consumidos
      FROM faturamentos f
      JOIN faturamento_itens fi ON fi.faturamento_id = f.id
      WHERE f.pedido_id = $1
        AND fi.consumo_registrado = true
      GROUP BY f.id, f.numero
    `, [id]);

    if (faturamentoComConsumoResult.rows.length > 0) {
      const faturamento = faturamentoComConsumoResult.rows[0];
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Não é possível excluir o pedido porque o faturamento ${faturamento.numero} possui ${faturamento.itens_consumidos} item(ns) com consumo registrado. ` +
          `Por favor, reverta o consumo de todos os itens antes de excluir o pedido.`
      });
    }

    // Permitir excluir pedidos em qualquer fase
    // Adicionar log de auditoria para exclusões de pedidos em andamento
    if (!['rascunho', 'cancelado'].includes(status)) {
      console.log(`⚠️ EXCLUSÃO DE PEDIDO EM ANDAMENTO: Pedido ${numero} (Status: ${status}) sendo excluído pelo usuário`);
    }

    // Excluir faturamentos sem consumo (se houver)
    await client.query(`DELETE FROM faturamento_itens WHERE faturamento_id IN (SELECT id FROM faturamentos WHERE pedido_id = $1)`, [id]);
    await client.query(`DELETE FROM faturamentos WHERE pedido_id = $1`, [id]);

    // Excluir itens do pedido
    await client.query(`DELETE FROM pedido_itens WHERE pedido_id = $1`, [id]);

    // Excluir o pedido
    await client.query(`DELETE FROM pedidos WHERE id = $1`, [id]);

    await client.query('COMMIT');

    const tipoExclusao = status === 'rascunho' ? 'Rascunho' :
      status === 'cancelado' ? 'Pedido cancelado' :
        `Pedido ${STATUS_PEDIDO[status as keyof typeof STATUS_PEDIDO]?.label || status}`;

    res.json({
      success: true,
      message: `${tipoExclusao} ${numero} excluído com sucesso`
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

export async function cancelarPedido(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const pedidoResult = await db.query(`
      SELECT status FROM pedidos WHERE id = $1
    `, [id]);

    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }

    if (['entregue', 'cancelado'].includes(pedidoResult.rows[0].status)) {
      return res.status(400).json({
        success: false,
        message: "Pedido não pode ser cancelado"
      });
    }

    // Se for rascunho, redirecionar para exclusão
    if (pedidoResult.rows[0].status === 'rascunho') {
      return res.status(400).json({
        success: false,
        message: "Use o endpoint de exclusão para rascunhos"
      });
    }

    const result = await db.query(`
      UPDATE pedidos 
      SET status = 'cancelado', 
          observacoes = COALESCE(observacoes, '') || ' | CANCELADO: ' || $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [motivo || 'Sem motivo informado', id]);

    res.json({
      success: true,
      message: "Pedido cancelado com sucesso",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Erro ao cancelar pedido:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao cancelar pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function obterEstatisticasPedidos(req: Request, res: Response) {
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

export async function atualizarItensPedido(req: Request, res: Response) {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Configurar contexto de tenant

    await setTenantContextFromRequest(req);
    
    // Obter tenant_id do req.tenant ou do header
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    // Validar se tenant está presente
    if (!tenantId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    const { id } = req.params;
    const { itens } = req.body;

    // IMPORTANTE: Verificar se o pedido existe, está em rascunho E pertence ao tenant
    const pedidoResult = await client.query(`
      SELECT status FROM pedidos WHERE id = $1 AND tenant_id = $2
    `, [id, tenantId]);

    if (pedidoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }

    if (pedidoResult.rows[0].status !== 'rascunho') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: "Apenas pedidos em rascunho podem ter itens editados"
      });
    }

    // Remover todos os itens existentes
    await client.query(`DELETE FROM pedido_itens WHERE pedido_id = $1`, [id]);

    // Adicionar novos itens
    let valor_total = 0;
    for (const item of itens) {
      // IMPORTANTE: Verificar se o contrato_produto pertence ao tenant
      const cpResult = await client.query(`
        SELECT cp.*, p.nome as produto_nome, c.status as contrato_status
        FROM contrato_produtos cp
        JOIN produtos p ON cp.produto_id = p.id
        JOIN contratos c ON cp.contrato_id = c.id
        WHERE cp.id = $1 AND cp.ativo = true AND c.tenant_id = $2
      `, [item.contrato_produto_id, tenantId]);

      if (cpResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Produto não encontrado ou inativo`
        });
      }

      const contratoProduto = cpResult.rows[0];

      if (contratoProduto.contrato_status !== 'ativo') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `O contrato do produto ${contratoProduto.produto_nome} não está ativo`
        });
      }

      if (item.quantidade <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Quantidade inválida para o produto ${contratoProduto.produto_nome}`
        });
      }

      const preco_unitario = contratoProduto.preco_unitario;
      const produto_id = contratoProduto.produto_id;
      const valor_item = item.quantidade * preco_unitario;
      valor_total += valor_item;

      await client.query(`
        INSERT INTO pedido_itens (
          pedido_id, contrato_produto_id, produto_id, quantidade,
          preco_unitario, valor_total, data_entrega_prevista, observacoes, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [id, item.contrato_produto_id, produto_id, item.quantidade, preco_unitario, valor_item, item.data_entrega_prevista, item.observacoes, tenantId]);
    }

    // Atualizar valor total do pedido
    await client.query(`
      UPDATE pedidos 
      SET valor_total = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [valor_total, id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: "Itens do pedido atualizados com sucesso"
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Erro ao atualizar itens:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar itens do pedido",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    client.release();
  }
}

export async function listarProdutosContrato(req: Request, res: Response) {
  try {
    const { contrato_id } = req.params;

    // Configurar contexto de tenant

    await setTenantContextFromRequest(req);
    
    // Obter tenant_id do req.tenant ou do header
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    // Validar se tenant está presente
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }

    // Check if unidade column exists in contrato_produtos table
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
    `);
    const unidadeColumnExists = columnCheck.rows.length > 0;

    let query;
    if (unidadeColumnExists) {
      query = `
        SELECT 
          cp.*,
          p.nome as produto_nome,
          COALESCE(cp.unidade, 'Kg') as unidade,
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
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.contrato_id = $1 AND cp.ativo = true AND c.status = 'ativo'
        ORDER BY p.nome
      `;
    } else {
      query = `
        SELECT 
          cp.*,
          p.nome as produto_nome,
          'Kg' as unidade,
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
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.contrato_id = $1 AND cp.ativo = true AND c.status = 'ativo'
        ORDER BY p.nome
      `;
    }

    // IMPORTANTE: Filtrar por contrato
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
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Obter tenant_id do req.tenant ou do header
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    // Validar se tenant está presente
    if (!tenantId) {
      console.error("❌ Nenhum tenant encontrado - req.tenant:", req.tenant, "headers:", req.headers);
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }
    
    console.log(`✅ Listando produtos disponíveis para tenant: ${tenantId}`);
    
    // Check if unidade column exists in contrato_produtos table
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
    `);
    const unidadeColumnExists = columnCheck.rows.length > 0;

    let query;
    if (unidadeColumnExists) {
      query = `
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
          COALESCE(cp.unidade, 'Kg') as unidade,
          p.descricao as produto_descricao,
          c.id as contrato_id,
          c.numero as contrato_numero,
          f.id as fornecedor_id,
          f.nome as fornecedor_nome,
          f.cnpj as fornecedor_cnpj
        FROM contrato_produtos cp
        JOIN produtos p ON cp.produto_id = p.id
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true 
          AND c.status = 'ativo'
          AND c.tenant_id = $1
        ORDER BY f.nome, p.nome
      `;
    } else {
      query = `
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
          'Kg' as unidade,
          p.descricao as produto_descricao,
          c.id as contrato_id,
          c.numero as contrato_numero,
          f.id as fornecedor_id,
          f.nome as fornecedor_nome,
          f.cnpj as fornecedor_cnpj
        FROM contrato_produtos cp
        JOIN produtos p ON cp.produto_id = p.id
        JOIN contratos c ON cp.contrato_id = c.id
        JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE cp.ativo = true 
          AND c.status = 'ativo'
          AND c.tenant_id = $1
        ORDER BY f.nome, p.nome
      `;
    }

    // IMPORTANTE: Filtrar por tenant_id
    const produtosResult = await db.query(query, [tenantId]);

    console.log(`📊 Produtos encontrados: ${produtosResult.rows.length}`);
    if (produtosResult.rows.length > 0) {
      console.log(`📦 Primeiro produto:`, JSON.stringify(produtosResult.rows[0], null, 2));
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
