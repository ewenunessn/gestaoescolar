import { Request, Response } from 'express';
import db from '../../../database';
import { toNum } from '../../../utils/typeHelpers';
import { JobService } from '../../../services/jobService';

// ─── Tipos internos ───────────────────────────────────────────────────────────
interface Periodo {
  data_inicio: string; // YYYY-MM-DD
  data_fim: string;
}

interface DemandaEscola {
  escola_id: number;
  quantidade_kg: number;
}

interface ProdutoDemanda {
  produto_id: number;
  produto_nome: string;
  unidade: string;
  quantidade_kg: number;
  quantidade_embalagens?: number; // Quantidade em unidades de embalagem (pacotes, caixas, etc)
  peso_embalagem?: number; // Peso da embalagem em gramas
  por_escola: DemandaEscola[]; // quebra por escola para programação
}

interface ConversaoCompra {
  quantidade_compra: number;
  unidade_compra: string;
  quantidade_kg: number;
  quantidade_distribuicao?: number;
  unidade_distribuicao?: string;
}

// ─── Helper: Batch INSERT para guia_produto_escola ───────────────────────────
interface GuiaItemRow {
  produto_id: number;
  escola_id: number;
  quantidade: number;
  unidade: string;
  data_entrega: string;
}

async function batchInsertGuiaItens(
  client: { query: (sql: string, params?: any[]) => Promise<any> },
  guia_id: number,
  rows: GuiaItemRow[],
  chunkSize = 500
): Promise<number> {
  if (rows.length === 0) return 0;

  // Buscar snapshots de todas as escolas envolvidas de uma vez
  const escolaIds = [...new Set(rows.map(r => r.escola_id))];
  const snapshotResult = await client.query(`
    SELECT
      e.id as escola_id,
      e.nome as escola_nome,
      e.endereco as escola_endereco,
      e.municipio as escola_municipio,
      COALESCE((SELECT SUM(em.quantidade_alunos) FROM escola_modalidades em WHERE em.escola_id = e.id), 0) as escola_total_alunos,
      (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('modalidade_id', em.modalidade_id, 'modalidade_nome', m.nome, 'quantidade_alunos', em.quantidade_alunos) ORDER BY m.nome), '[]'::jsonb)
        FROM escola_modalidades em LEFT JOIN modalidades m ON em.modalidade_id = m.id WHERE em.escola_id = e.id
      ) as escola_modalidades
    FROM escolas e WHERE e.id = ANY($1)
  `, [escolaIds]);

  const snapshotMap = new Map<number, any>();
  for (const row of snapshotResult.rows) {
    snapshotMap.set(row.escola_id, row);
  }

  let total = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values: any[] = [];
    const placeholders = chunk.map((row, idx) => {
      const snap = snapshotMap.get(row.escola_id);
      const base = idx * 11;
      values.push(
        guia_id, row.produto_id, row.escola_id, row.quantidade, row.unidade, row.data_entrega,
        snap?.escola_nome || null, snap?.escola_endereco || null, snap?.escola_municipio || null,
        snap?.escola_total_alunos || null,
        snap?.escola_modalidades ? JSON.stringify(snap.escola_modalidades) : null,
      );
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+4},$${base+5},$${base+6},'pendente',NOW(),NOW(),$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},NOW())`;
    });
    await client.query(
      `INSERT INTO guia_produto_escola
         (guia_id,produto_id,escola_id,quantidade,quantidade_demanda,unidade,data_entrega,status,created_at,updated_at,
          escola_nome,escola_endereco,escola_municipio,escola_total_alunos,escola_modalidades,escola_snapshot_data)
       VALUES ${placeholders.join(',')}`,
      values
    );
    total += chunk.length;
  }
  return total;
}
function converterDemandaParaCompra(
  quantidade_demanda: number,
  produto: {
    peso_distribuicao_g?: number;
    unidade_distribuicao?: string;
  }
): ConversaoCompra {
  // SIMPLIFICADO: Sem conversão! Demanda = Compra
  // O peso do produto já é o peso da embalagem comprada
  
  const unidadeLower = (produto.unidade_distribuicao || '').toLowerCase().trim();
  const isKg = unidadeLower === 'quilograma' || unidadeLower === 'kg' || unidadeLower === 'kilo';
  
  let quantidade_distribuicao: number;
  let quantidade_kg: number;
  
  if (isKg) {
    // Unidade é KG
    quantidade_kg = quantidade_demanda;
    quantidade_distribuicao = quantidade_demanda;
  } else {
    // Unidade é UNIDADE
    quantidade_distribuicao = quantidade_demanda;
    // Calcular KG se tiver peso
    if (produto.peso_distribuicao_g && produto.peso_distribuicao_g > 0) {
      quantidade_kg = (quantidade_distribuicao * produto.peso_distribuicao_g) / 1000;
    } else {
      quantidade_kg = quantidade_distribuicao;
    }
  }
  
  // SEM CONVERSÃO: quantidade_compra = quantidade_distribuicao
  return {
    quantidade_compra: Math.ceil(quantidade_distribuicao),
    unidade_compra: produto.unidade_distribuicao || 'UN',
    quantidade_kg: Math.round(quantidade_kg * 1000) / 1000,
    quantidade_distribuicao,
    unidade_distribuicao: produto.unidade_distribuicao
  };
}

// ─── Helper: Converter kg para unidades de embalagem ─────────────────────────
function converterParaEmbalagem(quantidade_kg: number, peso_embalagem_g: number): number {
  const quantidadeGramas = quantidade_kg * 1000;
  return Math.ceil(quantidadeGramas / peso_embalagem_g);
}

// ─── Helper: Aplicar conversão de embalagem se aplicável ─────────────────────
function aplicarConversaoEmbalagem(
  quantidade_kg: number,
  peso_g: number | null,
  unidade_distribuicao: string | null
): { quantidade: number; unidade: string; quantidade_embalagens?: number } {
  // Se tem peso definido e não é kg, converter para unidades
  const unidadeLower = (unidade_distribuicao || '').toLowerCase().trim();
  const isKg = unidadeLower === 'quilograma' || unidadeLower === 'kg' || unidadeLower === 'kilo';
  
  if (peso_g && peso_g > 0 && unidade_distribuicao && !isKg) {
    const quantidadeEmbalagens = converterParaEmbalagem(quantidade_kg, peso_g);
    return {
      quantidade: quantidadeEmbalagens,
      unidade: unidade_distribuicao,
      quantidade_embalagens: quantidadeEmbalagens
    };
  }
  
  // Caso contrário, manter em kg
  return {
    quantidade: quantidade_kg,
    unidade: unidade_distribuicao || 'kg'
  };
}

// ─── Helper: calcular demanda de produtos para um período (com quebra por escola) ─
async function calcularDemandaPeriodo(
  ano: number,
  mes: number,
  data_inicio: string,
  data_fim: string,
  escola_ids?: number[],
  considerar_indice_coccao: boolean = false,
  considerar_fator_correcao: boolean = true,
  cardapio_ids?: number[]
): Promise<ProdutoDemanda[]> {
  const diaInicio = parseInt(data_inicio.split('-')[2]);
  const diaFim = parseInt(data_fim.split('-')[2]);

  // Buscar cardápios ativos com suas modalidades (usando tabela de junção)
  let cardapioFilter = '';
  const cardapioParams: any[] = [ano, mes];
  if (cardapio_ids && cardapio_ids.length > 0) {
    cardapioFilter = `AND cm.id = ANY($3)`;
    cardapioParams.push(cardapio_ids);
  }

  const cardapiosQuery = await db.pool.query(`
    SELECT DISTINCT cm.id, cm2.modalidade_id
    FROM cardapios_modalidade cm
    INNER JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
    LEFT JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
    WHERE cm.ativo = true AND cm.ano = $1 AND cm.mes = $2
      AND cm2.modalidade_id IS NOT NULL
      ${cardapioFilter}
  `, cardapioParams);

  if (cardapiosQuery.rows.length === 0) {
    // Retornar info de debug no erro
    throw new Error(`Nenhum cardápio ativo encontrado para competência ${ano}-${mes}. Verifique se existe um cardápio ativo com refeições cadastradas.`);
  }

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
  console.log('[calcularDemandaPeriodo] Escolas encontradas:', escolas.length);
  if (escolas.length === 0) return [];

  const refeicoesQuery = await db.pool.query(`
    SELECT
      crd.dia,
      cm2.modalidade_id,
      rp.produto_id,
      p.nome as produto_nome,
      COALESCE(um.codigo, 'UN') as unidade,
      p.peso as peso_embalagem,
      COALESCE(p.fator_correcao, 1.0) as fator_correcao,
      COALESCE(p.indice_coccao, 1.0) as indice_coccao,
      COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
      rp.tipo_medida
    FROM cardapio_refeicoes_dia crd
    INNER JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
    INNER JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
    INNER JOIN refeicoes r ON r.id = crd.refeicao_id
    INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
    INNER JOIN produtos p ON p.id = rp.produto_id
    LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
    LEFT JOIN refeicao_produto_modalidade rpm
      ON rpm.refeicao_produto_id = rp.id AND rpm.modalidade_id = cm2.modalidade_id
    WHERE crd.cardapio_modalidade_id = ANY($1)
      AND crd.ativo = true
      AND (
        -- Período normal (mesmo mês): dia entre início e fim
        ($2 <= $3 AND crd.dia BETWEEN $2 AND $3)
        OR
        -- Período que cruza meses: dia >= início OU dia <= fim
        ($2 > $3 AND (crd.dia >= $2 OR crd.dia <= $3))
      )
  `, [cardapiosQuery.rows.map((c: any) => c.id), diaInicio, diaFim]);

  // Se não encontrou refeições no range de dias, usa TODOS os dias do cardápio
  // (fallback para quando o período não coincide com os dias cadastrados)
  let refeicoes = refeicoesQuery.rows;
  if (refeicoes.length === 0) {
    console.log(`[FALLBACK] Nenhuma refeição no range ${diaInicio}-${diaFim}, usando todos os dias do cardápio`);
    const fallbackQuery = await db.pool.query(`
      SELECT
        crd.dia,
        cm2.modalidade_id,
        rp.produto_id,
        p.nome as produto_nome,
        COALESCE(um.codigo, 'UN') as unidade,
        p.peso as peso_embalagem,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        COALESCE(p.indice_coccao, 1.0) as indice_coccao,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        rp.tipo_medida
      FROM cardapio_refeicoes_dia crd
      INNER JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
      INNER JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
      INNER JOIN refeicoes r ON r.id = crd.refeicao_id
      INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      LEFT JOIN refeicao_produto_modalidade rpm
        ON rpm.refeicao_produto_id = rp.id AND rpm.modalidade_id = cm2.modalidade_id
      WHERE crd.cardapio_modalidade_id = ANY($1)
        AND crd.ativo = true
    `, [cardapiosQuery.rows.map((c: any) => c.id)]);
    refeicoes = fallbackQuery.rows;
    console.log(`[FALLBACK] Usando ${refeicoes.length} refeições sem filtro de dia`);
  }

  console.log('[DEBUG] Cardápio IDs:', cardapiosQuery.rows.map((c: any) => c.id));
  console.log('[DEBUG] Dia range:', diaInicio, 'a', diaFim);
  console.log('[DEBUG] Refeições encontradas:', refeicoes.length, 'rows');

  // Agrupar por modalidade → produto → ocorrências
  const porModalidade = new Map<number, Map<number, any[]>>();
  for (const ref of refeicoes) {
    if (!porModalidade.has(ref.modalidade_id)) porModalidade.set(ref.modalidade_id, new Map());
    const pm = porModalidade.get(ref.modalidade_id)!;
    if (!pm.has(ref.produto_id)) pm.set(ref.produto_id, []);
    pm.get(ref.produto_id)!.push(ref);
  }

  // totais globais + quebra por escola
  const totais = new Map<number, ProdutoDemanda>();

  for (const escola of escolas) {
    const pm = porModalidade.get(escola.modalidade_id);
    if (!pm) continue;

    for (const [produto_id, ocorrencias] of pm.entries()) {
      const ref = ocorrencias[0];
      const perCapita = toNum(ref.per_capita, 0);
      const indiceCoccao = toNum(ref.indice_coccao, 1.0);
      const fator = toNum(ref.fator_correcao, 1.0);
      
      // Converter mg para g se necessário
      let perCapitaGramas = perCapita;
      if (ref.tipo_medida === 'mg' || ref.tipo_medida === 'miligramas') {
        perCapitaGramas = perCapita / 1000;
      }
      
      // Per capita sempre em GRAMAS
      // NOTA: Índice de cocção DESABILITADO por padrão (considerar_indice_coccao = false)
      // O campo existe no banco apenas para referência, mas não é aplicado automaticamente
      // LÓGICA: Apenas FC (fator de correção) é aplicado se habilitado
      // 1. Per capita já está no estado final (cozido)
      const perCapitaCru = considerar_indice_coccao ? perCapitaGramas / indiceCoccao : perCapitaGramas;
      // 2. Calcular quanto precisa COMPRAR (antes de limpar/descascar)
      const perCapitaBruto = considerar_fator_correcao ? perCapitaCru * fator : perCapitaCru;
      
      // Calcular total em gramas
      const totalGramas = escola.numero_alunos * perCapitaBruto * ocorrencias.length;
      
      // Converter para kg
      const qtdKg = totalGramas / 1000;

      if (!totais.has(produto_id)) {
        const ref = ocorrencias[0];
        const conversao = aplicarConversaoEmbalagem(
          qtdKg,
          ref.peso_embalagem ? Number(ref.peso_embalagem) : null,
          ref.unidade
        );
        
        totais.set(produto_id, {
          produto_id,
          produto_nome: ref.produto_nome,
          unidade: conversao.unidade,
          quantidade_kg: 0,
          quantidade_embalagens: conversao.quantidade_embalagens,
          peso_embalagem: ref.peso_embalagem ? Number(ref.peso_embalagem) : undefined,
          por_escola: [],
        });
      }
      const prod = totais.get(produto_id)!;
      prod.quantidade_kg += qtdKg;

      // acumular por escola (uma escola pode ter múltiplas modalidades)
      const existente = prod.por_escola.find(e => e.escola_id === escola.escola_id);
      if (existente) {
        existente.quantidade_kg += qtdKg;
      } else {
        prod.por_escola.push({ escola_id: escola.escola_id, quantidade_kg: qtdKg });
      }
    }
  }

  return Array.from(totais.values()).map(p => {
    // Recalcular quantidade em embalagens com o total final
    const conversao = aplicarConversaoEmbalagem(
      p.quantidade_kg,
      p.peso_embalagem || null,
      p.unidade
    );
    
    return {
      ...p,
      quantidade_kg: Math.round(p.quantidade_kg * 1000) / 1000,
      quantidade_embalagens: conversao.quantidade_embalagens,
      unidade: conversao.unidade,
      por_escola: p.por_escola.map(e => ({
        escola_id: e.escola_id,
        quantidade_kg: Math.round(e.quantidade_kg * 1000) / 1000,
      })),
    };
  });
}

// ─── Gerar pedido único com itens por período ────────────────────────────────
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

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Calcular demanda para cada período
    const demandasPorPeriodo: { periodo: Periodo; demanda: ProdutoDemanda[] }[] = [];
    const errosPeriodo: string[] = [];

    for (const periodo of periodos) {
      const demanda = await calcularDemandaPeriodo(ano, mes, periodo.data_inicio, periodo.data_fim, escola_ids);
      if (demanda.length === 0) {
        errosPeriodo.push(`Período ${periodo.data_inicio} a ${periodo.data_fim}: nenhum produto calculado`);
      } else {
        demandasPorPeriodo.push({ periodo, demanda });
      }
    }

    if (demandasPorPeriodo.length === 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({
        pedidos_criados: [],
        erros: errosPeriodo.map(m => ({ motivo: m })),
        total_criados: 0,
        total_erros: errosPeriodo.length,
      });
    }

    // 2. Coletar todos os produto_ids únicos e buscar contratos
    const todosProdutoIds = [...new Set(demandasPorPeriodo.flatMap(d => d.demanda.map(p => p.produto_id)))];
    const contratosQuery = await client.query(`
      SELECT 
        cp.id as contrato_produto_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        cp.peso_embalagem,
        cp.unidade_compra,
        cp.fator_conversao,
        c.id as contrato_id,
        c.numero as contrato_numero,
        c.data_fim as contrato_data_fim,
        f.id as fornecedor_id,
        f.nome as fornecedor_nome,
        p.peso as peso_distribuicao,
        COALESCE(um.codigo, 'UN') as unidade,
        COALESCE(
          (SELECT SUM(cpm2.quantidade_disponivel)
           FROM contrato_produtos_modalidades cpm2
           WHERE cpm2.contrato_produto_id = cp.id AND cpm2.ativo = true),
          cp.quantidade_contratada
        ) as saldo_disponivel
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN fornecedores f ON f.id = c.fornecedor_id
      JOIN produtos p ON p.id = cp.produto_id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      WHERE cp.produto_id = ANY($1) AND cp.ativo = true
        AND c.status = 'ativo' AND c.data_fim >= CURRENT_DATE
      ORDER BY cp.produto_id, c.data_fim ASC
    `, [todosProdutoIds]);

    // Agrupar TODOS os contratos por produto (não apenas o primeiro)
    const contratosPorProduto = new Map<number, any[]>();
    for (const row of contratosQuery.rows) {
      if (!contratosPorProduto.has(row.produto_id)) {
        contratosPorProduto.set(row.produto_id, []);
      }
      contratosPorProduto.get(row.produto_id)!.push(row);
    }

    // Identificar produtos com múltiplos contratos
    const produtosComMultiplosContratos: any[] = [];
    const produtosInfo = new Map<number, string>(); // produto_id -> nome
    
    for (const { demanda } of demandasPorPeriodo) {
      for (const prod of demanda) {
        produtosInfo.set(prod.produto_id, prod.produto_nome);
        const contratos = contratosPorProduto.get(prod.produto_id) || [];
        if (contratos.length > 1) {
          const jaAdicionado = produtosComMultiplosContratos.find(p => p.produto_id === prod.produto_id);
          if (!jaAdicionado) {
            produtosComMultiplosContratos.push({
              produto_id: prod.produto_id,
              produto_nome: prod.produto_nome,
              unidade: prod.unidade,
              quantidade_necessaria: prod.quantidade_kg,
              contratos: contratos.map(c => ({
                contrato_produto_id: c.contrato_produto_id,
                contrato_id: c.contrato_id,
                contrato_numero: c.contrato_numero,
                fornecedor_id: c.fornecedor_id,
                fornecedor_nome: c.fornecedor_nome,
                preco_unitario: c.preco_unitario,
                saldo_disponivel: c.saldo_disponivel,
                data_fim: c.contrato_data_fim
              }))
            });
          }
        }
      }
    }

    // Se houver produtos com múltiplos contratos E não foi fornecida a seleção, retornar para seleção
    const { contratos_selecionados } = req.body;
    
    if (produtosComMultiplosContratos.length > 0 && !contratos_selecionados) {
      await client.query('ROLLBACK');
      return res.status(200).json({
        requer_selecao: true,
        produtos_multiplos_contratos: produtosComMultiplosContratos,
        mensagem: `${produtosComMultiplosContratos.length} produto(s) encontrado(s) em múltiplos contratos. Selecione qual contrato usar para cada produto.`
      });
    }

    // Se foi fornecida seleção, usar os contratos selecionados
    const contratosSelecionadosMap = new Map<number, Array<{ contrato_produto_id: number; quantidade?: number }>>();
    if (contratos_selecionados) {
      for (const sel of contratos_selecionados) {
        if (!contratosSelecionadosMap.has(sel.produto_id)) {
          contratosSelecionadosMap.set(sel.produto_id, []);
        }
        contratosSelecionadosMap.get(sel.produto_id)!.push({
          contrato_produto_id: sel.contrato_produto_id,
          quantidade: sel.quantidade
        });
      }
    }

    // Montar mapa final de contratos a usar (selecionados ou únicos)
    const contratosParaUsar = new Map<number, Array<{ contrato: any; quantidade?: number }>>();
    for (const [produto_id, contratos] of contratosPorProduto) {
      if (contratos.length === 1) {
        // Apenas um contrato, usar automaticamente
        contratosParaUsar.set(produto_id, [{ contrato: contratos[0] }]);
      } else if (contratosSelecionadosMap.has(produto_id)) {
        // Múltiplos contratos, usar os selecionados
        const selecionados = contratosSelecionadosMap.get(produto_id)!;
        const contratosComDados = selecionados.map(sel => {
          const contrato = contratos.find(c => c.contrato_produto_id === sel.contrato_produto_id);
          return contrato ? { contrato, quantidade: sel.quantidade } : null;
        }).filter(Boolean) as Array<{ contrato: any; quantidade?: number }>;
        
        if (contratosComDados.length > 0) {
          contratosParaUsar.set(produto_id, contratosComDados);
        }
      }
    }

    // 3. Montar itens: um por produto por período (ou múltiplos se houver divisão)
    const itensPorPeriodo: { periodo: Periodo; produto: ProdutoDemanda; contrato: any; quantidade?: number }[] = [];
    const semContrato = new Set<string>();

    for (const { periodo, demanda } of demandasPorPeriodo) {
      for (const prod of demanda) {
        const contratosDoP = contratosParaUsar.get(prod.produto_id);
        if (!contratosDoP || contratosDoP.length === 0) { 
          semContrato.add(prod.produto_nome); 
          continue; 
        }
        
        // Se houver divisão de quantidade, criar um item por contrato
        for (const { contrato, quantidade } of contratosDoP) {
          itensPorPeriodo.push({ 
            periodo, 
            produto: {
              ...prod,
              quantidade_kg: quantidade !== undefined ? quantidade : prod.quantidade_kg
            }, 
            contrato,
            quantidade
          });
        }
      }
    }

    if (itensPorPeriodo.length === 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({
        pedidos_criados: [],
        erros: [{ motivo: `Nenhum produto com contrato ativo. Sem contrato: ${[...semContrato].join(', ')}` }],
        total_criados: 0,
        total_erros: 1,
      });
    }

    // 4. Criar pedido único
    const maxResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM LENGTH(numero) - 5) AS INTEGER)), 0) as max_seq
      FROM pedidos WHERE competencia_mes_ano = $1
    `, [competencia]);
    const seq = (parseInt(maxResult.rows[0].max_seq) + 1).toString().padStart(6, '0');
    const numero = `PED-${mesAbrev}${ano}${seq}`;

    const periodosTexto = periodos.map(p => `${p.data_inicio} a ${p.data_fim}`).join(', ');
    const obsTexto = [
      observacoes,
      `Planejamento: ${periodosTexto}`,
      semContrato.size > 0 ? `Sem contrato (não incluídos): ${[...semContrato].join(', ')}` : null
    ].filter(Boolean).join(' | ');

    const pedidoResult = await client.query(`
      INSERT INTO pedidos (numero, data_pedido, status, valor_total, observacoes, usuario_criacao_id, competencia_mes_ano)
      VALUES ($1, CURRENT_DATE, 'pendente', 0, $2, $3, $4)
      RETURNING id
    `, [numero, obsTexto, usuario_id, competencia]);

    const pedido_id = pedidoResult.rows[0].id;

    // 5. Inserir um item por produto por período, com programação de entrega por escola
    for (const { periodo, produto, contrato } of itensPorPeriodo) {
      // Converter demanda para unidade de compra
      const conversao = converterDemandaParaCompra(
        produto.quantidade_kg,
        {
          peso_distribuicao_g: contrato.peso_distribuicao ? Number(contrato.peso_distribuicao) : undefined,
          unidade_distribuicao: contrato.unidade
        }
      );
      
      const preco = toNum(contrato.preco_unitario);
      const valorTotal = conversao.quantidade_compra * preco;

      const itemResult = await client.query(`
        INSERT INTO pedido_itens (
          pedido_id, contrato_produto_id, produto_id, 
          quantidade, unidade, quantidade_kg,
          quantidade_distribuicao, unidade_distribuicao,
          preco_unitario, valor_total, data_entrega_prevista, observacoes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        pedido_id, 
        contrato.contrato_produto_id, 
        produto.produto_id, 
        conversao.quantidade_compra,
        conversao.unidade_compra,
        conversao.quantidade_kg,
        conversao.quantidade_distribuicao,
        conversao.unidade_distribuicao,
        preco, 
        valorTotal,
        periodo.data_inicio, 
        `Período: ${periodo.data_inicio} a ${periodo.data_fim}`
      ]);

      const pedido_item_id = itemResult.rows[0].id;

      // Programação de entrega com data de início do período
      const progResult = await client.query(`
        INSERT INTO pedido_item_programacoes (pedido_item_id, data_entrega, observacoes)
        VALUES ($1, $2, $3) RETURNING id
      `, [pedido_item_id, periodo.data_inicio, `${periodo.data_inicio} a ${periodo.data_fim}`]);

      const programacao_id = progResult.rows[0].id;

      // Escolas com suas quantidades
      for (const esc of produto.por_escola) {
        if (esc.quantidade_kg > 0) {
          await client.query(`
            INSERT INTO pedido_item_programacao_escolas (programacao_id, escola_id, quantidade)
            VALUES ($1, $2, $3)
          `, [programacao_id, esc.escola_id, esc.quantidade_kg]);
        }
      }

      // Recalcular quantidade do item pela soma das escolas
      if (produto.por_escola.length > 0) {
        await client.query(`
          UPDATE pedido_itens
          SET quantidade = (
            SELECT COALESCE(SUM(pipe.quantidade), 0)
            FROM pedido_item_programacoes pip
            JOIN pedido_item_programacao_escolas pipe ON pipe.programacao_id = pip.id
            WHERE pip.pedido_item_id = $1
          ),
          valor_total = preco_unitario * (
            SELECT COALESCE(SUM(pipe.quantidade), 0)
            FROM pedido_item_programacoes pip
            JOIN pedido_item_programacao_escolas pipe ON pipe.programacao_id = pip.id
            WHERE pip.pedido_item_id = $1
          ),
          updated_at = NOW()
          WHERE id = $1
        `, [pedido_item_id]);
      }
    }

    // 6. Mesclar automaticamente itens não perecíveis do mesmo produto
    // Buscar itens do pedido agrupados por produto, com flag perecivel
    const itensParaMesclar = await client.query(`
      SELECT pi.id, pi.produto_id, p.perecivel
      FROM pedido_itens pi
      JOIN produtos p ON p.id = pi.produto_id
      WHERE pi.pedido_id = $1
      ORDER BY pi.produto_id, pi.id
    `, [pedido_id]);

    // Agrupar por produto_id, apenas não perecíveis com mais de 1 item
    const gruposPorProduto = new Map<number, number[]>();
    for (const row of itensParaMesclar.rows) {
      if (!row.perecivel) {
        const lista = gruposPorProduto.get(row.produto_id) || [];
        lista.push(row.id);
        gruposPorProduto.set(row.produto_id, lista);
      }
    }

    for (const [, ids] of gruposPorProduto) {
      if (ids.length < 2) continue;
      const destino_id = ids[0];
      const todos_ids = ids; // inclui o destino para consolidar todas as programações

      // Coletar todas as quantidades por escola de todas as programações de todos os itens
      const escolasResult = await client.query(`
        SELECT pipe.escola_id, SUM(pipe.quantidade) as quantidade_total
        FROM pedido_item_programacoes pip
        JOIN pedido_item_programacao_escolas pipe ON pipe.programacao_id = pip.id
        WHERE pip.pedido_item_id = ANY($1)
        GROUP BY pipe.escola_id
      `, [todos_ids]);

      // Usar a menor data de entrega como data única
      const dataResult = await client.query(`
        SELECT MIN(data_entrega) as data_min
        FROM pedido_item_programacoes
        WHERE pedido_item_id = ANY($1)
      `, [todos_ids]);
      const dataEntrega = dataResult.rows[0].data_min;

      // Remover todas as programações de todos os itens do grupo
      await client.query(`
        DELETE FROM pedido_item_programacoes WHERE pedido_item_id = ANY($1)
      `, [todos_ids]);

      // Deletar itens secundários
      await client.query(`DELETE FROM pedido_itens WHERE id = ANY($1)`, [ids.slice(1)]);

      // Criar uma única programação no item destino
      const progResult = await client.query(`
        INSERT INTO pedido_item_programacoes (pedido_item_id, data_entrega, observacoes)
        VALUES ($1, $2, 'Períodos mesclados') RETURNING id
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
        observacoes = 'Gerado automaticamente pelo planejamento (períodos mesclados)',
        updated_at = NOW()
        WHERE id = $1
      `, [destino_id, dataEntrega]);

      await client.query(`
        UPDATE pedido_itens SET valor_total = quantidade * preco_unitario, updated_at = NOW() WHERE id = $1
      `, [destino_id]);
    }

    // 7. Recalcular valor total do pedido
    await client.query(`
      UPDATE pedidos
      SET valor_total = (SELECT COALESCE(SUM(valor_total), 0) FROM pedido_itens WHERE pedido_id = $1),
          updated_at = NOW()
      WHERE id = $1
    `, [pedido_id]);

    const pedidoAtualizado = await client.query(`SELECT valor_total FROM pedidos WHERE id = $1`, [pedido_id]);
    const valorTotalReal = toNum(pedidoAtualizado.rows[0]?.valor_total, 0);

    await client.query('COMMIT');

    return res.status(200).json({
      pedidos_criados: [{
        pedido_id,
        numero,
        periodos,
        total_itens: itensPorPeriodo.length,
        valor_total: valorTotalReal,
        sem_contrato: [...semContrato],
      }],
      erros: errosPeriodo.map(m => ({ motivo: m })),
      total_criados: 1,
      total_erros: errosPeriodo.length,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao gerar pedido:', error);
    return res.status(200).json({
      pedidos_criados: [],
      erros: [{ motivo: error instanceof Error ? error.message : 'Erro interno' }],
      total_criados: 0,
      total_erros: 1,
    });
  } finally {
    client.release();
  }
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

    // Buscar cardápios NOVOS (cardapios_modalidade) da competência com suas modalidades
    const cardapiosQuery = await db.pool.query(`
      SELECT DISTINCT 
        cm.id, 
        cm.nome, 
        cm2.modalidade_id,
        cm.mes,
        cm.ano
      FROM cardapios_modalidade cm
      INNER JOIN cardapio_refeicoes_dia crd ON crd.cardapio_modalidade_id = cm.id
      LEFT JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
      WHERE cm.ativo = true
        AND cm.ano = $1
        AND cm.mes = $2
        AND cm2.modalidade_id IS NOT NULL
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
        SELECT cm.id, cm.nome, cm.mes, cm.ano,
          STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) as modalidades_nomes
        FROM cardapios_modalidade cm
        LEFT JOIN cardapio_modalidades cjm ON cjm.cardapio_id = cm.id
        LEFT JOIN modalidades m ON m.id = cjm.modalidade_id
        WHERE cm.ativo = true
        GROUP BY cm.id, cm.nome, cm.mes, cm.ano
        ORDER BY cm.ano DESC, cm.mes DESC
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
        cm2.modalidade_id,
        r.id as refeicao_id,
        r.nome as refeicao_nome,
        rp.id as refeicao_produto_id,
        rp.produto_id,
        p.nome as produto_nome,
        COALESCE(um.codigo, 'UN') as unidade,
        p.peso as peso_embalagem,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        rp.tipo_medida
      FROM cardapio_refeicoes_dia crd
      INNER JOIN cardapios_modalidade cm ON cm.id = crd.cardapio_modalidade_id
      INNER JOIN cardapio_modalidades cm2 ON cm2.cardapio_id = cm.id
      INNER JOIN refeicoes r ON r.id = crd.refeicao_id
      INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      LEFT JOIN refeicao_produto_modalidade rpm ON rpm.refeicao_produto_id = rp.id AND rpm.modalidade_id = cm2.modalidade_id
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

        // Converter mg para gramas se necessário
        let perCapitaGramas = perCapitaBruto;
        if (tipo_medida === 'mg' || tipo_medida === 'miligramas') {
          perCapitaGramas = perCapitaBruto / 1000;
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
          const peso_emb = primeiraOcorrencia.peso_embalagem ? Number(primeiraOcorrencia.peso_embalagem) : null;
          
          produtosEscola.set(produto_id, {
            produto_id,
            produto_nome,
            unidade,
            peso_embalagem: peso_emb,
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
          const peso_emb = primeiraOcorrencia.peso_embalagem ? Number(primeiraOcorrencia.peso_embalagem) : null;
          
          produtosMap.set(produto_id, {
            produto_id,
            produto_nome,
            unidade,
            peso_embalagem: peso_emb,
            quantidade_total_kg: 0
          });
        }

        const produtoGlobal = produtosMap.get(produto_id)!;
        produtoGlobal.quantidade_total_kg += quantidadeKg;
      }

      demandaEscola.produtos = Array.from(produtosEscola.values()).map(prod => {
        // Aplicar conversão de embalagem
        const conversao = aplicarConversaoEmbalagem(
          prod.quantidade_kg,
          prod.peso_embalagem,
          prod.unidade
        );
        
        return {
          ...prod,
          unidade: conversao.unidade,
          quantidade_embalagens: conversao.quantidade_embalagens,
          quantidade_kg: Math.round(prod.quantidade_kg * 100) / 100
        };
      });
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
          
          // Aplicar conversão de embalagem
          const conversao = aplicarConversaoEmbalagem(
            quantidade_kg,
            produtoInfo?.peso_embalagem || null,
            produtoInfo?.unidade || null
          );
          
          return {
            produto_id,
            produto_nome: produtoInfo?.produto_nome || '',
            unidade: conversao.unidade,
            quantidade_kg: Math.round(quantidade_kg * 100) / 100,
            quantidade_embalagens: conversao.quantidade_embalagens,
            peso_embalagem: produtoInfo?.peso_embalagem
          };
        })
      };
    });

    // Preparar demanda por produto
    const demandaPorProduto = Array.from(produtosMap.values()).map(prod => {
      // Aplicar conversão de embalagem
      const conversao = aplicarConversaoEmbalagem(
        prod.quantidade_total_kg,
        prod.peso_embalagem,
        prod.unidade
      );
      
      return {
        produto_id: prod.produto_id,
        produto_nome: prod.produto_nome,
        unidade: conversao.unidade,
        quantidade_total_kg: Math.round(prod.quantidade_total_kg * 100) / 100,
        quantidade_embalagens: conversao.quantidade_embalagens,
        peso_embalagem: prod.peso_embalagem
      };
    });

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

