// Controller para funcionalidades PNAE (Lei 11.947/2009)
import { Request, Response } from 'express';
import db from '../../../database';

/**
 * Obter relatório de agricultura familiar
 * Calcula o percentual de compras de agricultura familiar
 */
export const getRelatorioAgriculturaFamiliar = async (req: Request, res: Response) => {
  try {
    const { ano, mes_inicio, mes_fim } = req.query;

    let whereClause = '1=1';
    const params: any[] = [];

    if (ano) {
      whereClause += ` AND EXTRACT(YEAR FROM data_pedido) = $${params.length + 1}`;
      params.push(ano);
    }

    if (mes_inicio) {
      whereClause += ` AND EXTRACT(MONTH FROM data_pedido) >= $${params.length + 1}`;
      params.push(mes_inicio);
    }

    if (mes_fim) {
      whereClause += ` AND EXTRACT(MONTH FROM data_pedido) <= $${params.length + 1}`;
      params.push(mes_fim);
    }

    const query = `
      SELECT 
        COUNT(DISTINCT pedido_id) as total_pedidos,
        COUNT(DISTINCT fornecedor_id) as total_fornecedores,
        SUM(valor_itens) as valor_total,
        SUM(valor_agricultura_familiar) as valor_agricultura_familiar,
        ROUND(
          (SUM(valor_agricultura_familiar) / NULLIF(SUM(valor_itens), 0) * 100)::numeric, 
          2
        ) as percentual_agricultura_familiar,
        CASE 
          WHEN (SUM(valor_agricultura_familiar) / NULLIF(SUM(valor_itens), 0) * 100) >= 30 
          THEN true 
          ELSE false 
        END as atende_requisito_30_porcento
      FROM vw_pnae_agricultura_familiar
      WHERE ${whereClause}
    `;

    const result = await db.query(query, params);

    // Buscar detalhamento por fornecedor
    const detalhamentoQuery = `
      SELECT 
        fornecedor_id,
        fornecedor_nome,
        tipo_fornecedor,
        COUNT(DISTINCT pedido_id) as total_pedidos,
        SUM(valor_itens) as valor_total,
        SUM(valor_agricultura_familiar) as valor_agricultura_familiar
      FROM vw_pnae_agricultura_familiar
      WHERE ${whereClause}
      GROUP BY fornecedor_id, fornecedor_nome, tipo_fornecedor
      ORDER BY valor_total DESC
    `;

    const detalhamento = await db.query(detalhamentoQuery, params);

    res.json({
      success: true,
      data: {
        resumo: result.rows[0],
        detalhamento_fornecedores: detalhamento.rows,
        periodo: {
          ano: ano || 'Todos',
          mes_inicio: mes_inicio || 'Todos',
          mes_fim: mes_fim || 'Todos'
        }
      }
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório agricultura familiar:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório de agricultura familiar',
      error: error.message
    });
  }
};

/**
 * Obter relatório per capita por modalidade
 */
export const getRelatorioPerCapita = async (req: Request, res: Response) => {
  try {
    const { ano } = req.query;

    const query = `
      SELECT 
        modalidade_id,
        modalidade_nome,
        ano,
        valor_per_capita,
        dias_letivos,
        total_pedidos,
        valor_total_gasto,
        total_escolas,
        ROUND(
          (valor_total_gasto / NULLIF(total_escolas * dias_letivos, 0))::numeric,
          2
        ) as valor_per_capita_real
      FROM vw_pnae_per_capita_modalidade
      WHERE ano = $1 OR $1 IS NULL
      ORDER BY modalidade_nome
    `;

    const result = await db.query(query, [ano || null]);

    res.json({
      success: true,
      data: {
        modalidades: result.rows,
        ano: ano || new Date().getFullYear()
      }
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório per capita:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar relatório per capita',
      error: error.message
    });
  }
};

/**
 * Obter valores per capita configurados
 */
export const getValoresPerCapita = async (req: Request, res: Response) => {
  try {
    const { ano } = req.query;

    const query = `
      SELECT 
        pc.id,
        pc.modalidade_id,
        m.nome as modalidade_nome,
        pc.ano,
        pc.valor_per_capita,
        pc.dias_letivos,
        pc.ativo,
        pc.created_at,
        pc.updated_at
      FROM pnae_per_capita pc
      JOIN modalidades m ON pc.modalidade_id = m.id
      WHERE pc.ano = $1 OR $1 IS NULL
      ORDER BY pc.ano DESC, m.nome
    `;

    const result = await db.query(query, [ano || null]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Erro ao buscar valores per capita:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar valores per capita',
      error: error.message
    });
  }
};

/**
 * Atualizar valor per capita
 */
