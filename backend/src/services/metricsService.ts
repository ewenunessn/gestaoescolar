import { Pool } from 'pg';

export interface MetricaRecebimento {
  data: Date;
  total_recebimentos: number;
  valor_total: number;
  produtos_diferentes: number;
  fornecedores_diferentes: number;
}

export interface TendenciaConsumo {
  produto_id: number;
  produto_nome: string;
  media_mensal: number;
  tendencia: 'crescente' | 'estavel' | 'decrescente';
  variacao_percentual: number;
}

export class MetricsService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async obterMetricasRecebimento(dataInicio: Date, dataFim: Date): Promise<MetricaRecebimento[]> {
    const query = `
      SELECT 
        DATE(r.data_recebimento) as data,
        COUNT(r.id) as total_recebimentos,
        COALESCE(SUM(ri.quantidade * ri.preco_unitario), 0) as valor_total,
        COUNT(DISTINCT ri.produto_id) as produtos_diferentes,
        COUNT(DISTINCT r.fornecedor_id) as fornecedores_diferentes
      FROM recebimentos r
      LEFT JOIN recebimentos_itens ri ON r.id = ri.recebimento_id
      WHERE r.data_recebimento BETWEEN $1 AND $2
      GROUP BY DATE(r.data_recebimento)
      ORDER BY data
    `;
    