// ─── Gerar Guias de Demanda por Período ──────────────────────────────────────
// Novo fluxo: planejamento → guias de demanda por escola → pedido de compra
// Múltiplos períodos geram 1 única guia por competência.
// Cada item recebe data_entrega = data_inicio do período que o originou.
export const gerarGuiasDemanda = async (req: Request, res: Response) => {
  const { competencia, periodos, escola_ids, observacoes, considerar_indice_coccao, considerar_fator_correcao } = req.body as {
    competencia: string;
    periodos: Periodo[];
    escola_ids?: number[];
    observacoes?: string;
    considerar_indice_coccao?: boolean;
    considerar_fator_correcao?: boolean;
  };

  if (!competencia || !periodos || periodos.length === 0) {
    return res.status(400).json({ error: 'Competência e períodos são obrigatórios' });
  }

  const [ano, mes] = competencia.split('-').map(Number);
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const erros: string[] = [];

    // Calcular demanda para cada período
    const demandasPorPeriodo: { periodo: Periodo; demanda: ProdutoDemanda[] }[] = [];
    for (const periodo of periodos) {
      const demanda = await calcularDemandaPeriodo(
        ano, 
        mes, 
        periodo.data_inicio, 
        periodo.data_fim, 
        escola_ids,
        considerar_indice_coccao,
        considerar_fator_correcao
      );
      if (demanda.length === 0) {
        erros.push(`Período ${periodo.data_inicio} a ${periodo.data_fim}: nenhum produto calculado`);
      } else {
        demandasPorPeriodo.push({ periodo, demanda });
      }
    }

    if (demandasPorPeriodo.length === 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({
        guias_criadas: [],
        erros: erros.map(m => ({ motivo: m })),
        total_criadas: 0,
        total_erros: erros.length,
        debug: {
          ano,
          mes,
          periodos_verificados: periodos,
          escola_ids: escola_ids || 'todas as escolas',
        },
      });
    }

    // Buscar ou criar 1 única guia para a competência
    const guiaExistente = await client.query(`
      SELECT id FROM guias WHERE competencia_mes_ano = $1
    `, [competencia]);

    let guia_id: number;

    if (guiaExistente.rows.length > 0) {
      guia_id = guiaExistente.rows[0].id;
      // Limpar todos os itens para regenerar
      await client.query(`DELETE FROM guia_produto_escola WHERE guia_id = $1`, [guia_id]);
      await client.query(`
        UPDATE guias SET status = 'aberta', observacao = $1, updated_at = NOW() WHERE id = $2
      `, [observacoes || null, guia_id]);
    } else {
      const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
      const nomePadrao = `Guia ${meses[mes - 1]}/${ano}`;
      
      // Gerar código único para a guia
      const codigoResult = await client.query(`SELECT gerar_codigo_guia($1, $2) as codigo`, [mes, ano]);
      const codigo_guia = codigoResult.rows[0].codigo;
      
      const guiaResult = await client.query(`
        INSERT INTO guias (mes, ano, nome, competencia_mes_ano, observacao, status, codigo_guia, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'aberta', $6, NOW(), NOW())
        RETURNING id
      `, [mes, ano, nomePadrao, competencia, observacoes || null, codigo_guia]);
      guia_id = guiaResult.rows[0].id;
    }

    // Buscar flag perecivel + dados de embalagem de todos os produtos envolvidos
    const todosProdutoIds = [...new Set(demandasPorPeriodo.flatMap(d => d.demanda.map(p => p.produto_id)))];
    const perecivelResult = await client.query(`
      SELECT p.id, p.perecivel, p.peso, COALESCE(um.codigo, 'UN') as unidade FROM produtos p LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id WHERE p.id = ANY($1)
    `, [todosProdutoIds]);
    const perecivelMap = new Map<number, boolean>(perecivelResult.rows.map((r: any) => [r.id, !!r.perecivel]));
    // peso em gramas → usado para converter kg → pacotes/unidades quando unidade estiver definido
    const embalagemMap = new Map<number, { peso_g: number; unidade: string }>(
      perecivelResult.rows
        .filter((r: any) => r.peso && r.peso > 0 && r.unidade)
        .map((r: any) => [r.id, { peso_g: Number(r.peso), unidade: r.unidade }])
    );

    // Helper: converte kg para unidades de embalagem (arredonda para cima)
    const converterParaEmbalagem = (quantidade_kg: number, peso_g: number): number => {
      const quantidadeGramas = quantidade_kg * 1000;
      return Math.ceil(quantidadeGramas / peso_g);
    };

    // Montar estrutura de itens a inserir:
    // - Perecíveis: 1 linha por (produto, escola, período) com data_entrega = data_inicio do período
    // - Não perecíveis: somar todas as programações por (produto, escola), data_entrega = menor data_inicio
    const pereciveisParaInserir: { produto_id: number; escola_id: number; quantidade: number; unidade: string; data_entrega: string }[] = [];
    const naoPereciveisMap = new Map<string, { produto_id: number; escola_id: number; quantidade: number; unidade: string; data_entrega: string }>();

    for (const { periodo, demanda } of demandasPorPeriodo) {
      for (const produto of demanda) {
        const perecivel = perecivelMap.get(produto.produto_id) ?? true; // default: tratar como perecível se não souber
        const embalagem = embalagemMap.get(produto.produto_id);
        for (const esc of produto.por_escola) {
          if (esc.quantidade_kg <= 0) continue;

          // Converter kg → unidades de embalagem se o produto tiver peso_embalagem_g
          let quantidade: number;
          let unidade: string;
          if (embalagem) {
            quantidade = converterParaEmbalagem(esc.quantidade_kg, embalagem.peso_g);
            unidade = embalagem.unidade;
          } else {
            quantidade = esc.quantidade_kg;
            unidade = produto.unidade || 'kg';
          }

          if (perecivel) {
            pereciveisParaInserir.push({
              produto_id: produto.produto_id,
              escola_id: esc.escola_id,
              quantidade,
              unidade,
              data_entrega: periodo.data_inicio,
            });
          } else {
            const key = `${produto.produto_id}__${esc.escola_id}`;
            if (!naoPereciveisMap.has(key)) {
              naoPereciveisMap.set(key, {
                produto_id: produto.produto_id,
                escola_id: esc.escola_id,
                quantidade: 0,
                unidade,
                data_entrega: periodo.data_inicio, // menor data (períodos são processados em ordem)
              });
            }
            // Para não perecíveis com embalagem: somar em kg e converter no final
            if (embalagem) {
              naoPereciveisMap.get(key)!.quantidade += esc.quantidade_kg;
              // marcar para converter depois
              (naoPereciveisMap.get(key) as any)._embalagem = embalagem;
            } else {
              naoPereciveisMap.get(key)!.quantidade += esc.quantidade_kg;
            }
          }
        }
      }
    }

    // Montar rows de não perecíveis com conversão final
    const naoPereciveisRows: GuiaItemRow[] = [];
    for (const item of naoPereciveisMap.values()) {
      const emb = (item as any)._embalagem as { peso_g: number; unidade: string } | undefined;
      const qtd = emb
        ? converterParaEmbalagem(item.quantidade, emb.peso_g)
        : Math.round(item.quantidade * 1000) / 1000;
      const unid = emb ? emb.unidade : item.unidade;
      naoPereciveisRows.push({ produto_id: item.produto_id, escola_id: item.escola_id, quantidade: qtd, unidade: unid, data_entrega: item.data_entrega });
    }

    // Batch insert: perecíveis + não perecíveis em chunks de 500
    const totalItens =
      await batchInsertGuiaItens(client, guia_id, pereciveisParaInserir) +
      await batchInsertGuiaItens(client, guia_id, naoPereciveisRows);

    await client.query('COMMIT');

    const totalEscolas = new Set(
      demandasPorPeriodo.flatMap(d => d.demanda.flatMap(p => p.por_escola.map(e => e.escola_id)))
    ).size;

    return res.status(200).json({
      guias_criadas: [{
        guia_id,
        competencia,
        periodos,
        total_produtos: new Set(demandasPorPeriodo.flatMap(d => d.demanda.map(p => p.produto_id))).size,
        total_itens: totalItens,
        total_escolas: totalEscolas,
      }],
      erros: erros.map(m => ({ motivo: m })),
      total_criadas: 1,
      total_erros: erros.length,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao gerar guias de demanda:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Stack trace:', errorStack);
    return res.status(500).json({ 
      error: errorMessage,
      detalhes: errorStack,
      tipo: error instanceof Error ? error.constructor.name : typeof error
    });
  } finally {
    client.release();
  }
};

// ─── Gerar Pedido de Compra a partir de uma Guia de Demanda ──────────────────
// Lê as quantidades ajustadas e data_entrega diretamente de guia_produto_escola
// sem recalcular pelo cardápio.
export const gerarPedidoDaGuia = async (req: Request, res: Response) => {
  const { guia_id, observacoes } = req.body as { guia_id: number; observacoes?: string };

  console.log('🚀 Gerando pedido da guia:', { guia_id, observacoes });

  if (!guia_id) {
    return res.status(400).json({ error: 'guia_id é obrigatório' });
  }

  const usuario_id = (req as any).user?.id || 1;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Buscar a guia
    const guiaResult = await client.query(`
      SELECT id, mes, ano, competencia_mes_ano, nome FROM guias WHERE id = $1
    `, [guia_id]);

    if (guiaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log('❌ Guia não encontrada:', guia_id);
      return res.status(404).json({ error: 'Guia não encontrada' });
    }

    const guia = guiaResult.rows[0];
    console.log('📋 Guia encontrada:', guia);
    const competencia = guia.competencia_mes_ano || `${guia.ano}-${String(guia.mes).padStart(2, '0')}`;
    const [ano, mes] = competencia.split('-').map(Number);
    const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const mesAbrev = meses[mes - 1];

    // 2. Buscar todos os itens da guia com produto e escola
    const itensResult = await client.query(`
      SELECT
        gpe.id as item_id,
        gpe.produto_id,
        gpe.escola_id,
        gpe.quantidade,
        gpe.unidade,
        gpe.data_entrega,
        p.nome as produto_nome,
        p.perecivel,
        e.nome as escola_nome
      FROM guia_produto_escola gpe
      JOIN produtos p ON p.id = gpe.produto_id
      JOIN escolas e ON e.id = gpe.escola_id
      WHERE gpe.guia_id = $1 AND gpe.quantidade > 0
      ORDER BY gpe.produto_id, gpe.data_entrega, gpe.escola_id
    `, [guia_id]);

    if (itensResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'A guia não possui itens com quantidade > 0' });
    }

    // 3. Agrupar por (produto_id, data_entrega) — cada grupo vira 1 pedido_item
    //    Para não perecíveis: agrupar apenas por produto_id (ignorar data_entrega)
    const grupos = new Map<string, {
      produto_id: number;
      produto_nome: string;
      perecivel: boolean;
      data_entrega: string | null;
      escolas: { escola_id: number; escola_nome: string; quantidade: number }[];
    }>();

    const toDateStr = (val: any): string | null => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString().split('T')[0];
      const s = String(val);
      // já é YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // ISO com T
      if (s.includes('T')) return s.split('T')[0];
      // fallback: tentar parsear
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    for (const row of itensResult.rows) {
      const dataKey = toDateStr(row.data_entrega);
      // Não perecíveis: agrupar só por produto (sem data)
      const key = row.perecivel
        ? `${row.produto_id}__${dataKey ?? ''}`
        : `${row.produto_id}__np`;

      if (!grupos.has(key)) {
        grupos.set(key, {
          produto_id: row.produto_id,
          produto_nome: row.produto_nome,
          perecivel: row.perecivel,
          data_entrega: row.perecivel ? dataKey : null,
          escolas: [],
        });
      }

      const g = grupos.get(key)!;
      // Acumular por escola (pode haver múltiplas linhas da mesma escola em não perecíveis)
      const existente = g.escolas.find(e => e.escola_id === row.escola_id);
      if (existente) {
        existente.quantidade += Number(row.quantidade);
      } else {
        g.escolas.push({ escola_id: row.escola_id, escola_nome: row.escola_nome, quantidade: Number(row.quantidade) });
      }

      // Para não perecíveis, usar a menor data_entrega disponível
      if (!row.perecivel && dataKey) {
        if (!g.data_entrega || dataKey < g.data_entrega) {
          g.data_entrega = dataKey;
        }
      }
    }

    // 4. Buscar contratos ativos para todos os produtos
    const todosProdutoIds = [...new Set(itensResult.rows.map((r: any) => r.produto_id))];
    const contratosResult = await client.query(`
      SELECT
        cp.id as contrato_produto_id,
        cp.produto_id,
        cp.preco_unitario,
        cp.quantidade_contratada,
        c.id as contrato_id,
        c.numero as contrato_numero,
        c.data_fim as contrato_data_fim,
        f.id as fornecedor_id,
        f.nome as fornecedor_nome,
        p.peso as peso_distribuicao,
        COALESCE(um.codigo, 'UN') as unidade,
        COALESCE(
          (SELECT SUM(cpm2.quantidade_disponivel)
           FROM contrato_produtos_modalidades cpm2
           WHERE cpm2.contrato_produto_id = cp.id AND cpm2.ativo = true),
          cp.quantidade_contratada
        ) as saldo_disponivel
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN fornecedores f ON f.id = c.fornecedor_id
      JOIN produtos p ON p.id = cp.produto_id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      WHERE cp.produto_id = ANY($1) AND cp.ativo = true
        AND c.status = 'ativo' AND c.data_fim >= CURRENT_DATE
      ORDER BY cp.produto_id, c.data_fim ASC
    `, [todosProdutoIds]);

    console.log('📦 Contratos encontrados:', contratosResult.rows.length);
    console.log('📋 Produtos buscados:', todosProdutoIds);

    // Agrupar TODOS os contratos por produto
    const contratosPorProduto = new Map<number, any[]>();
    for (const row of contratosResult.rows) {
      if (!contratosPorProduto.has(row.produto_id)) {
        contratosPorProduto.set(row.produto_id, []);
      }
      contratosPorProduto.get(row.produto_id)!.push(row);
    }

    console.log('📊 Produtos com contratos:', contratosPorProduto.size);

    // PRIMEIRO: Identificar produtos SEM contrato
    console.log('🔍 Verificando produtos sem contrato...');
    const produtosSemContrato: Array<{ produto_id: number; produto_nome: string; quantidade: number }> = [];
    const produtosComContrato: number[] = [];
    
    try {
      for (const grupo of grupos.values()) {
        const contratos = contratosPorProduto.get(grupo.produto_id) || [];
        const qtdTotal = grupo.escolas.reduce((sum, e) => sum + e.quantidade, 0);
        
        if (contratos.length === 0) {
          produtosSemContrato.push({
            produto_id: grupo.produto_id,
            produto_nome: grupo.produto_nome,
            quantidade: qtdTotal
          });
        } else {
          produtosComContrato.push(grupo.produto_id);
        }
      }
      
      console.log('✅ Produtos COM contrato:', produtosComContrato.length);
      console.log('❌ Produtos SEM contrato:', produtosSemContrato.length);
      
      if (produtosSemContrato.length > 0) {
        console.log('📋 Detalhes produtos sem contrato:', produtosSemContrato.map(p => `${p.produto_nome} (${p.quantidade}kg)`).join(', '));
      }
    } catch (error) {
      console.error('❌ Erro ao verificar produtos sem contrato:', error);
      throw error;
    }

    // SEGUNDO: Identificar produtos com múltiplos contratos (ANTES de verificar sem contrato)
    console.log('🔍 Verificando produtos com múltiplos contratos...');
    const produtosComMultiplosContratos: any[] = [];
    
    try {
      for (const grupo of grupos.values()) {
        const contratos = contratosPorProduto.get(grupo.produto_id) || [];
        if (contratos.length > 1) {
          const jaAdicionado = produtosComMultiplosContratos.find(p => p.produto_id === grupo.produto_id);
          if (!jaAdicionado) {
            const qtdTotal = grupo.escolas.reduce((sum, e) => sum + e.quantidade, 0);
            produtosComMultiplosContratos.push({
              produto_id: grupo.produto_id,
              produto_nome: grupo.produto_nome,
              unidade: 'kg',
              quantidade_necessaria: qtdTotal,
              contratos: contratos.map(c => ({
                contrato_produto_id: c.contrato_produto_id,
                contrato_id: c.contrato_id,
                contrato_numero: c.contrato_numero,
                fornecedor_id: c.fornecedor_id,
                fornecedor_nome: c.fornecedor_nome,
                preco_unitario: c.preco_unitario,
                saldo_disponivel: c.saldo_disponivel,
                data_fim: c.contrato_data_fim
              }))
            });
          }
        }
      }
      
      console.log('📊 Produtos com múltiplos contratos:', produtosComMultiplosContratos.length);
    } catch (error) {
      console.error('❌ Erro ao verificar múltiplos contratos:', error);
      throw error;
    }

    // TERCEIRO: Se houver produtos com múltiplos contratos E não foi fornecida a seleção, retornar para seleção
    const { contratos_selecionados } = req.body;
    
    console.log('🔍 Verificando seleção de contratos...');
    console.log('📋 Contratos selecionados recebidos:', contratos_selecionados ? 'SIM' : 'NÃO');
    console.log('📊 Produtos com múltiplos contratos:', produtosComMultiplosContratos.length);
    
    if (produtosComMultiplosContratos.length > 0 && !contratos_selecionados) {
      await client.query('ROLLBACK');
      console.log('⚠️ Retornando para seleção de múltiplos contratos');
      return res.status(200).json({
        requer_selecao: true,
        produtos_multiplos_contratos: produtosComMultiplosContratos,
        produtos_sem_contrato: produtosSemContrato.length > 0 ? produtosSemContrato : undefined,
        mensagem: `${produtosComMultiplosContratos.length} produto(s) encontrado(s) em múltiplos contratos. Selecione qual contrato usar para cada produto.`
      });
    }
    
    console.log('✅ Prosseguindo com geração do pedido...');

    // QUARTO: Se TODOS os produtos não têm contrato, retornar erro
    if (produtosSemContrato.length > 0 && produtosComContrato.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Nenhum produto da guia possui contrato ativo',
        produtos_sem_contrato: produtosSemContrato,
        mensagem: `Todos os ${produtosSemContrato.length} produtos da guia não possuem contrato ativo. Cadastre contratos antes de gerar o pedido.`
      });
    }

    // QUINTO: Se ALGUNS produtos não têm contrato, perguntar ao usuário
    const { ignorar_sem_contrato } = req.body;
    
    if (produtosSemContrato.length > 0 && !ignorar_sem_contrato) {
      await client.query('ROLLBACK');
      return res.status(200).json({
        requer_confirmacao: true,
        produtos_sem_contrato: produtosSemContrato,
        produtos_com_contrato: produtosComContrato.length,
        mensagem: `${produtosSemContrato.length} produto(s) não possuem contrato ativo e serão ignorados. Deseja continuar apenas com os ${produtosComContrato.length} produtos que têm contrato?`
      });
    }

    // SEXTO: Se foi fornecida seleção, usar os contratos selecionados
    const contratosSelecionadosMap = new Map<number, Array<{ contrato_produto_id: number; quantidade?: number }>>();
    if (contratos_selecionados) {
      for (const sel of contratos_selecionados) {
        if (!contratosSelecionadosMap.has(sel.produto_id)) {
          contratosSelecionadosMap.set(sel.produto_id, []);
        }
        contratosSelecionadosMap.get(sel.produto_id)!.push({
          contrato_produto_id: sel.contrato_produto_id,
          quantidade: sel.quantidade
        });
      }
    }

    // SÉTIMO: Montar mapa final de contratos a usar (apenas produtos COM contrato)
    console.log('🔧 Montando mapa de contratos a usar...');
    const contratosParaUsar = new Map<number, Array<{ contrato: any; quantidade?: number }>>();
    
    try {
      for (const [produto_id, contratos] of contratosPorProduto) {
        // Ignorar produtos sem contrato (já tratados acima)
        if (contratos.length === 0) continue;
        
        if (contratos.length === 1) {
          contratosParaUsar.set(produto_id, [{ contrato: contratos[0] }]);
        } else if (contratosSelecionadosMap.has(produto_id)) {
          const selecionados = contratosSelecionadosMap.get(produto_id)!;
          const contratosComDados = selecionados.map(sel => {
            const contrato = contratos.find(c => c.contrato_produto_id === sel.contrato_produto_id);
            return contrato ? { contrato, quantidade: sel.quantidade } : null;
          }).filter(Boolean) as Array<{ contrato: any; quantidade?: number }>;
          
          if (contratosComDados.length > 0) {
            contratosParaUsar.set(produto_id, contratosComDados);
          }
        }
      }
      
      console.log('✅ Contratos mapeados:', contratosParaUsar.size);
    } catch (error) {
      console.error('❌ Erro ao montar mapa de contratos:', error);
      throw error;
    }

    // SEXTO: Filtrar apenas grupos COM contrato para criar o pedido
    console.log('🔧 Filtrando grupos com contrato...');
    const gruposComContrato: typeof grupos = new Map();
    
    try {
      for (const [key, grupo] of grupos) {
        if (contratosParaUsar.has(grupo.produto_id) && contratosParaUsar.get(grupo.produto_id)!.length > 0) {
          gruposComContrato.set(key, grupo);
        }
      }
      
      console.log('✅ Grupos com contrato:', gruposComContrato.size);
      console.log('📊 Total de grupos:', grupos.size);
    } catch (error) {
      console.error('❌ Erro ao filtrar grupos:', error);
      throw error;
    }

    if (gruposComContrato.size === 0) {
      await client.query('ROLLBACK');
      const nomesSemContrato = produtosSemContrato.map(p => p.produto_nome).join(', ');
      return res.status(400).json({
        error: 'Nenhum produto com contrato ativo para gerar pedido',
        produtos_sem_contrato: produtosSemContrato,
        mensagem: `Produtos sem contrato: ${nomesSemContrato}`
      });
    }

    // SÉTIMO: Criar o pedido
    console.log('📝 Criando pedido...');
    const maxResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM LENGTH(numero) - 5) AS INTEGER)), 0) as max_seq
      FROM pedidos WHERE competencia_mes_ano = $1
    `, [competencia]);
    const seq = (parseInt(maxResult.rows[0].max_seq) + 1).toString().padStart(6, '0');
    const numero = `PED-${mesAbrev}${ano}${seq}`;
    console.log('📋 Número do pedido:', numero);

    const nomesSemContrato = produtosSemContrato.map(p => p.produto_nome).join(', ');
    const obsTexto = [
      observacoes,
      `Gerado da Guia de Demanda #${guia_id} (${guia.nome || competencia})`,
      produtosSemContrato.length > 0 ? `Sem contrato (não incluídos): ${nomesSemContrato}` : null,
    ].filter(Boolean).join(' | ');

    const pedidoResult = await client.query(`
      INSERT INTO pedidos (numero, data_pedido, status, valor_total, observacoes, usuario_criacao_id, competencia_mes_ano, guia_id)
      VALUES ($1, CURRENT_DATE, 'pendente', 0, $2, $3, $4, $5)
      RETURNING id
    `, [numero, obsTexto, usuario_id, competencia, guia_id]);

    const pedido_id = pedidoResult.rows[0].id;

    // 7. Inserir itens e programações
    for (const grupo of gruposComContrato.values()) {
      const contratosDoP = contratosParaUsar.get(grupo.produto_id)!;
      
      // Se houver divisão, criar um item por contrato
      for (const { contrato, quantidade: qtdContrato } of contratosDoP) {
        // Se quantidade foi especificada (divisão), usar ela; senão usar total do grupo
        const qtdTotalKg = qtdContrato !== undefined 
          ? qtdContrato 
          : grupo.escolas.reduce((s, e) => s + e.quantidade, 0);
        
        // Converter para unidade de compra (SIMPLIFICADO: sem conversão!)
        const conversao = converterDemandaParaCompra(
          qtdTotalKg,
          {
            peso_distribuicao_g: contrato.peso_distribuicao ? Number(contrato.peso_distribuicao) : undefined,
            unidade_distribuicao: contrato.unidade
          }
        );
        
        const preco = toNum(contrato.preco_unitario);
        const valorTotal = conversao.quantidade_compra * preco;
        const dataEntrega = grupo.data_entrega || new Date().toISOString().split('T')[0];

        const itemResult = await client.query(`
          INSERT INTO pedido_itens (
            pedido_id, contrato_produto_id, produto_id,
            quantidade, unidade, quantidade_kg,
            quantidade_distribuicao, unidade_distribuicao,
            preco_unitario, valor_total, data_entrega_prevista, observacoes
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `, [
          pedido_id, 
          contrato.contrato_produto_id, 
          grupo.produto_id, 
          conversao.quantidade_compra,
          conversao.unidade_compra,
          conversao.quantidade_kg,
          conversao.quantidade_distribuicao,
          conversao.unidade_distribuicao,
          preco, 
          valorTotal,
          dataEntrega, 
          qtdContrato !== undefined ? `Guia #${guia_id} (${qtdTotalKg.toFixed(2)}kg deste contrato)` : `Guia #${guia_id}`
        ]);

        const pedido_item_id = itemResult.rows[0].id;

        // Programação de entrega
        const progResult = await client.query(`
          INSERT INTO pedido_item_programacoes (pedido_item_id, data_entrega, observacoes)
          VALUES ($1, $2, $3) RETURNING id
        `, [pedido_item_id, dataEntrega, `Guia de Demanda #${guia_id}`]);

        const programacao_id = progResult.rows[0].id;

        // Escolas com quantidades (proporcionais se houver divisão)
        const totalGrupo = grupo.escolas.reduce((s, e) => s + e.quantidade, 0);
        const escolasRows = grupo.escolas
          .filter(esc => esc.quantidade > 0)
          .map(esc => {
            const qtd = qtdContrato !== undefined
              ? Math.round((esc.quantidade / totalGrupo) * qtdContrato * 1000) / 1000
              : Math.round(esc.quantidade * 1000) / 1000;
            return { escola_id: esc.escola_id, quantidade: qtd };
          });

        if (escolasRows.length > 0) {
          const values: any[] = [];
          const placeholders = escolasRows.map((r, idx) => {
            values.push(programacao_id, r.escola_id, r.quantidade);
            return `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`;
          });
          await client.query(
            `INSERT INTO pedido_item_programacao_escolas (programacao_id, escola_id, quantidade) VALUES ${placeholders.join(', ')}`,
            values
          );
        }
      }
    }

    // 8. Recalcular valor total do pedido
    await client.query(`
      UPDATE pedidos
      SET valor_total = (SELECT COALESCE(SUM(valor_total), 0) FROM pedido_itens WHERE pedido_id = $1),
          updated_at = NOW()
      WHERE id = $1
    `, [pedido_id]);

    const pedidoAtualizado = await client.query(`SELECT valor_total FROM pedidos WHERE id = $1`, [pedido_id]);
    const valorTotal = toNum(pedidoAtualizado.rows[0]?.valor_total, 0);

    await client.query('COMMIT');
    console.log('✅ Pedido criado com sucesso:', { pedido_id, numero, valorTotal });

    return res.status(200).json({
      pedidos_criados: [{
        pedido_id,
        numero,
        guia_id,
        total_itens: gruposComContrato.size,
        valor_total: valorTotal,
        produtos_sem_contrato: produtosSemContrato.length > 0 ? produtosSemContrato : undefined,
      }],
      erros: [],
      total_criados: 1,
      total_erros: 0,
      aviso: produtosSemContrato.length > 0 
        ? `${produtosSemContrato.length} produto(s) não incluído(s) por falta de contrato: ${nomesSemContrato}`
        : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao gerar pedido da guia:', error);
    console.error('Stack:', error instanceof Error ? error.stack : error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro interno' });
  } finally {
    client.release();
  }
};


// ─── Iniciar Job de Geração de Guias (Assíncrono) ────────────────────────────
export const iniciarGeracaoGuias = async (req: Request, res: Response) => {
  const { competencia, periodos, escola_ids, cardapio_ids, observacoes, considerar_indice_coccao, considerar_fator_correcao } = req.body as {
    competencia: string;
    periodos: Periodo[];
    escola_ids?: number[];
    cardapio_ids?: number[];
    observacoes?: string;
    considerar_indice_coccao?: boolean;
    considerar_fator_correcao?: boolean;
  };

  if (!competencia || !periodos || periodos.length === 0) {
    return res.status(400).json({ error: 'Competência e períodos são obrigatórios' });
  }

  try {
    // Criar job
    const job = await JobService.criarJob(
      'gerar_guias',
      {
        competencia,
        periodos,
        escola_ids,
        cardapio_ids,
        observacoes,
        considerar_indice_coccao,
        considerar_fator_correcao,
      },
      (req as any).usuario?.id
    );

    // Processar em background (não aguarda)
    processarGeracaoGuiasBackground(job.id).catch(err => {
      console.error('Erro ao processar job em background:', err);
    });

    return res.status(202).json({
      job_id: job.id,
      status: 'pendente',
      message: 'Geração de guias iniciada. Acompanhe o progresso.',
    });
  } catch (error) {
    console.error('Erro ao iniciar job:', error);
    return res.status(500).json({ error: 'Erro ao iniciar geração de guias' });
  }
};

// ─── Processar Geração de Guias em Background ────────────────────────────────
async function processarGeracaoGuiasBackground(jobId: number) {
  const job = await JobService.buscarJob(jobId);
  if (!job) {
    console.error(`Job ${jobId} não encontrado`);
    return;
  }

  const { competencia, periodos, escola_ids, cardapio_ids, observacoes, considerar_indice_coccao, considerar_fator_correcao } = job.parametros;
  const [ano, mes] = competencia.split('-').map(Number);

  const client = await db.pool.connect();

  try {
    await JobService.atualizarStatus(jobId, 'processando', { progresso: 0 });
    await client.query('BEGIN');

    const erros: string[] = [];

    // Calcular demanda para cada período
    await JobService.atualizarStatus(jobId, 'processando', { progresso: 10 });
    
    const demandasPorPeriodo: { periodo: Periodo; demanda: ProdutoDemanda[] }[] = [];
    for (let i = 0; i < periodos.length; i++) {
      const periodo = periodos[i];
      const demanda = await calcularDemandaPeriodo(
        ano,
        mes,
        periodo.data_inicio,
        periodo.data_fim,
        escola_ids,
        considerar_indice_coccao,
        considerar_fator_correcao,
        cardapio_ids
      );
      
      if (demanda.length === 0) {
        erros.push(`Período ${periodo.data_inicio} a ${periodo.data_fim}: nenhum produto calculado`);
      } else {
        demandasPorPeriodo.push({ periodo, demanda });
      }

      // Atualizar progresso (10% a 40%)
      const progressoPeriodos = 10 + Math.floor((i + 1) / periodos.length * 30);
      await JobService.atualizarStatus(jobId, 'processando', { progresso: progressoPeriodos });
    }

    if (demandasPorPeriodo.length === 0) {
      await client.query('ROLLBACK');
      await JobService.atualizarStatus(jobId, 'erro', {
        progresso: 100,
        erro: 'Nenhum produto calculado para os períodos informados',
        resultado: {
          erros: erros.map(m => ({ motivo: m })),
          detalhes_debug: {
            ano,
            mes,
            periodos_verificados: periodos.length,
            escola_ids: escola_ids || 'todas as escolas',
          },
        },
      });
      return;
    }

    // Buscar ou criar guia
    await JobService.atualizarStatus(jobId, 'processando', { progresso: 45 });
    
    const guiaExistente = await client.query(`SELECT id FROM guias WHERE competencia_mes_ano = $1`, [competencia]);
    let guia_id: number;

    if (guiaExistente.rows.length > 0) {
      guia_id = guiaExistente.rows[0].id;
      await client.query(`DELETE FROM guia_produto_escola WHERE guia_id = $1`, [guia_id]);
      await client.query(`
        UPDATE guias SET status = 'aberta', observacao = $1, job_id = $2, updated_at = NOW() WHERE id = $3
      `, [observacoes || null, jobId, guia_id]);
    } else {
      const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const nomePadrao = `Guia ${meses[mes - 1]}/${ano}`;
      
      // Gerar código único para a guia
      const codigoResult = await client.query(`SELECT gerar_codigo_guia($1, $2) as codigo`, [mes, ano]);
      const codigo_guia = codigoResult.rows[0].codigo;
      
      const guiaResult = await client.query(`
        INSERT INTO guias (mes, ano, nome, competencia_mes_ano, observacao, status, job_id, codigo_guia, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'aberta', $6, $7, NOW(), NOW())
        RETURNING id
      `, [mes, ano, nomePadrao, competencia, observacoes || null, jobId, codigo_guia]);
      guia_id = guiaResult.rows[0].id;
    }

    await JobService.atualizarStatus(jobId, 'processando', { progresso: 50 });

    // Buscar dados de produtos
    const todosProdutoIds = [...new Set(demandasPorPeriodo.flatMap(d => d.demanda.map(p => p.produto_id)))];
    const perecivelResult = await client.query(`
      SELECT p.id, p.perecivel, p.peso, COALESCE(um.codigo, 'UN') as unidade FROM produtos p LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id WHERE p.id = ANY($1)
    `, [todosProdutoIds]);

    const perecivelMap = new Map<number, boolean>(perecivelResult.rows.map((r: any) => [r.id, !!r.perecivel]));
    const embalagemMap = new Map<number, { peso_g: number; unidade: string }>(
      perecivelResult.rows
        .filter((r: any) => r.peso && r.peso > 0 && r.unidade)
        .map((r: any) => [r.id, { peso_g: Number(r.peso), unidade: r.unidade }])
    );

    const converterParaEmbalagem = (quantidade_kg: number, peso_g: number): number => {
      const quantidadeGramas = quantidade_kg * 1000;
      return Math.ceil(quantidadeGramas / peso_g);
    };

    // Montar itens
    const pereciveisParaInserir: { produto_id: number; escola_id: number; quantidade: number; unidade: string; data_entrega: string }[] = [];
    const naoPereciveisMap = new Map<string, { produto_id: number; escola_id: number; quantidade: number; unidade: string; data_entrega: string }>();

    for (const { periodo, demanda } of demandasPorPeriodo) {
      for (const produto of demanda) {
        const perecivel = perecivelMap.get(produto.produto_id) ?? true;
        const embalagem = embalagemMap.get(produto.produto_id);
        
        for (const esc of produto.por_escola) {
          if (esc.quantidade_kg <= 0) continue;

          let quantidade: number;
          let unidade: string;
          
          if (embalagem) {
            quantidade = converterParaEmbalagem(esc.quantidade_kg, embalagem.peso_g);
            unidade = embalagem.unidade;
          } else {
            quantidade = esc.quantidade_kg;
            unidade = produto.unidade || 'kg';
          }

          if (perecivel) {
            pereciveisParaInserir.push({
              produto_id: produto.produto_id,
              escola_id: esc.escola_id,
              quantidade,
              unidade,
              data_entrega: periodo.data_inicio,
            });
          } else {
            const key = `${produto.produto_id}__${esc.escola_id}`;
            if (!naoPereciveisMap.has(key)) {
              naoPereciveisMap.set(key, {
                produto_id: produto.produto_id,
                escola_id: esc.escola_id,
                quantidade: 0,
                unidade,
                data_entrega: periodo.data_inicio,
              });
            }
            
            if (embalagem) {
              naoPereciveisMap.get(key)!.quantidade += esc.quantidade_kg;
              (naoPereciveisMap.get(key) as any)._embalagem = embalagem;
            } else {
              naoPereciveisMap.get(key)!.quantidade += esc.quantidade_kg;
            }
          }
        }
      }
    }

    await JobService.atualizarStatus(jobId, 'processando', { progresso: 60 });

    // Montar rows de não perecíveis com conversão final
    const naoPereciveisRowsBg: GuiaItemRow[] = [];
    for (const item of naoPereciveisMap.values()) {
      const emb = (item as any)._embalagem as { peso_g: number; unidade: string } | undefined;
      const qtd = emb ? converterParaEmbalagem(item.quantidade, emb.peso_g) : Math.round(item.quantidade * 1000) / 1000;
      const unid = emb ? emb.unidade : item.unidade;
      naoPereciveisRowsBg.push({ produto_id: item.produto_id, escola_id: item.escola_id, quantidade: qtd, unidade: unid, data_entrega: item.data_entrega });
    }

    // Batch insert em chunks — atualiza progresso por chunk
    const totalParaInserir = pereciveisParaInserir.length + naoPereciveisRowsBg.length;
    const chunkSize = 500;
    let itensInseridos = 0;

    for (let i = 0; i < pereciveisParaInserir.length; i += chunkSize) {
      const chunk = pereciveisParaInserir.slice(i, i + chunkSize);
      await batchInsertGuiaItens(client, guia_id, chunk, chunkSize);
      itensInseridos += chunk.length;
      const progresso = 60 + Math.floor((itensInseridos / totalParaInserir) * 30);
      await JobService.atualizarStatus(jobId, 'processando', { progresso, itens_processados: itensInseridos });
    }

    for (let i = 0; i < naoPereciveisRowsBg.length; i += chunkSize) {
      const chunk = naoPereciveisRowsBg.slice(i, i + chunkSize);
      await batchInsertGuiaItens(client, guia_id, chunk, chunkSize);
      itensInseridos += chunk.length;
      const progresso = 60 + Math.floor((itensInseridos / totalParaInserir) * 30);
      await JobService.atualizarStatus(jobId, 'processando', { progresso, itens_processados: itensInseridos });
    }

    const totalItens = itensInseridos;

    await client.query('COMMIT');
    await JobService.atualizarStatus(jobId, 'concluido', {
      progresso: 100,
      resultado: {
        guia_id,
        competencia,
        total_produtos: todosProdutoIds.length,
        total_itens: totalItens,
        total_escolas: new Set(demandasPorPeriodo.flatMap(d => d.demanda.flatMap(p => p.por_escola.map(e => e.escola_id)))).size,
        erros: erros.map(m => ({ motivo: m })),
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao processar job:', error);
    
    await JobService.atualizarStatus(jobId, 'erro', {
      progresso: 100,
      erro: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  } finally {
    client.release();
  }
}

// ─── Buscar Status do Job ─────────────────────────────────────────────────────
export const buscarStatusJob = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const job = await JobService.buscarJob(parseInt(id));
    
    if (!job) {
      return res.status(404).json({ error: 'Job não encontrado' });
    }

    return res.json(job);
  } catch (error) {
    console.error('Erro ao buscar job:', error);
    return res.status(500).json({ error: 'Erro ao buscar status do job' });
  }
};

// ─── Listar Jobs do Usuário ───────────────────────────────────────────────────
export const listarJobsUsuario = async (req: Request, res: Response) => {
  try {
    const usuario_id = (req as any).usuario?.id;
    
    if (!usuario_id) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const jobs = await JobService.listarJobsUsuario(usuario_id, 50);
    return res.json(jobs);
  } catch (error) {
    console.error('Erro ao listar jobs:', error);
    return res.status(500).json({ error: 'Erro ao listar jobs' });
  }
};


// ─── Iniciar Job de Geração de Pedido (Assíncrono) ───────────────────────────
export const iniciarGeracaoPedido = async (req: Request, res: Response) => {
  const { guia_id, observacoes, contratos_selecionados, ignorar_sem_contrato } = req.body;

  if (!guia_id) {
    return res.status(400).json({ error: 'guia_id é obrigatório' });
  }

  try {
    // Criar job
    const job = await JobService.criarJob(
      'gerar_pedido',
      {
        guia_id,
        observacoes,
        contratos_selecionados,
        ignorar_sem_contrato,
      },
      (req as any).usuario?.id || (req as any).user?.id
    );

    // Processar em background
    processarGeracaoPedidoBackground(job.id).catch(err => {
      console.error('Erro ao processar job de pedido em background:', err);
    });

    return res.status(202).json({
      job_id: job.id,
      status: 'pendente',
      message: 'Geração de pedido iniciada. Acompanhe o progresso.',
    });
  } catch (error) {
    console.error('Erro ao iniciar job de pedido:', error);
    return res.status(500).json({ error: 'Erro ao iniciar geração de pedido' });
  }
};

// ─── Processar Geração de Pedido em Background ───────────────────────────────
async function processarGeracaoPedidoBackground(jobId: number) {
  const job = await JobService.buscarJob(jobId);
  if (!job) {
    console.error(`Job ${jobId} não encontrado`);
    return;
  }

  const { guia_id, observacoes, contratos_selecionados, ignorar_sem_contrato } = job.parametros;
  const usuario_id = job.usuario_id || 1;
  const client = await db.pool.connect();

  try {
    await JobService.atualizarStatus(jobId, 'processando', { progresso: 0 });
    await client.query('BEGIN');

    // Progresso: 0-10% - Buscar guia
    await JobService.atualizarStatus(jobId, 'processando', { progresso: 5 });
    
    const guiaResult = await client.query(`
      SELECT id, mes, ano, competencia_mes_ano, nome FROM guias WHERE id = $1
    `, [guia_id]);

    if (guiaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      await JobService.atualizarStatus(jobId, 'erro', {
        progresso: 100,
        erro: 'Guia não encontrada',
      });
      return;
    }

    const guia = guiaResult.rows[0];
    const competencia = guia.competencia_mes_ano || `${guia.ano}-${String(guia.mes).padStart(2, '0')}`;
    const [ano, mes] = competencia.split('-').map(Number);
    const meses = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    const mesAbrev = meses[mes - 1];

    // Progresso: 10-30% - Buscar itens e processar grupos
    await JobService.atualizarStatus(jobId, 'processando', { progresso: 10 });
    
    const itensResult = await client.query(`
      SELECT
        gpe.id as item_id, gpe.produto_id, gpe.escola_id, gpe.quantidade, gpe.unidade, gpe.data_entrega,
        p.nome as produto_nome, p.perecivel, e.nome as escola_nome
      FROM guia_produto_escola gpe
      JOIN produtos p ON p.id = gpe.produto_id
      JOIN escolas e ON e.id = gpe.escola_id
      WHERE gpe.guia_id = $1 AND gpe.quantidade > 0
      ORDER BY gpe.produto_id, gpe.data_entrega, gpe.escola_id
    `, [guia_id]);

    if (itensResult.rows.length === 0) {
      await client.query('ROLLBACK');
      await JobService.atualizarStatus(jobId, 'erro', {
        progresso: 100,
        erro: 'A guia não possui itens com quantidade > 0',
      });
      return;
    }

    await JobService.atualizarStatus(jobId, 'processando', { progresso: 20 });

    // Agrupar itens (lógica simplificada da função original)
    const grupos = new Map();
    const toDateStr = (val: any): string | null => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString().split('T')[0];
      const s = String(val);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (s.includes('T')) return s.split('T')[0];
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    for (const row of itensResult.rows) {
      const dataKey = toDateStr(row.data_entrega);
      const key = row.perecivel ? `${row.produto_id}__${dataKey ?? ''}` : `${row.produto_id}__np`;

      if (!grupos.has(key)) {
        grupos.set(key, {
          produto_id: row.produto_id,
          produto_nome: row.produto_nome,
          perecivel: row.perecivel,
          data_entrega: row.perecivel ? dataKey : null,
          escolas: [],
        });
      }

      const g = grupos.get(key)!;
      const existente = g.escolas.find((e: any) => e.escola_id === row.escola_id);
      if (existente) {
        existente.quantidade += Number(row.quantidade);
      } else {
        g.escolas.push({ escola_id: row.escola_id, escola_nome: row.escola_nome, quantidade: Number(row.quantidade) });
      }

      if (!row.perecivel && dataKey) {
        if (!g.data_entrega || dataKey < g.data_entrega) {
          g.data_entrega = dataKey;
        }
      }
    }

    // Progresso: 30-50% - Buscar contratos
    await JobService.atualizarStatus(jobId, 'processando', { progresso: 30 });

    const todosProdutoIds = [...new Set(itensResult.rows.map((r: any) => r.produto_id))];
    const contratosResult = await client.query(`
      SELECT
        cp.id as contrato_produto_id, cp.produto_id, cp.preco_unitario, cp.quantidade_contratada,
        c.id as contrato_id, c.numero as contrato_numero, c.data_fim as contrato_data_fim,
        f.id as fornecedor_id, f.nome as fornecedor_nome,
        p.peso as peso_distribuicao, COALESCE(um.codigo, 'UN') as unidade,
        COALESCE(
          (SELECT SUM(cpm2.quantidade_disponivel)
           FROM contrato_produtos_modalidades cpm2
           WHERE cpm2.contrato_produto_id = cp.id AND cpm2.ativo = true),
          cp.quantidade_contratada
        ) as saldo_disponivel
      FROM contrato_produtos cp
      JOIN contratos c ON c.id = cp.contrato_id
      JOIN fornecedores f ON f.id = c.fornecedor_id
      JOIN produtos p ON p.id = cp.produto_id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      WHERE cp.produto_id = ANY($1) AND cp.ativo = true
        AND c.status = 'ativo' AND c.data_fim >= CURRENT_DATE
      ORDER BY cp.produto_id, c.data_fim ASC
    `, [todosProdutoIds]);

    const contratosPorProduto = new Map<number, any[]>();
    for (const row of contratosResult.rows) {
      if (!contratosPorProduto.has(row.produto_id)) {
        contratosPorProduto.set(row.produto_id, []);
      }
      contratosPorProduto.get(row.produto_id)!.push(row);
    }

    await JobService.atualizarStatus(jobId, 'processando', { progresso: 40 });

    // Filtrar produtos sem contrato
    const produtosSemContrato: any[] = [];
    const gruposComContrato = new Map();
    
    for (const [key, grupo] of grupos) {
      const contratos = contratosPorProduto.get(grupo.produto_id) || [];
      if (contratos.length === 0) {
        const qtdTotal = grupo.escolas.reduce((sum: number, e: any) => sum + e.quantidade, 0);
        produtosSemContrato.push({
          produto_id: grupo.produto_id,
          produto_nome: grupo.produto_nome,
          quantidade: qtdTotal
        });
      } else {
        gruposComContrato.set(key, grupo);
      }
    }

    if (gruposComContrato.size === 0) {
      await client.query('ROLLBACK');
      await JobService.atualizarStatus(jobId, 'erro', {
        progresso: 100,
        erro: 'Nenhum produto com contrato ativo para gerar pedido',
        resultado: { produtos_sem_contrato: produtosSemContrato }
      });
      return;
    }

    // Progresso: 50-60% - Criar pedido
    await JobService.atualizarStatus(jobId, 'processando', { progresso: 50 });

    const maxResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM LENGTH(numero) - 5) AS INTEGER)), 0) as max_seq
      FROM pedidos WHERE competencia_mes_ano = $1
    `, [competencia]);
    const seq = (parseInt(maxResult.rows[0].max_seq) + 1).toString().padStart(6, '0');
    const numero = `PED-${mesAbrev}${ano}${seq}`;

    const nomesSemContrato = produtosSemContrato.map(p => p.produto_nome).join(', ');
    const obsTexto = [
      observacoes,
      `Gerado da Guia de Demanda #${guia_id} (${guia.nome || competencia})`,
      produtosSemContrato.length > 0 ? `Sem contrato (não incluídos): ${nomesSemContrato}` : null,
    ].filter(Boolean).join(' | ');

    const pedidoResult = await client.query(`
      INSERT INTO pedidos (numero, data_pedido, status, valor_total, observacoes, usuario_criacao_id, competencia_mes_ano, guia_id)
      VALUES ($1, CURRENT_DATE, 'pendente', 0, $2, $3, $4, $5)
      RETURNING id
    `, [numero, obsTexto, usuario_id, competencia, guia_id]);

    const pedido_id = pedidoResult.rows[0].id;

    // Progresso: 60-90% - Inserir itens
    await JobService.atualizarStatus(jobId, 'processando', { progresso: 60 });
    
    const totalGrupos = gruposComContrato.size;
    let gruposProcessados = 0;
    const tempoInicio = Date.now();

    for (const grupo of gruposComContrato.values()) {
      const contratos = contratosPorProduto.get(grupo.produto_id) || [];
      const contrato = contratos[0]; // Usar primeiro contrato (simplificado)
      
      const qtdTotalKg = grupo.escolas.reduce((s: number, e: any) => s + e.quantidade, 0);
      const conversao = converterDemandaParaCompra(qtdTotalKg, {
        peso_distribuicao_g: contrato.peso_distribuicao ? Number(contrato.peso_distribuicao) : undefined,
        unidade_distribuicao: contrato.unidade
      });
      
      const preco = toNum(contrato.preco_unitario);
      const valorTotal = conversao.quantidade_compra * preco;
      const dataEntrega = grupo.data_entrega || new Date().toISOString().split('T')[0];

      const itemResult = await client.query(`
        INSERT INTO pedido_itens (
          pedido_id, contrato_produto_id, produto_id, quantidade, unidade, quantidade_kg,
          quantidade_distribuicao, unidade_distribuicao, preco_unitario, valor_total, data_entrega_prevista, observacoes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        pedido_id, contrato.contrato_produto_id, grupo.produto_id, conversao.quantidade_compra,
        conversao.unidade_compra, conversao.quantidade_kg, conversao.quantidade_distribuicao,
        conversao.unidade_distribuicao, preco, valorTotal, dataEntrega, `Guia #${guia_id}`
      ]);

      const pedido_item_id = itemResult.rows[0].id;

      const progResult = await client.query(`
        INSERT INTO pedido_item_programacoes (pedido_item_id, data_entrega, observacoes)
        VALUES ($1, $2, $3) RETURNING id
      `, [pedido_item_id, dataEntrega, `Guia de Demanda #${guia_id}`]);

      const programacao_id = progResult.rows[0].id;

      const escolasRowsBg = grupo.escolas
        .filter((esc: any) => esc.quantidade > 0)
        .map((esc: any) => ({ escola_id: esc.escola_id, quantidade: Math.round(esc.quantidade * 1000) / 1000 }));

      if (escolasRowsBg.length > 0) {
        const vals: any[] = [];
        const ph = escolasRowsBg.map((r: any, idx: number) => {
          vals.push(programacao_id, r.escola_id, r.quantidade);
          return `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`;
        });
        await client.query(
          `INSERT INTO pedido_item_programacao_escolas (programacao_id, escola_id, quantidade) VALUES ${ph.join(', ')}`,
          vals
        );
      }

      gruposProcessados++;
      
      // Atualizar progresso a cada 5 grupos
      if (gruposProcessados % 5 === 0 || gruposProcessados === totalGrupos) {
        const progressoItens = 60 + Math.floor((gruposProcessados / totalGrupos) * 30);
        const tempoDecorrido = (Date.now() - tempoInicio) / 1000;
        const tempoMedioPorGrupo = gruposProcessados > 0 ? tempoDecorrido / gruposProcessados : 0;
        const gruposRestantes = totalGrupos - gruposProcessados;
        const tempoEstimado = Math.ceil(gruposRestantes * tempoMedioPorGrupo);
        
        await JobService.atualizarStatus(jobId, 'processando', {
          progresso: progressoItens,
          itens_processados: gruposProcessados,
          tempo_estimado: tempoEstimado
        });
      }
    }

    // Progresso: 90-100% - Finalizar
    await JobService.atualizarStatus(jobId, 'processando', { progresso: 95 });

    await client.query(`
      UPDATE pedidos
      SET valor_total = (SELECT COALESCE(SUM(valor_total), 0) FROM pedido_itens WHERE pedido_id = $1),
          updated_at = NOW()
      WHERE id = $1
    `, [pedido_id]);

    const pedidoAtualizado = await client.query(`SELECT valor_total FROM pedidos WHERE id = $1`, [pedido_id]);
    const valorTotal = toNum(pedidoAtualizado.rows[0]?.valor_total, 0);

    await client.query('COMMIT');
    
    await JobService.atualizarStatus(jobId, 'concluido', {
      progresso: 100,
      resultado: {
        pedido_id,
        numero,
        guia_id,
        total_itens: gruposComContrato.size,
        valor_total: valorTotal,
        produtos_sem_contrato: produtosSemContrato.length > 0 ? produtosSemContrato : undefined,
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao processar job de pedido:', error);
    
    await JobService.atualizarStatus(jobId, 'erro', {
      progresso: 100,
      erro: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  } finally {
    client.release();
  }
}