export const atualizarValorPerCapita = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { valor_per_capita, dias_letivos, ativo } = req.body;

    const query = `
      UPDATE pnae_per_capita
      SET 
        valor_per_capita = COALESCE($1, valor_per_capita),
        dias_letivos = COALESCE($2, dias_letivos),
        ativo = COALESCE($3, ativo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(query, [valor_per_capita, dias_letivos, ativo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Valor per capita não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Valor per capita atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao atualizar valor per capita:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar valor per capita',
      error: error.message
    });
  }
};

/**
 * Criar novo valor per capita
 */
export const criarValorPerCapita = async (req: Request, res: Response) => {
  try {
    const { modalidade_id, ano, valor_per_capita, dias_letivos } = req.body;

    // Validações
    if (!modalidade_id || !ano || !valor_per_capita) {
      return res.status(400).json({
        success: false,
        message: 'Campos obrigatórios: modalidade_id, ano, valor_per_capita'
      });
    }

    const query = `
      INSERT INTO pnae_per_capita (modalidade_id, ano, valor_per_capita, dias_letivos)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (modalidade_id, ano) 
      DO UPDATE SET 
        valor_per_capita = EXCLUDED.valor_per_capita,
        dias_letivos = EXCLUDED.dias_letivos,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await db.query(query, [
      modalidade_id,
      ano,
      valor_per_capita,
      dias_letivos || 200
    ]);

    res.status(201).json({
      success: true,
      message: 'Valor per capita criado/atualizado com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao criar valor per capita:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar valor per capita',
      error: error.message
    });
  }
};

/**
 * Salvar relatório gerado
 */
export const salvarRelatorio = async (req: Request, res: Response) => {
  try {
    const {
      tipo_relatorio,
      ano,
      mes,
      periodo_inicio,
      periodo_fim,
      dados_json,
      percentual_agricultura_familiar,
      valor_total,
      valor_agricultura_familiar,
      observacoes
    } = req.body;

    const userId = (req as any).user?.id; // Assumindo que tem middleware de autenticação

    const query = `
      INSERT INTO pnae_relatorios (
        tipo_relatorio,
        ano,
        mes,
        periodo_inicio,
        periodo_fim,
        dados_json,
        percentual_agricultura_familiar,
        valor_total,
        valor_agricultura_familiar,
        gerado_por,
        observacoes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await db.query(query, [
      tipo_relatorio,
      ano,
      mes,
      periodo_inicio,
      periodo_fim,
      JSON.stringify(dados_json),
      percentual_agricultura_familiar,
      valor_total,
      valor_agricultura_familiar,
      userId,
      observacoes
    ]);

    res.status(201).json({
      success: true,
      message: 'Relatório salvo com sucesso',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao salvar relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao salvar relatório',
      error: error.message
    });
  }
};

/**
 * Listar relatórios salvos
 */
export const listarRelatorios = async (req: Request, res: Response) => {
  try {
    const { tipo_relatorio, ano, mes } = req.query;

    let whereClause = '1=1';
    const params: any[] = [];

    if (tipo_relatorio) {
      whereClause += ` AND tipo_relatorio = $${params.length + 1}`;
      params.push(tipo_relatorio);
    }

    if (ano) {
      whereClause += ` AND ano = $${params.length + 1}`;
      params.push(ano);
    }

    if (mes) {
      whereClause += ` AND mes = $${params.length + 1}`;
      params.push(mes);
    }

    const query = `
      SELECT 
        r.*,
        u.nome as gerado_por_nome
      FROM pnae_relatorios r
      LEFT JOIN usuarios u ON r.gerado_por = u.id
      WHERE ${whereClause}
      ORDER BY r.gerado_em DESC
      LIMIT 100
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Erro ao listar relatórios:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar relatórios',
      error: error.message
    });
  }
};

/**
 * Dashboard PNAE - Resumo geral
 */
