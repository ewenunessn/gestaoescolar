import { Request, Response } from 'express';
import db from '../database';
import { toNum } from '../utils/typeHelpers';

// ─── Tipos internos ───────────────────────────────────────────────────────────
interface Periodo {
  data_inicio: string; // YYYY-MM-DD
  data_fim: string;
}

interface ProdutoDemanda {
  produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_kg: number;
}

// ─── Helper: calcular demanda de produtos para um período ────────────────────
async function calcularDemandaPeriodo(
  ano: number,
  mes: number,
  data_inicio: string,
  data_fim: string,
  escola_ids?: number[]
): Promise<ProdutoDemanda[]> {
  const diaInicio = parseInt(data_inicio.split('-')[2]);
  const diaFim = parseInt(data_fim.split('-')[2]);

  const cardapiosQuery = await db.pool.query(`
    SELECT DISTINCT cm.id, cm.modalidade_id
    FROM cardapios_modalidade cm
    INNER JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
    WHERE cm.ativo = true AND cm.ano = $1 AND cm.mes = $2
  `, [ano, mes]);

  if (cardapiosQuery.rows.length === 0) return [];

  const escolasQuery = escola_ids && escola_ids.length > 0
    ? await db.pool.query(`
        SELECT e.id as escola_id, em.modalidade_id, em.quantidade_alunos as numero_alunos
        FROM escolas e
        INNER JOIN escola_modalidades em ON em.escola_id = e.id
        WHERE e.id = ANY($1) AND e.ativo = true
      `, [escola_ids])
    : await db.pool.query(`
        SELECT e.id as escola_id, em.modalidade_id, em.quantidade_alunos as numero_alunos
        FROM escolas e
        INNER JOIN escola_modalidades em ON em.escola_id = e.id
        WHERE e.ativo = true
      `);

  const escolas = escolasQuery.rows;
  if (escolas.length === 0) return [];

  const refeicoesQuery = await db.pool.query(`
    SELECT
      crd.dia,
      cm.modalidade_id,
      rp.produto_id,
      p.nome as produto_nome,
      p.unidade,
      COALESCE(p.fator_correcao, 1.0) as fator_correcao,
      COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
      rp.tipo_medida
    FROM cardapio_refeicoes_dia crd
    INNER JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
    INNER JOIN refeicoes r ON r.id = crd.refeicao_id
    INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
    INNER JOIN produtos p ON p.id = rp.produto_id
    LEFT JOIN refeicao_produto_modalidade rpm
      ON rpm.refeicao_produto_id = rp.id AND rpm.modalidade_id = cm.modalidade_id
    WHERE crd.cardapio_modalidade_id = ANY($1)
      AND crd.ativo = true
      AND crd.dia BETWEEN $2 AND $3
  `, [cardapiosQuery.rows.map((c: any) => c.id), diaInicio, diaFim]);

  // Agrupar por modalidade → produto → ocorrências
  const porModalidade = new Map<number, Map<number, any[]>>();
  for (const ref of refeicoesQuery.rows) {
    if (!porModalidade.has(ref.modalidade_id)) porModalidade.set(ref.modalidade_id, new Map());
    const pm = porModalidade.get(ref.modalidade_id)!;
    if (!pm.has(ref.produto_id)) pm.set(ref.produto_id, []);
    pm.get(ref.produto_id)!.push(ref);
  }

  const totais = new Map<number, ProdutoDemanda>();

  for (const escola of escolas) {
    const pm = porModalidade.get(escola.modalidade_id);
    if (!pm) continue;

    for (const [produto_id, ocorrencias] of pm.entries()) {
      const ref = ocorrencias[0];
      const perCapita = toNum(ref.per_capita, 0);
      const fator = toNum(ref.fator_correcao, 1.0);
      const perCapitaBruto = perCapita * fator;
      const perCapitaGramas = ref.tipo_medida === 'unidades' ? perCapitaBruto * 100 : perCapitaBruto;
      const qtdKg = (escola.numero_alunos * perCapitaGramas * ocorrencias.length) / 1000;

      if (!totais.has(produto_id)) {
        totais.set(produto_id, {
          produto_id,
          produto_nome: ref.produto_nome,
          unidade: ref.unidade,
          quantidade_kg: 0
        });
      }
      totais.get(produto_id)!.quantidade_kg += qtdKg;
    }
  }

  return Array.from(totais.values()).map(p => ({
    ...p,
    quantidade_kg: Math.round(p.quantidade_kg * 1000) / 1000
  }));
}