    const result = await this.pool.query(query, [dataInicio, dataFim]);
    return result.rows;
  }

  async obterTendenciasConsumo(mesesAnalise: number = 6): Promise<TendenciaConsumo[]> {
    const query = `
      WITH consumo_mensal AS (
        SELECT 
          ri.produto_id,
          p.nome as produto_nome,
          DATE_TRUNC('month', r.data_recebimento) as mes,
          SUM(ri.quantidade) as quantidade_mes
        FROM recebimentos r
        JOIN recebimentos_itens ri ON r.id = ri.recebimento_id
        JOIN produtos p ON ri.produto_id = p.id
        WHERE r.data_recebimento >= CURRENT_DATE - INTERVAL '${mesesAnalise} months'
        GROUP BY ri.produto_id, p.nome, DATE_TRUNC('month', r.data_recebimento)
      ),
      tendencias AS (
        SELECT 
          produto_id,
          produto_nome,
          AVG(quantidade_mes) as media_mensal,
          CASE 
            WHEN COUNT(*) < 2 THEN 0
            ELSE (
              (SUM((EXTRACT(EPOCH FROM mes) - AVG(EXTRACT(EPOCH FROM mes))) * quantidade_mes) / 
               NULLIF(SUM(POWER(EXTRACT(EPOCH FROM mes) - AVG(EXTRACT(EPOCH FROM mes)), 2)), 0)) * 2629746
            )
          END as coeficiente_angular
        FROM consumo_mensal
        GROUP BY produto_id, produto_nome
        HAVING COUNT(*) >= 2
      )
      SELECT 
        produto_id,
        produto_nome,
        media_mensal,
        CASE 
          WHEN coeficiente_angular > 0.1 THEN 'crescente'
          WHEN coeficiente_angular < -0.1 THEN 'decrescente'
          ELSE 'estavel'
        END as tendencia,
        ROUND((coeficiente_angular / NULLIF(media_mensal, 0)) * 100, 2) as variacao_percentual
      FROM tendencias
      WHERE media_mensal > 0
      ORDER BY media_mensal DESC
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  async obterProdutosMaisRecebidos(limite: number = 10, dataInicio?: Date, dataFim?: Date): Promise<any[]> {
    let query = `
      SELECT 
        p.id,
        p.nome,
        p.categoria,
        SUM(ri.quantidade) as quantidade_total,
        COUNT(DISTINCT r.id) as recebimentos_count,
        AVG(ri.preco_unitario) as preco_medio,
        SUM(ri.quantidade * ri.preco_unitario) as valor_total
      FROM produtos p
      JOIN recebimentos_itens ri ON p.id = ri.produto_id
      JOIN recebimentos r ON ri.recebimento_id = r.id
    `;
    
    const values: any[] = [];
    let paramCount = 1;

    if (dataInicio && dataFim) {
      query += ` WHERE r.data_recebimento BETWEEN $${paramCount} AND $${paramCount + 1}`;
      values.push(dataInicio, dataFim);
      paramCount += 2;
    }

    query += `
      GROUP BY p.id, p.nome, p.categoria
      ORDER BY quantidade_total DESC
      LIMIT $${paramCount}
    `;
    
    values.push(limite);

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async obterEstatisticasGerais(): Promise<any> {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM produtos WHERE ativo = true) as produtos_ativos,
        (SELECT COUNT(*) FROM escolas WHERE ativa = true) as escolas_ativas,
        (SELECT COUNT(*) FROM fornecedores WHERE ativo = true) as fornecedores_ativos,
        (SELECT COUNT(*) FROM contratos WHERE status = 'ativo') as contratos_ativos,
        (SELECT COUNT(*) FROM pedidos WHERE status = 'pendente') as pedidos_pendentes,
        (SELECT COUNT(*) FROM recebimentos WHERE DATE(data_recebimento) = CURRENT_DATE) as recebimentos_hoje,
        (SELECT COALESCE(SUM(quantidade_atual), 0) FROM estoque) as estoque_total,
        (SELECT COUNT(*) FROM estoque WHERE quantidade_atual <= quantidade_minima) as produtos_estoque_baixo
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async obterMetricasPorEscola(escolaId?: number): Promise<any[]> {
    let query = `
      SELECT 
        e.id,
        e.nome,
        COUNT(DISTINCT p.id) as total_pedidos,
        COUNT(DISTINCT r.id) as total_recebimentos,
        COALESCE(SUM(ri.quantidade * ri.preco_unitario), 0) as valor_total_recebido,
        COUNT(DISTINCT ri.produto_id) as produtos_diferentes
      FROM escolas e
      LEFT JOIN pedidos p ON e.id = p.escola_id
      LEFT JOIN recebimentos r ON e.id = r.escola_id
      LEFT JOIN recebimentos_itens ri ON r.id = ri.recebimento_id
      WHERE e.ativa = true
    `;
    
    const values: any[] = [];
    
    if (escolaId) {
      query += ' AND e.id = $1';
      values.push(escolaId);
    }

    query += `
      GROUP BY e.id, e.nome
      ORDER BY valor_total_recebido DESC
    `;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async obterMetricasPorFornecedor(fornecedorId?: number): Promise<any[]> {
    let query = `
      SELECT 
        f.id,
        f.nome,
        f.cnpj,
        COUNT(DISTINCT p.id) as total_pedidos,
        COUNT(DISTINCT r.id) as total_recebimentos,
        COALESCE(SUM(ri.quantidade * ri.preco_unitario), 0) as valor_total_fornecido,
        COUNT(DISTINCT ri.produto_id) as produtos_diferentes,
        AVG(EXTRACT(DAY FROM (r.data_recebimento - p.data_pedido))) as tempo_medio_entrega
      FROM fornecedores f
      LEFT JOIN pedidos p ON f.id = p.fornecedor_id
      LEFT JOIN recebimentos r ON p.id = r.pedido_id
      LEFT JOIN recebimentos_itens ri ON r.id = ri.recebimento_id
      WHERE f.ativo = true
    `;
    
    const values: any[] = [];
    
    if (fornecedorId) {
      query += ' AND f.id = $1';
      values.push(fornecedorId);
    }

    query += `
      GROUP BY f.id, f.nome, f.cnpj
      ORDER BY valor_total_fornecido DESC
    `;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async obterEvolucaoEstoque(produtoId: number, dias: number = 30): Promise<any[]> {
    const query = `
      WITH movimentacoes AS (
        SELECT 
          DATE(r.data_recebimento) as data,
          SUM(ri.quantidade) as entrada
        FROM recebimentos r
        JOIN recebimentos_itens ri ON r.id = ri.recebimento_id
        WHERE ri.produto_id = $1
          AND r.data_recebimento >= CURRENT_DATE - INTERVAL '${dias} days'
        GROUP BY DATE(r.data_recebimento)
        
        UNION ALL
        
        SELECT 
          DATE(created_at) as data,
          -quantidade as entrada
        FROM estoque_movimentacoes
        WHERE produto_id = $1
          AND tipo_movimentacao = 'saida'
          AND created_at >= CURRENT_DATE - INTERVAL '${dias} days'
      )
      SELECT 
        data,
        SUM(entrada) as saldo_dia,
        SUM(SUM(entrada)) OVER (ORDER BY data) as saldo_acumulado
      FROM movimentacoes
      GROUP BY data
      ORDER BY data
    `;
    
    const result = await this.pool.query(query, [produtoId]);
    return result.rows;
  }

  async obterIndicadoresPerformance(): Promise<any> {
    const query = `
      SELECT 
        -- Indicadores de Pedidos
        (SELECT COUNT(*) FROM pedidos WHERE status = 'entregue' AND DATE(updated_at) >= CURRENT_DATE - INTERVAL '30 days') as pedidos_entregues_mes,
        (SELECT COUNT(*) FROM pedidos WHERE status = 'cancelado' AND DATE(updated_at) >= CURRENT_DATE - INTERVAL '30 days') as pedidos_cancelados_mes,
        (SELECT AVG(EXTRACT(DAY FROM (data_entrega_prevista - data_pedido))) FROM pedidos WHERE status = 'entregue') as tempo_medio_entrega,
        
        -- Indicadores de Estoque
        (SELECT COUNT(*) FROM estoque WHERE quantidade_atual = 0) as produtos_sem_estoque,
        (SELECT COUNT(*) FROM estoque WHERE quantidade_atual <= quantidade_minima) as produtos_estoque_critico,
        (SELECT AVG(quantidade_atual / NULLIF(quantidade_minima, 0)) FROM estoque WHERE quantidade_minima > 0) as indice_cobertura_estoque,
        
        -- Indicadores de Pedidos
        (SELECT COALESCE(SUM(valor_total), 0) FROM pedidos WHERE status = 'entregue' AND DATE(updated_at) >= CURRENT_DATE - INTERVAL '30 days') as valor_pedidos_mes,
        (SELECT COALESCE(SUM(saldo_disponivel), 0) FROM contratos WHERE status = 'ativo') as saldo_total_contratos,
        
        -- Indicadores de Qualidade (removidos - módulo de controle de qualidade desabilitado)
        0 as produtos_rejeitados_mes,
        0 as produtos_vencendo
    `;
    
    const result = await this.pool.query(query);
    return result.rows[0];
  }

  async gerarRelatorioConsolidado(dataInicio: Date, dataFim: Date): Promise<any> {
    const metricas = await this.obterMetricasRecebimento(dataInicio, dataFim);
    const tendencias = await this.obterTendenciasConsumo();
    const produtosMaisRecebidos = await this.obterProdutosMaisRecebidos(10, dataInicio, dataFim);
    const estatisticasGerais = await this.obterEstatisticasGerais();
    const indicadores = await this.obterIndicadoresPerformance();

    return {
      periodo: { inicio: dataInicio, fim: dataFim },
      metricas_recebimento: metricas,
      tendencias_consumo: tendencias,
      produtos_mais_recebidos: produtosMaisRecebidos,
      estatisticas_gerais: estatisticasGerais,
      indicadores_performance: indicadores,
      gerado_em: new Date()
    };
  }
}