export const getDashboardPNAE = async (req: Request, res: Response) => {
  try {
    // Buscar período ativo
    const periodoQuery = await db.query(`
      SELECT id, ano, data_inicio, data_fim
      FROM periodos
      WHERE ativo = true
      LIMIT 1
    `);

    if (periodoQuery.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum período ativo encontrado. Configure um período ativo no sistema.'
      });
    }

    const periodoAtivo = periodoQuery.rows[0];
    const anoAtual = periodoAtivo.ano;

    // Calcular valor total recebido do FNDE (soma dos repasses * parcelas das modalidades)
    const valorRecebidoQuery = `
      SELECT COALESCE(SUM(valor_repasse * COALESCE(parcelas, 1)), 0) as valor_total_fnde
      FROM modalidades
      WHERE ativo = true
    `;
    const valorRecebidoResult = await db.query(valorRecebidoQuery);
    const valorTotalFNDE = parseFloat(valorRecebidoResult.rows[0].valor_total_fnde);

    // Percentual agricultura familiar do período ativo
    const afQuery = `
      SELECT 
        SUM(valor_itens) as valor_total,
        SUM(valor_agricultura_familiar) as valor_af,
        COUNT(DISTINCT pedido_id) as total_pedidos
      FROM vw_pnae_agricultura_familiar
      WHERE EXTRACT(YEAR FROM TO_DATE(competencia_mes_ano || '-01', 'YYYY-MM-DD')) = $1
    `;

    const afResult = await db.query(afQuery, [anoAtual]);
    const valorAF = parseFloat(afResult.rows[0].valor_af || 0);
    const valorTotal = parseFloat(afResult.rows[0].valor_total || 0);
    
    // Calcular percentual sobre valor recebido do FNDE (correto)
    const percentualAF = valorTotalFNDE > 0 ? (valorAF / valorTotalFNDE * 100) : 0;
    // Lei nº 15.226/2025: aumentou de 30% para 45% a partir de 2026
    const percentualMinimoObrigatorio = 45;
    
    // Fornecedores agricultura familiar
    const fornecedoresQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE data_validade_dap < CURRENT_DATE) as vencidos,
        COUNT(*) FILTER (WHERE data_validade_dap BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as vencendo
      FROM fornecedores
      WHERE tipo_fornecedor IN ('AGRICULTURA_FAMILIAR', 'COOPERATIVA_AF', 'ASSOCIACAO_AF')
    `;

    const fornecedoresResult = await db.query(fornecedoresQuery);

    // Evolução mensal - ACUMULADO no ano
    const evolucaoQuery = `
      WITH meses_ordenados AS (
        SELECT 
          CAST(SPLIT_PART(competencia_mes_ano, '-', 2) AS INTEGER) as mes,
          CASE CAST(SPLIT_PART(competencia_mes_ano, '-', 2) AS INTEGER)
            WHEN 1 THEN 'Jan/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 2 THEN 'Fev/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 3 THEN 'Mar/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 4 THEN 'Abr/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 5 THEN 'Mai/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 6 THEN 'Jun/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 7 THEN 'Jul/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 8 THEN 'Ago/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 9 THEN 'Set/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 10 THEN 'Out/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 11 THEN 'Nov/' || SPLIT_PART(competencia_mes_ano, '-', 1)
            WHEN 12 THEN 'Dez/' || SPLIT_PART(competencia_mes_ano, '-', 1)
          END as mes_nome,
          SUM(valor_itens) as valor_total,
          SUM(valor_agricultura_familiar) as valor_af
        FROM vw_pnae_agricultura_familiar
        WHERE EXTRACT(YEAR FROM TO_DATE(competencia_mes_ano || '-01', 'YYYY-MM-DD')) = $1
        GROUP BY competencia_mes_ano, CAST(SPLIT_PART(competencia_mes_ano, '-', 2) AS INTEGER)
      )
      SELECT 
        mes,
        mes_nome,
        SUM(valor_total) OVER (ORDER BY mes) as valor_total_acumulado,
        SUM(valor_af) OVER (ORDER BY mes) as valor_af_acumulado,
        valor_total as valor_total_mes,
        valor_af as valor_af_mes
      FROM meses_ordenados
      ORDER BY mes
    `;

    const evolucaoResult = await db.query(evolucaoQuery, [anoAtual]);
    
    // Calcular percentual acumulado sobre valor recebido FNDE
    const evolucaoMensal = evolucaoResult.rows.map(row => ({
      mes: row.mes,
      mes_nome: row.mes_nome,
      valor_total: parseFloat(row.valor_total_mes || 0),
      valor_af: parseFloat(row.valor_af_mes || 0),
      valor_total_acumulado: parseFloat(row.valor_total_acumulado || 0),
      valor_af_acumulado: parseFloat(row.valor_af_acumulado || 0),
      percentual_af: valorTotalFNDE > 0 ? 
        (parseFloat(row.valor_af_acumulado || 0) / valorTotalFNDE * 100) : 0
    }));

    res.json({
      success: true,
      data: {
        ano: anoAtual,
        periodo: {
          id: periodoAtivo.id,
          ano: periodoAtivo.ano,
          data_inicio: periodoAtivo.data_inicio,
          data_fim: periodoAtivo.data_fim
        },
        valor_recebido_fnde: valorTotalFNDE,
        percentual_minimo_obrigatorio: percentualMinimoObrigatorio,
        agricultura_familiar: {
          percentual_af: percentualAF.toFixed(2),
          valor_total: valorTotal,
          valor_af: valorAF,
          total_pedidos: parseInt(afResult.rows[0].total_pedidos || 0),
          valor_minimo_obrigatorio: (valorTotalFNDE * percentualMinimoObrigatorio / 100).toFixed(2),
          valor_faltante: Math.max(0, (valorTotalFNDE * percentualMinimoObrigatorio / 100) - valorAF).toFixed(2)
        },
        fornecedores: fornecedoresResult.rows[0],
        evolucao_mensal: evolucaoMensal,
        alertas: {
          atende_30_porcento: percentualAF >= percentualMinimoObrigatorio,
          fornecedores_vencidos: parseInt(fornecedoresResult.rows[0]?.vencidos || '0') > 0,
          fornecedores_vencendo: parseInt(fornecedoresResult.rows[0]?.vencendo || '0') > 0
        }
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar dashboard PNAE:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dashboard PNAE',
      error: error.message
    });
  }
};