// ─── Gerar pedidos por período ────────────────────────────────────────────────
export const gerarPedidosPorPeriodo = async (req: Request, res: Response) => {
  const { competencia, periodos, escola_ids, observacoes } = req.body as {
    competencia: string;
    periodos: Periodo[];
    escola_ids?: number[];
    observacoes?: string;
  };

  if (!competencia || !periodos || periodos.length === 0) {
    return res.status(400).json({ error: 'Competência e períodos são obrigatórios' });
  }

  const [ano, mes] = competencia.split('-').map(Number);
  const usuario_id = (req as any).user?.id || 1;

  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const mesAbrev = meses[mes - 1];

  const pedidosCriados: any[] = [];
  const erros: any[] = [];

  for (const periodo of periodos) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Calcular demanda do período
      const demanda = await calcularDemandaPeriodo(ano, mes, periodo.data_inicio, periodo.data_fim, escola_ids);

      if (demanda.length === 0) {
        erros.push({ periodo, motivo: 'Nenhum produto calculado para este período' });
        await client.query('ROLLBACK');
        continue;
      }

      // 2. Cruzar produtos com contratos ativos
      const produtoIds = demanda.map(d => d.produto_id);
      const contratosQuery = await client.query(`
        SELECT
          cp.id as contrato_produto_id,
          cp.produto_id,
          cp.preco_unitario,
          cp.quantidade_contratada,
          COALESCE(
            cp.quantidade_contratada - COALESCE((
              SELECT SUM(pi.quantidade)
              FROM pedido_itens pi
              WHERE pi.contrato_produto_id = cp.id
            ), 0),
            cp.quantidade_contratada
          ) as saldo_disponivel,
          c.id as contrato_id,
          c.numero as contrato_numero,
          f.nome as fornecedor_nome
        FROM contrato_produtos cp
        JOIN contratos c ON c.id = cp.contrato_id
        JOIN fornecedores f ON f.id = c.fornecedor_id
        WHERE cp.produto_id = ANY($1)
          AND cp.ativo = true
          AND c.status = 'ativo'
          AND c.data_fim >= CURRENT_DATE
        ORDER BY cp.produto_id, c.data_fim ASC
      `, [produtoIds]);

      // Mapear produto_id → melhor contrato (primeiro ativo encontrado)
      const contratosPorProduto = new Map<number, any>();
      for (const row of contratosQuery.rows) {
        if (!contratosPorProduto.has(row.produto_id)) {
          contratosPorProduto.set(row.produto_id, row);
        }
      }

      // 3. Montar itens do pedido
      const itens: any[] = [];
      const semContrato: string[] = [];

      for (const prod of demanda) {
        const contrato = contratosPorProduto.get(prod.produto_id);
        if (!contrato) {
          semContrato.push(prod.produto_nome);
          continue;
        }
        itens.push({
          contrato_produto_id: contrato.contrato_produto_id,
          produto_id: prod.produto_id,
          quantidade: prod.quantidade_kg,
          preco_unitario: toNum(contrato.preco_unitario),
          valor_total: prod.quantidade_kg * toNum(contrato.preco_unitario),
          data_entrega_prevista: periodo.data_inicio,
          observacoes: `Gerado automaticamente pelo planejamento. Período: ${periodo.data_inicio} a ${periodo.data_fim}`
        });
      }

      if (itens.length === 0) {
        erros.push({ periodo, motivo: `Nenhum produto com contrato ativo. Sem contrato: ${semContrato.join(', ')}` });
        await client.query('ROLLBACK');
        continue;
      }

      // 4. Gerar número do pedido
      const maxResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM LENGTH(numero) - 5) AS INTEGER)), 0) as max_seq
        FROM pedidos WHERE competencia_mes_ano = $1
      `, [competencia]);
      const seq = (parseInt(maxResult.rows[0].max_seq) + 1).toString().padStart(6, '0');
      const numero = `PED-${mesAbrev}${ano}${seq}`;

      const valorTotal = itens.reduce((s, i) => s + i.valor_total, 0);
      const obsTexto = [
        observacoes,
        `Planejamento: ${periodo.data_inicio} a ${periodo.data_fim}`,
        semContrato.length > 0 ? `Sem contrato (não incluídos): ${semContrato.join(', ')}` : null
      ].filter(Boolean).join(' | ');

      // 5. Inserir pedido
      const pedidoResult = await client.query(`
        INSERT INTO pedidos (numero, data_pedido, status, valor_total, observacoes, usuario_criacao_id, competencia_mes_ano)
        VALUES ($1, CURRENT_DATE, 'pendente', $2, $3, $4, $5)
        RETURNING *
      `, [numero, valorTotal, obsTexto, usuario_id, competencia]);

      const pedido_id = pedidoResult.rows[0].id;

      // 6. Inserir itens
      for (const item of itens) {
        await client.query(`
          INSERT INTO pedido_itens (pedido_id, contrato_produto_id, produto_id, quantidade, preco_unitario, valor_total, data_entrega_prevista, observacoes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [pedido_id, item.contrato_produto_id, item.produto_id, item.quantidade, item.preco_unitario, item.valor_total, item.data_entrega_prevista, item.observacoes]);
      }

      await client.query('COMMIT');

      pedidosCriados.push({
        pedido_id,
        numero,
        periodo,
        total_itens: itens.length,
        valor_total: valorTotal,
        sem_contrato: semContrato
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao gerar pedido para período:', periodo, error);
      erros.push({ periodo, motivo: error instanceof Error ? error.message : 'Erro interno' });
    } finally {
      client.release();
    }
  }

  return res.status(pedidosCriados.length > 0 ? 201 : 400).json({
    pedidos_criados: pedidosCriados,
    erros,
    total_criados: pedidosCriados.length,
    total_erros: erros.length
  });
};

