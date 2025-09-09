import { Request, Response } from "express";
const db = require("../database");

interface AgrupamentoMensal {
  id: number;
  ano: number;
  mes: number;
  descricao: string;
  status: string;
  total_pedidos: number;
  valor_total: number;
  data_criacao: string;
  data_atualizacao: string;
}

interface AgrupamentoFaturamento {
  id: number;
  agrupamento_id: number;
  fornecedor_id: number;
  nome_fornecedor: string;
  status: string;
  valor_total: number;
  valor_faturado: number;
  total_pedidos: number;
  pedidos_faturados: number;
  percentual_faturado: number;
}

interface PedidoFaturamentoControle {
  id: number;
  pedido_id: number;
  numero_pedido: string;
  fornecedor_id: number;
  nome_fornecedor: string;
  status: string;
  valor_pedido: number;
  data_faturamento: string | null;
}

// Listar agrupamentos mensais
export async function listarAgrupamentosMensais(req: Request, res: Response) {
  try {
    const { ano, mes, status } = req.query;
    
    let whereClause = "WHERE 1=1";
    const params: any[] = [];
    
    if (ano) {
      whereClause += " AND am.ano = $" + (params.length + 1);
      params.push(parseInt(ano as string));
    }
    
    if (mes) {
      whereClause += " AND am.mes = $" + (params.length + 1);
      params.push(parseInt(mes as string));
    }
    
    if (status) {
      whereClause += " AND am.status = $" + (params.length + 1);
      params.push(status);
    }
    
    const agrupamentos = await db.all(`
      SELECT 
        am.*,
        COUNT(DISTINCT af.fornecedor_id) as total_fornecedores,
        COUNT(DISTINCT CASE WHEN af.status = 'COMPLETO' THEN af.fornecedor_id END) as fornecedores_completos,
        COUNT(DISTINCT CASE WHEN af.status = 'PARCIAL' THEN af.fornecedor_id END) as fornecedores_parciais,
        COUNT(DISTINCT CASE WHEN af.status = 'PENDENTE' THEN af.fornecedor_id END) as fornecedores_pendentes
      FROM agrupamentos_mensais am
      LEFT JOIN agrupamentos_faturamentos af ON am.id = af.agrupamento_id
      ${whereClause}
      GROUP BY am.id, am.ano, am.mes, am.descricao, am.status, am.total_pedidos, 
               am.valor_total, am.data_criacao, am.data_atualizacao, am.criado_por
      ORDER BY am.ano DESC, am.mes DESC
    `, params);
    
    res.json({
      success: true,
      data: agrupamentos,
      total: agrupamentos.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar agrupamentos mensais:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar agrupamentos mensais",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Obter detalhes de um agrupamento mensal
export async function obterAgrupamentoMensal(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Buscar dados do agrupamento
    const agrupamento = await db.get(`
      SELECT * FROM agrupamentos_mensais WHERE id = $1
    `, [id]);
    
    if (!agrupamento) {
      return res.status(404).json({
        success: false,
        message: "Agrupamento mensal não encontrado"
      });
    }
    
    // Buscar faturamentos por fornecedor
    const faturamentos = await db.all(`
      SELECT 
        af.*,
        f.nome as nome_fornecedor,
        CASE 
          WHEN af.valor_total > 0 THEN ROUND((af.valor_faturado / af.valor_total) * 100, 2)
          ELSE 0 
        END as percentual_faturado
      FROM agrupamentos_faturamentos af
      JOIN fornecedores f ON af.fornecedor_id = f.id
      WHERE af.agrupamento_id = $1
      ORDER BY f.nome
    `, [id]);
    
    // Buscar pedidos do agrupamento
    const pedidos = await db.all(`
      SELECT 
        ap.pedido_id,
        pm.numero_pedido,
        pm.valor_total,
        pm.status as status_pedido,
        pm.data_criacao,
        COUNT(DISTINCT pfc.fornecedor_id) as total_fornecedores,
        COUNT(DISTINCT CASE WHEN pfc.status = 'FATURADO' THEN pfc.fornecedor_id END) as fornecedores_faturados
      FROM agrupamentos_pedidos ap
      JOIN pedidos pm ON ap.pedido_id = pm.id
      LEFT JOIN pedidos_faturamentos_controle pfc ON pm.id = pfc.pedido_id
      WHERE ap.agrupamento_id = $1
      GROUP BY ap.pedido_id, pm.numero_pedido, pm.valor_total, pm.status, pm.data_criacao
      ORDER BY pm.data_criacao DESC
    `, [id]);
    
    res.json({
      success: true,
      data: {
        agrupamento,
        faturamentos,
        pedidos
      }
    });
  } catch (error) {
    console.error("❌ Erro ao obter agrupamento mensal:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter agrupamento mensal",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Criar agrupamento mensal
export async function criarAgrupamentoMensal(req: Request, res: Response) {
  try {
    const { ano, mes, descricao } = req.body;
    const usuario_id = 1; // Por enquanto usuário fixo
    
    if (!ano || !mes) {
      return res.status(400).json({
        success: false,
        message: "Ano e mês são obrigatórios"
      });
    }
    
    if (mes < 1 || mes > 12) {
      return res.status(400).json({
        success: false,
        message: "Mês deve estar entre 1 e 12"
      });
    }
    
    // Usar função do banco para criar agrupamento
    const result = await db.get(`
      SELECT criar_agrupamento_mensal($1, $2) as agrupamento_id
    `, [ano, mes]);
    
    const agrupamento = await db.get(`
      SELECT * FROM agrupamentos_mensais WHERE id = $1
    `, [result.agrupamento_id]);
    
    res.json({
      success: true,
      message: "Agrupamento mensal criado com sucesso",
      data: agrupamento
    });
  } catch (error) {
    console.error("❌ Erro ao criar agrupamento mensal:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar agrupamento mensal",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Adicionar pedido ao agrupamento mensal
export async function adicionarPedidoAgrupamento(req: Request, res: Response) {
  try {
    const { agrupamento_id, pedido_id } = req.body;
    
    if (!agrupamento_id || !pedido_id) {
      return res.status(400).json({
        success: false,
        message: "ID do agrupamento e do pedido são obrigatórios"
      });
    }
    
    // Verificar se o pedido existe
    const pedido = await db.get(`
      SELECT pm.*, 
             EXTRACT(YEAR FROM pm.data_criacao::timestamp) as ano_pedido,
             EXTRACT(MONTH FROM pm.data_criacao::timestamp) as mes_pedido
      FROM pedidos pm 
      WHERE pm.id = $1
    `, [pedido_id]);
    
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado"
      });
    }
    
    // Verificar se o agrupamento existe
    const agrupamento = await db.get(`
      SELECT * FROM agrupamentos_mensais WHERE id = $1
    `, [agrupamento_id]);
    
    if (!agrupamento) {
      return res.status(404).json({
        success: false,
        message: "Agrupamento mensal não encontrado"
      });
    }
    
    // Verificar se o pedido pertence ao mês/ano do agrupamento
    if (pedido.ano_pedido !== agrupamento.ano || pedido.mes_pedido !== agrupamento.mes) {
      return res.status(400).json({
        success: false,
        message: `Pedido é de ${pedido.mes_pedido}/${pedido.ano_pedido}, mas o agrupamento é de ${agrupamento.mes}/${agrupamento.ano}`
      });
    }
    
    // Adicionar pedido ao agrupamento
    await db.query(`
      INSERT INTO agrupamentos_pedidos (agrupamento_id, pedido_id)
      VALUES ($1, $2)
      ON CONFLICT (pedido_id) DO NOTHING
    `, [agrupamento_id, pedido_id]);
    
    // Buscar fornecedores do pedido e criar controles de faturamento
    const fornecedores = await db.all(`
      SELECT DISTINCT 
        pi.produto_id,
        pf.fornecedor_id,
        f.nome as nome_fornecedor,
        SUM(pi.subtotal) as valor_fornecedor
      FROM pedidos_fornecedores pf
      JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
      JOIN contrato_produtos cp ON pi.contrato_id = cp.contrato_id AND pi.produto_id = cp.produto_id
      JOIN fornecedores f ON pf.fornecedor_id = f.id
      WHERE pf.pedido_id = $1
      GROUP BY pi.produto_id, pf.fornecedor_id, f.nome
    `, [pedido_id]);
    
    for (const fornecedor of fornecedores) {
      // Criar ou buscar agrupamento de faturamento por fornecedor
      await db.query(`
        INSERT INTO agrupamentos_faturamentos (agrupamento_id, fornecedor_id)
        VALUES ($1, $2)
        ON CONFLICT (agrupamento_id, fornecedor_id) DO NOTHING
      `, [agrupamento_id, fornecedor.fornecedor_id]);
      
      const agrupamentoFaturamento = await db.get(`
        SELECT id FROM agrupamentos_faturamentos 
        WHERE agrupamento_id = $1 AND fornecedor_id = $2
      `, [agrupamento_id, fornecedor.fornecedor_id]);
      
      // Criar controle de faturamento do pedido
      await db.query(`
        INSERT INTO pedidos_faturamentos_controle 
        (pedido_id, fornecedor_id, agrupamento_faturamento_id, valor_pedido)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (pedido_id, fornecedor_id) DO UPDATE SET
        agrupamento_faturamento_id = $3,
        valor_pedido = $4
      `, [pedido_id, fornecedor.fornecedor_id, agrupamentoFaturamento.id, fornecedor.valor_fornecedor]);
    }
    
    res.json({
      success: true,
      message: "Pedido adicionado ao agrupamento mensal com sucesso"
    });
  } catch (error) {
    console.error("❌ Erro ao adicionar pedido ao agrupamento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao adicionar pedido ao agrupamento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Faturar pedidos de um fornecedor no agrupamento
export async function faturarFornecedorAgrupamento(req: Request, res: Response) {
  try {
    const { agrupamento_id, fornecedor_id, pedidos_ids } = req.body;
    const usuario_id = 1; // Por enquanto usuário fixo
    
    if (!agrupamento_id || !fornecedor_id) {
      return res.status(400).json({
        success: false,
        message: "ID do agrupamento e do fornecedor são obrigatórios"
      });
    }
    
    // Buscar pedidos para faturar
    let whereClause = "WHERE pfc.agrupamento_faturamento_id IN (SELECT id FROM agrupamentos_faturamentos WHERE agrupamento_id = $1 AND fornecedor_id = $2)";
    const params = [agrupamento_id, fornecedor_id];
    
    if (pedidos_ids && pedidos_ids.length > 0) {
      whereClause += " AND pfc.pedido_id = ANY($3)";
      params.push(pedidos_ids);
    }
    
    const pedidosParaFaturar = await db.all(`
      SELECT pfc.*, pm.numero_pedido, f.nome as nome_fornecedor
      FROM pedidos_faturamentos_controle pfc
      JOIN pedidos pm ON pfc.pedido_id = pm.id
      JOIN fornecedores f ON pfc.fornecedor_id = f.id
      ${whereClause}
      AND pfc.status = 'PENDENTE'
    `, params);
    
    if (pedidosParaFaturar.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Nenhum pedido pendente encontrado para faturamento"
      });
    }
    
    // Criar faturamento
    const numeroFaturamento = `FAT-${Date.now()}`;
    const valorTotal = pedidosParaFaturar.reduce((sum: number, pedido: any) => sum + parseFloat(pedido.valor_pedido), 0);
    
    const faturamento = await db.query(`
      INSERT INTO faturamentos 
      (numero_faturamento, pedido_id, status, usuario_criador_id, valor_total_faturado, 
       total_itens_faturados, fornecedor_id)
      VALUES ($1, $2, 'ATIVO', $3, $4, $5, $6)
      RETURNING *
    `, [numeroFaturamento, pedidosParaFaturar[0].pedido_id, usuario_id, valorTotal, pedidosParaFaturar.length, fornecedor_id]);
    
    // Atualizar controles de faturamento
    for (const pedido of pedidosParaFaturar) {
      await db.query(`
        UPDATE pedidos_faturamentos_controle 
        SET status = 'FATURADO', 
            faturamento_id = $1,
            data_faturamento = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [faturamento.rows[0].id, pedido.id]);
    }
    
    res.json({
      success: true,
      message: `Faturamento criado com sucesso para ${pedidosParaFaturar.length} pedido(s)`,
      data: {
        faturamento: faturamento.rows[0],
        pedidos_faturados: pedidosParaFaturar.length,
        valor_total: valorTotal
      }
    });
  } catch (error) {
    console.error("❌ Erro ao faturar fornecedor no agrupamento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao faturar fornecedor no agrupamento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Listar pedidos pendentes para agrupamento (por mês/ano)
export async function listarPedidosPendentesAgrupamento(req: Request, res: Response) {
  try {
    const { ano, mes } = req.query;
    
    if (!ano || !mes) {
      return res.status(400).json({
        success: false,
        message: "Ano e mês são obrigatórios"
      });
    }
    
    const pedidos = await db.all(`
      SELECT 
        pm.*,
        COUNT(DISTINCT pf.fornecedor_id) as total_fornecedores,
        SUM(pi.subtotal) as valor_total_calculado
      FROM pedidos pm
      JOIN pedidos_fornecedores pf ON pm.id = pf.pedido_id
      JOIN pedidos_itens pi ON pf.id = pi.pedido_fornecedor_id
      LEFT JOIN agrupamentos_pedidos ap ON pm.id = ap.pedido_id
      WHERE EXTRACT(YEAR FROM pm.data_criacao::timestamp) = $1
      AND EXTRACT(MONTH FROM pm.data_criacao::timestamp) = $2
      AND ap.pedido_id IS NULL
      GROUP BY pm.id, pm.numero_pedido, pm.usuario_id, pm.status, pm.valor_total, 
               pm.observacoes, pm.data_criacao, pm.data_atualizacao,
               pm.data_entrega_prevista, pm.criado_por, pm.atualizado_por, pm.fornecedor_id
      ORDER BY pm.data_criacao DESC
    `, [parseInt(ano as string), parseInt(mes as string)]);
    
    res.json({
      success: true,
      data: pedidos,
      total: pedidos.length
    });
  } catch (error) {
    console.error("❌ Erro ao listar pedidos pendentes:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar pedidos pendentes para agrupamento",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Obter resumo de faturamento por fornecedor
export async function obterResumoFaturamentoFornecedor(req: Request, res: Response) {
  try {
    const { agrupamento_id, fornecedor_id } = req.params;
    
    const resumo = await db.get(`
      SELECT 
        af.*,
        f.nome as nome_fornecedor,
        CASE 
          WHEN af.valor_total > 0 THEN ROUND((af.valor_faturado / af.valor_total) * 100, 2)
          ELSE 0 
        END as percentual_faturado
      FROM agrupamentos_faturamentos af
      JOIN fornecedores f ON af.fornecedor_id = f.id
      WHERE af.agrupamento_id = $1 AND af.fornecedor_id = $2
    `, [agrupamento_id, fornecedor_id]);
    
    if (!resumo) {
      return res.status(404).json({
        success: false,
        message: "Resumo de faturamento não encontrado"
      });
    }
    
    // Buscar pedidos do fornecedor no agrupamento
    const pedidos = await db.all(`
      SELECT 
        pfc.*,
        pm.numero_pedido,
        pm.data_criacao as data_pedido,
        fp.numero_faturamento,
        fp.data_criacao as data_faturamento
      FROM pedidos_faturamentos_controle pfc
      JOIN pedidos pm ON pfc.pedido_id = pm.id
      LEFT JOIN faturamentos fp ON pfc.faturamento_id = fp.id
      WHERE pfc.agrupamento_faturamento_id = $1
      ORDER BY pm.data_criacao DESC
    `, [resumo.id]);
    
    res.json({
      success: true,
      data: {
        resumo,
        pedidos
      }
    });
  } catch (error) {
    console.error("❌ Erro ao obter resumo de faturamento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter resumo de faturamento do fornecedor",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}