// Calcular demanda baseado em competência (busca cardápios automaticamente)
export const calcularDemandaPorCompetencia = async (req: Request, res: Response) => {
  const { competencia, data_inicio, data_fim, escola_ids } = req.body as {
    competencia: string; // formato: YYYY-MM
    data_inicio: string;
    data_fim: string;
    escola_ids?: number[];
  };

  console.log('📊 Calcular demanda por competência:', { competencia, data_inicio, data_fim, escola_ids });

  try {
    if (!competencia) {
      console.log('❌ Competência não fornecida');
      return res.status(400).json({ error: 'Competência é obrigatória' });
    }

    if (!data_inicio || !data_fim) {
      console.log('❌ Período não fornecido');
      return res.status(400).json({ error: 'Período é obrigatório' });
    }

    // Buscar cardápios ativos na competência
    const [ano, mes] = competencia.split('-').map(Number);
    const primeiroDiaCompetencia = new Date(ano, mes - 1, 1);
    const ultimoDiaCompetencia = new Date(ano, mes, 0);

    const primeiroDiaStr = primeiroDiaCompetencia.toISOString().split('T')[0];
    const ultimoDiaStr = ultimoDiaCompetencia.toISOString().split('T')[0];

    console.log('📅 Buscando cardápios para competência:', {
      competencia,
      primeiroDia: primeiroDiaStr,
      ultimoDia: ultimoDiaStr
    });

    // Buscar cardápios NOVOS (cardapios_modalidade) da competência
    const cardapiosQuery = await db.pool.query(`
      SELECT DISTINCT 
        cm.id, 
        cm.nome, 
        cm.modalidade_id,
        cm.mes,
        cm.ano
      FROM cardapios_modalidade cm
      INNER JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
      WHERE cm.ativo = true
        AND cm.ano = $1
        AND cm.mes = $2
      ORDER BY cm.nome
    `, [ano, mes]);

    const cardapios = cardapiosQuery.rows;
    console.log('📋 Cardápios encontrados:', {
      total: cardapios.length,
      cardapios: cardapios.map(c => ({
        id: c.id,
        nome: c.nome,
        modalidade_id: c.modalidade_id,
        mes: c.mes,
        ano: c.ano
      }))
    });

    if (cardapios.length === 0) {
      console.log('❌ Nenhum cardápio encontrado para a competência');
      
      // Buscar cardápios próximos
      const cardapiosProximos = await db.pool.query(`
        SELECT id, nome, mes, ano, modalidade_id
        FROM cardapios_modalidade
        WHERE ativo = true
        ORDER BY ano DESC, mes DESC
        LIMIT 3
      `);
      
      return res.status(400).json({ 
        error: 'Nenhum cardápio encontrado para esta competência',
        detalhes: `Não há cardápios ativos para ${competencia}. Cadastre cardápios em Cardápios > Cardápios por Modalidade.`,
        sugestoes: cardapiosProximos.rows.length > 0 ? {
          mensagem: 'Cardápios mais próximos encontrados:',
          cardapios: cardapiosProximos.rows
        } : null
      });
    }

    // Buscar escolas com suas modalidades
    const escolasQuery = escola_ids && escola_ids.length > 0
      ? await db.pool.query(`
          SELECT 
            e.id as escola_id, 
            e.nome as escola_nome, 
            em.modalidade_id, 
            em.quantidade_alunos as numero_alunos, 
            m.nome as modalidade_nome
          FROM escolas e
          INNER JOIN escola_modalidades em ON em.escola_id = e.id
          INNER JOIN modalidades m ON m.id = em.modalidade_id
          WHERE e.id = ANY($1) AND e.ativo = true
          ORDER BY e.nome, m.nome
        `, [escola_ids])
      : await db.pool.query(`
          SELECT 
            e.id as escola_id, 
            e.nome as escola_nome, 
            em.modalidade_id, 
            em.quantidade_alunos as numero_alunos, 
            m.nome as modalidade_nome
          FROM escolas e
          INNER JOIN escola_modalidades em ON em.escola_id = e.id
          INNER JOIN modalidades m ON m.id = em.modalidade_id
          WHERE e.ativo = true
          ORDER BY e.nome, m.nome
        `);

    const escolas = escolasQuery.rows;

    if (escolas.length === 0) {
      return res.status(400).json({ error: 'Nenhuma escola com modalidades encontrada' });
    }

    console.log(`🏫 Escolas encontradas: ${escolas.length} combinações escola+modalidade`);

    // Calcular dias no período selecionado
    const inicio = new Date(data_inicio);
    const fim = new Date(data_fim);
    const diasPeriodo = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    console.log(`📅 Período: ${data_inicio} a ${data_fim} = ${diasPeriodo} dias`);

    // Buscar refeições dos cardápios NOVOS com produtos
    // Agora usa cardapio_refeicoes_dia ao invés de cardapio_refeicoes
    const refeicoesQuery = await db.pool.query(`
      SELECT 
        crd.id as cardapio_refeicao_dia_id,
        crd.cardapio_modalidade_id,
        crd.dia,
        cm.modalidade_id,
        r.id as refeicao_id,
        r.nome as refeicao_nome,
        rp.id as refeicao_produto_id,
        rp.produto_id,
        p.nome as produto_nome,
        p.unidade,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        rp.tipo_medida
      FROM cardapio_refeicoes_dia crd
      INNER JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
      INNER JOIN refeicoes r ON r.id = crd.refeicao_id
      INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN refeicao_produto_modalidade rpm ON rpm.refeicao_produto_id = rp.id AND rpm.modalidade_id = cm.modalidade_id
      WHERE crd.cardapio_modalidade_id = ANY($1)
        AND crd.ativo = true
        AND crd.dia BETWEEN $2 AND $3
      ORDER BY crd.dia, r.nome, p.nome
    `, [
      cardapios.map(c => c.id),
      parseInt(data_inicio.split('-')[2]), // dia inicial
      parseInt(data_fim.split('-')[2])     // dia final
    ]);

    const refeicoes = refeicoesQuery.rows;
    console.log(`🍽️ Refeições encontradas: ${refeicoes.length}`);

    // Agrupar refeições por modalidade e contar ocorrências por produto
    const refeicoesPorModalidade = new Map<number, Map<number, any[]>>();
    
    refeicoes.forEach(ref => {
      if (!refeicoesPorModalidade.has(ref.modalidade_id)) {
        refeicoesPorModalidade.set(ref.modalidade_id, new Map());
      }
      
      const produtosMap = refeicoesPorModalidade.get(ref.modalidade_id)!;
      if (!produtosMap.has(ref.produto_id)) {
        produtosMap.set(ref.produto_id, []);
      }
      
      produtosMap.get(ref.produto_id)!.push(ref);
    });

    const demandaPorEscola: any[] = [];
    const produtosMap = new Map<number, any>();

    // Para cada combinação escola+modalidade, calcular demanda
    for (const escolaModalidade of escolas) {
      const produtosModalidade = refeicoesPorModalidade.get(escolaModalidade.modalidade_id);
      if (!produtosModalidade || produtosModalidade.size === 0) continue;

      const demandaEscola: any = {
        escola_id: escolaModalidade.escola_id,
        escola_nome: escolaModalidade.escola_nome,
        modalidade_id: escolaModalidade.modalidade_id,
        modalidade_nome: escolaModalidade.modalidade_nome,
        numero_alunos: escolaModalidade.numero_alunos,
        produtos: []
      };

      const produtosEscola = new Map<number, any>();

      // Para cada produto, somar as ocorrências nos dias do período
      for (const [produto_id, ocorrencias] of produtosModalidade.entries()) {
        const primeiraOcorrencia = ocorrencias[0];
        const { produto_nome, unidade, tipo_medida } = primeiraOcorrencia;
        const per_capita = toNum(primeiraOcorrencia.per_capita, 0);
        const fator_correcao = toNum(primeiraOcorrencia.fator_correcao, 1.0);

        // Per capita cadastrado é LÍQUIDO (consumo)
        // Para compras, precisamos do BRUTO (compra)
        const fator = fator_correcao;
        const perCapitaLiquido = per_capita;
        const perCapitaBruto = perCapitaLiquido * fator;

        // Converter para gramas se necessário
        let perCapitaGramas = perCapitaBruto;
        if (tipo_medida === 'unidades') {
          perCapitaGramas = perCapitaBruto * 100;
        }

        // Contar quantas vezes o produto aparece no período
        const vezesNoPeriodo = ocorrencias.length;

        // Quantidade total = alunos * per capita BRUTO * vezes que aparece
        const quantidadeGramas = escolaModalidade.numero_alunos * perCapitaGramas * vezesNoPeriodo;
        const quantidadeKg = quantidadeGramas / 1000;

        // Log detalhado do cálculo
        console.log(`🔢 ${produto_nome}:`, {
          escola: escolaModalidade.escola_nome,
          modalidade: escolaModalidade.modalidade_nome,
          alunos: escolaModalidade.numero_alunos,
          per_capita_liquido: perCapitaLiquido,
          fator_correcao: fator,
          per_capita_bruto_gramas: perCapitaGramas,
          vezes_no_periodo: vezesNoPeriodo,
          dias: ocorrencias.map(o => o.dia).join(', '),
          calculo: `${escolaModalidade.numero_alunos} alunos × ${perCapitaGramas}g × ${vezesNoPeriodo} vezes`,
          quantidade_kg: quantidadeKg.toFixed(2)
        });

        if (!produtosEscola.has(produto_id)) {
          produtosEscola.set(produto_id, {
            produto_id,
            produto_nome,
            unidade,
            quantidade_kg: 0,
            quantidade_gramas: 0,
            vezes_no_periodo: 0,
            calculo_detalhado: {
              alunos: escolaModalidade.numero_alunos,
              per_capita_liquido: perCapitaLiquido,
              fator_correcao: fator,
              per_capita_bruto: perCapitaGramas,
              vezes_no_periodo: vezesNoPeriodo,
              dias: ocorrencias.map(o => o.dia).sort((a, b) => a - b),
              formula: `${escolaModalidade.numero_alunos} alunos × ${perCapitaGramas}g × ${vezesNoPeriodo} vezes = ${quantidadeKg.toFixed(2)}kg`
            }
          });
        }

        const produtoAcum = produtosEscola.get(produto_id)!;
        produtoAcum.quantidade_gramas += quantidadeGramas;
        produtoAcum.quantidade_kg += quantidadeKg;
        produtoAcum.vezes_no_periodo = vezesNoPeriodo;

        // Acumular no mapa global
        if (!produtosMap.has(produto_id)) {
          produtosMap.set(produto_id, {
            produto_id,
            produto_nome,
            unidade,
            quantidade_total_kg: 0
          });
        }

        const produtoGlobal = produtosMap.get(produto_id)!;
        produtoGlobal.quantidade_total_kg += quantidadeKg;
      }

      demandaEscola.produtos = Array.from(produtosEscola.values());
      demandaPorEscola.push(demandaEscola);
    }

    // Consolidar produtos por escola (agrupar modalidades da mesma escola)
    const escolasUnicas = new Map<number, any>();
    escolas.forEach(em => {
      if (!escolasUnicas.has(em.escola_id)) {
        escolasUnicas.set(em.escola_id, {
          escola_id: em.escola_id,
          escola_nome: em.escola_nome,
          modalidades: []
        });
      }
      escolasUnicas.get(em.escola_id)!.modalidades.push({
        modalidade_id: em.modalidade_id,
        modalidade_nome: em.modalidade_nome,
        numero_alunos: em.numero_alunos
      });
    });

    const consolidado = Array.from(escolasUnicas.values()).map(escola => {
      const escolaDemandas = demandaPorEscola.filter(d => d.escola_id === escola.escola_id);
      const produtosConsolidados = new Map<number, number>();

      escolaDemandas.forEach(demanda => {
        demanda.produtos.forEach((prod: any) => {
          const atual = produtosConsolidados.get(prod.produto_id) || 0;
          produtosConsolidados.set(prod.produto_id, atual + prod.quantidade_kg);
        });
      });

      const totalAlunos = escola.modalidades.reduce((sum: number, m: any) => sum + m.numero_alunos, 0);

      return {
        escola_id: escola.escola_id,
        escola_nome: escola.escola_nome,
        modalidades: escola.modalidades.map((m: any) => m.modalidade_nome).join(', '),
        numero_alunos: totalAlunos,
        produtos: Array.from(produtosConsolidados.entries()).map(([produto_id, quantidade_kg]) => {
          const produtoInfo = Array.from(produtosMap.values()).find(p => p.produto_id === produto_id);
          return {
            produto_id,
            produto_nome: produtoInfo?.produto_nome || '',
            quantidade_kg: Math.round(quantidade_kg * 100) / 100
          };
        })
      };
    });

    // Preparar demanda por produto
    const demandaPorProduto = Array.from(produtosMap.values()).map(prod => ({
      produto_id: prod.produto_id,
      produto_nome: prod.produto_nome,
      unidade: prod.unidade,
      quantidade_total_kg: Math.round(prod.quantidade_total_kg * 100) / 100
    }));

    const escolasUnicasCount = escolasUnicas.size;

    return res.json({
      competencia,
      cardapios_encontrados: cardapios.length,
      cardapios: cardapios.map(c => c.nome),
      periodo: {
        data_inicio,
        data_fim
      },
      escolas_total: escolasUnicasCount,
      combinacoes_escola_modalidade: escolas.length,
      demanda_por_escola: demandaPorEscola,
      demanda_por_produto: demandaPorProduto.sort((a, b) => b.quantidade_total_kg - a.quantidade_total_kg),
      consolidado: consolidado
    });

  } catch (error) {
    console.error('Erro ao calcular demanda por competência:', error);
    return res.status(500).json({ error: 'Erro ao calcular demanda de compras' });
  }
};
