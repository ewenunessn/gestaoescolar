// Controller para gerar demanda mensal de produtos
import { Request, Response } from "express";
import * as ExcelJS from 'exceljs';
import db from "../../../database";
import { obterPeriodoUsuario } from "../../../utils/periodoHelper";

interface DemandaItem {
  produto_id: number;
  produto_nome: string;
  unidade_medida: string;
  quantidade_total: number;
  quantidade_embalagens?: number; // Quantidade em unidades de embalagem
  peso_embalagem?: number; // Peso da embalagem em gramas
  valor_total: number;
  detalhes: {
    escola_nome: string;
    modalidade_nome: string;
    cardapio_nome: string;
    refeicao_nome: string;
    quantidade_alunos: number;
    frequencia_mensal: number;
    per_capita: number;
    tipo_medida: string;
    quantidade_calculada: number;
  }[];
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

// Função para calcular quantidade baseada no tipo de medida
function calcularQuantidade(
  quantidade_alunos: number, 
  frequencia_mensal: number, 
  per_capita: number, 
  tipo_medida: string, 
  fator_divisao: number
): number {
  const alunos = toSafeNumber(quantidade_alunos);
  const freq = toSafeNumber(frequencia_mensal);
  const capita = toSafeNumber(per_capita);
  const fator = toSafeNumber(fator_divisao, 1);
  
  let resultado: number;
  
  if (tipo_medida === 'unidades') {
    // Para unidades, não dividir por 1000
    resultado = (alunos * freq * capita) / fator;
  } else {
    // Para gramas, manter o cálculo original
    resultado = (alunos * freq * capita) / 1000 / fator;
  }
  
  return resultado;
}

export async function gerarDemandaMensal(req: Request, res: Response) {
  try {
    const { mes, ano, escola_ids, modalidade_ids } = req.body;

    console.log('Gerando demanda mensal:', { mes, ano, escola_ids, modalidade_ids });

    // Construir filtros dinâmicos
    let escolaFilter = '';
    let modalidadeFilter = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (escola_ids && escola_ids.length > 0) {
      escolaFilter = `AND e.id = ANY($${paramIndex})`;
      params.push(escola_ids);
      paramIndex++;
    }

    if (modalidade_ids && modalidade_ids.length > 0) {
      modalidadeFilter = `AND m.id = ANY($${paramIndex})`;
      params.push(modalidade_ids);
      paramIndex++;
    }

    // Query complexa para calcular demanda - suporta múltiplos cardápios por escola
    // Busca o MAIOR preço dos contratos ativos, depois preco_referencia como fallback
    const query = `
      SELECT
        p.id as produto_id,
        p.nome as produto_nome,
        p.unidade_distribuicao as unidade_medida,
        p.peso as peso_embalagem,
        p.preco_referencia,
        COALESCE(
          (SELECT MAX(cp2.preco_unitario)
           FROM contrato_produtos cp2
           INNER JOIN contratos ct2 ON cp2.contrato_id = ct2.id
           WHERE cp2.produto_id = p.id
           AND ct2.ativo = true
           AND CURRENT_DATE BETWEEN ct2.data_inicio AND ct2.data_fim),
          p.preco_referencia,
          0
        ) as preco_unitario,
        p.fator_divisao,
        e.id as escola_id,
        e.nome as escola_nome,
        m.id as modalidade_id,
        m.nome as modalidade_nome,
        c.id as cardapio_id,
        c.nome as cardapio_nome,
        r.id as refeicao_id,
        r.nome as refeicao_nome,
        em.quantidade_alunos,
        cr.frequencia_mensal,
        rp.per_capita,
        COALESCE(rp.tipo_medida, 'gramas') as tipo_medida
      FROM escolas e
      INNER JOIN escola_modalidades em ON e.id = em.escola_id
      INNER JOIN modalidades m ON em.modalidade_id = m.id
      INNER JOIN cardapios c ON (c.modalidade_id = m.id OR c.modalidade_id IS NULL) AND c.ativo = true
      INNER JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
      INNER JOIN refeicoes r ON cr.refeicao_id = r.id AND r.ativo = true
      INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
      INNER JOIN produtos p ON rp.produto_id = p.id AND p.ativo = true
      WHERE e.ativo = true
        ${escolaFilter}
        ${modalidadeFilter}
      ORDER BY p.nome, e.nome, m.nome, c.nome, r.nome
    `;

    const result = await db.query(query, params);
    const dados = result.rows;

    // Agrupar e calcular demanda
    const demandaMap = new Map<number, DemandaItem>();

    dados.forEach(row => {
      const {
        produto_id,
        produto_nome,
        unidade_medida,
        peso_embalagem,
        preco_referencia,
        preco_unitario,
        fator_divisao,
        escola_nome,
        modalidade_nome,
        cardapio_nome,
        refeicao_nome,
        quantidade_alunos,
        frequencia_mensal,
        per_capita,
        tipo_medida
      } = row;

      // Calcular quantidade baseada no tipo de medida
      const quantidade_calculada = calcularQuantidade(
        quantidade_alunos,
        frequencia_mensal,
        per_capita,
        tipo_medida,
        fator_divisao
      );

      if (!demandaMap.has(produto_id)) {
        demandaMap.set(produto_id, {
          produto_id,
          produto_nome,
          unidade_medida,
          peso_embalagem: peso_embalagem ? Number(peso_embalagem) : undefined,
          quantidade_total: 0,
          valor_total: 0,
          detalhes: []
        });
      }

      const item = demandaMap.get(produto_id)!;
      item.quantidade_total += quantidade_calculada;
      item.valor_total += quantidade_calculada * (preco_unitario || 0);

      item.detalhes.push({
        escola_nome,
        modalidade_nome,
        cardapio_nome,
        refeicao_nome,
        quantidade_alunos,
        frequencia_mensal,
        per_capita,
        tipo_medida,
        quantidade_calculada
      });
    });

    // Aplicar conversão de embalagem nos produtos
    const demanda = Array.from(demandaMap.values()).map(item => {
      const conversao = aplicarConversaoEmbalagem(
        item.quantidade_total,
        item.peso_embalagem || null,
        item.unidade_medida
      );

      return {
        ...item,
        unidade_medida: conversao.unidade,
        quantidade_embalagens: conversao.quantidade_embalagens,
        quantidade_total: Math.round(item.quantidade_total * 100) / 100
      };
    });

    // Calcular totais gerais
    const totalValor = demanda.reduce((sum, item) => sum + item.valor_total, 0);

    res.json({
      success: true,
      data: {
        demanda,
        resumo: {
          total_produtos: demanda.length,
          total_valor: totalValor,
          mes,
          ano,
          filtros: {
            escolas: escola_ids?.length || 0,
            modalidades: modalidade_ids?.length || 0
          }
        }
      }
    });

  } catch (error) {
    console.error("❌ Erro ao gerar demanda mensal:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao gerar demanda mensal",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}


export async function gerarDemandaMultiplosCardapios(req: Request, res: Response) {
  try {
    const { mes, ano, escola_ids, modalidade_ids, cardapio_ids } = req.body;

    console.log('Gerando demanda com múltiplos cardápios:', { mes, ano, escola_ids, modalidade_ids, cardapio_ids });

    // Construir filtros dinâmicos
    let escolaFilter = '';
    let modalidadeFilter = '';
    let cardapioFilter = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (escola_ids && escola_ids.length > 0) {
      escolaFilter = `AND e.id = ANY($${paramIndex})`;
      params.push(escola_ids);
      paramIndex++;
    }

    if (modalidade_ids && modalidade_ids.length > 0) {
      modalidadeFilter = `AND m.id = ANY($${paramIndex})`;
      params.push(modalidade_ids);
      paramIndex++;
    }

    if (cardapio_ids && cardapio_ids.length > 0) {
      cardapioFilter = `AND c.id = ANY($${paramIndex})`;
      params.push(cardapio_ids);
      paramIndex++;
    }

    // Query para calcular demanda com múltiplos cardápios
    const query = `
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.unidade_distribuicao as unidade_medida,
        p.preco_referencia,
        COALESCE(
          (SELECT MAX(cp2.preco_unitario) 
           FROM contrato_produtos cp2 
           INNER JOIN contratos ct2 ON cp2.contrato_id = ct2.id 
           WHERE cp2.produto_id = p.id 
           AND ct2.ativo = true 
           AND CURRENT_DATE BETWEEN ct2.data_inicio AND ct2.data_fim),
          p.preco_referencia, 
          0
        ) as preco_unitario,
        p.fator_divisao,
        e.id as escola_id,
        e.nome as escola_nome,
        m.id as modalidade_id,
        m.nome as modalidade_nome,
        c.id as cardapio_id,
        c.nome as cardapio_nome,
        r.id as refeicao_id,
        r.nome as refeicao_nome,
        em.quantidade_alunos,
        cr.frequencia_mensal,
        rp.per_capita,
        COALESCE(rp.tipo_medida, 'gramas') as tipo_medida
      FROM escolas e
      INNER JOIN escola_modalidades em ON e.id = em.escola_id
      INNER JOIN modalidades m ON em.modalidade_id = m.id
      INNER JOIN cardapios c ON (c.modalidade_id = m.id OR c.modalidade_id IS NULL) AND c.ativo = true
      INNER JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
      INNER JOIN refeicoes r ON cr.refeicao_id = r.id AND r.ativo = true
      INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
      INNER JOIN produtos p ON rp.produto_id = p.id AND p.ativo = true
      WHERE e.ativo = true
        ${escolaFilter}
        ${modalidadeFilter}
        ${cardapioFilter}
      ORDER BY p.nome, e.nome, m.nome, c.nome, r.nome
    `;

    const result = await db.query(query, params);
    const dados = result.rows;

    // Agrupar e calcular demanda
    const demandaMap = new Map<number, DemandaItem>();

    dados.forEach(row => {
      const {
        produto_id,
        produto_nome,
        unidade_medida,
        preco_referencia,
        preco_unitario,
        fator_divisao,
        escola_nome,
        modalidade_nome,
        cardapio_nome,
        refeicao_nome,
        quantidade_alunos,
        frequencia_mensal,
        per_capita,
        tipo_medida
      } = row;

      // Calcular quantidade baseada no tipo de medida
      const quantidade_calculada = calcularQuantidade(
        quantidade_alunos, 
        frequencia_mensal, 
        per_capita, 
        tipo_medida, 
        fator_divisao
      );

      if (!demandaMap.has(produto_id)) {
        demandaMap.set(produto_id, {
          produto_id,
          produto_nome,
          unidade_medida,
          quantidade_total: 0,
          valor_total: 0,
          detalhes: []
        });
      }

      const item = demandaMap.get(produto_id)!;
      item.quantidade_total += quantidade_calculada;
      item.valor_total += quantidade_calculada * (preco_unitario || 0);
      
      item.detalhes.push({
        escola_nome,
        modalidade_nome,
        cardapio_nome,
        refeicao_nome,
        quantidade_alunos,
        frequencia_mensal,
        per_capita,
        tipo_medida,
        quantidade_calculada
      });
    });

    const demanda = Array.from(demandaMap.values());

    // Calcular totais gerais
    const totalValor = demanda.reduce((sum, item) => sum + item.valor_total, 0);

    // Contar cardápios únicos utilizados
    const cardapiosUnicos = new Set(dados.map(row => row.cardapio_id));

    res.json({
      success: true,
      data: {
        demanda,
        resumo: {
          total_produtos: demanda.length,
          total_valor: totalValor,
          total_cardapios: cardapiosUnicos.size,
          mes,
          ano,
          filtros: {
            escolas: escola_ids?.length || 0,
            modalidades: modalidade_ids?.length || 0,
            cardapios: cardapio_ids?.length || 0
          }
        }
      }
    });

  } catch (error) {
    console.error("❌ Erro ao gerar demanda com múltiplos cardápios:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao gerar demanda com múltiplos cardápios",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export async function listarCardapiosDisponiveis(req: Request, res: Response) {
  try {
    const { escola_ids, modalidade_ids } = req.query;
    const userId = (req as any).user?.id;

    // Obter período do usuário ou período ativo global
    const periodoId = await obterPeriodoUsuario(userId);

    // Construir filtros dinâmicos
    let escolaFilter = '';
    let modalidadeFilter = '';
    let periodoFilter = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (periodoId) {
      periodoFilter = `AND cm.periodo_id = $${paramIndex}`;
      params.push(periodoId);
      paramIndex++;
    }

    if (escola_ids) {
      const escolaIdsArray = Array.isArray(escola_ids) ? escola_ids : [escola_ids];
      escolaFilter = `AND EXISTS (
        SELECT 1 FROM cardapio_modalidades cjm
        INNER JOIN escola_modalidades em ON em.modalidade_id = cjm.modalidade_id
        WHERE cjm.cardapio_id = cm.id AND em.escola_id = ANY($${paramIndex})
      )`;
      params.push(escolaIdsArray.map(Number));
      paramIndex++;
    }

    if (modalidade_ids) {
      const modalidadeIdsArray = Array.isArray(modalidade_ids) ? modalidade_ids : [modalidade_ids];
      modalidadeFilter = `AND EXISTS (
        SELECT 1 FROM cardapio_modalidades cjm
        WHERE cjm.cardapio_id = cm.id AND cjm.modalidade_id = ANY($${paramIndex})
      )`;
      params.push(modalidadeIdsArray.map(Number));
      paramIndex++;
    }

    const query = `
      SELECT DISTINCT
        cm.id,
        cm.nome,
        cm.mes,
        cm.ano,
        cm.periodo_id,
        p.ano as periodo_ano,
        COUNT(crd.id) as total_refeicoes,
        ARRAY_AGG(DISTINCT cjm.modalidade_id) FILTER (WHERE cjm.modalidade_id IS NOT NULL) as modalidades_ids,
        STRING_AGG(DISTINCT m.nome, ', ' ORDER BY m.nome) FILTER (WHERE m.nome IS NOT NULL) as modalidades_nomes
      FROM cardapios_modalidade cm
      LEFT JOIN periodos p ON cm.periodo_id = p.id
      LEFT JOIN cardapio_refeicoes_dia crd ON cm.id = crd.cardapio_modalidade_id
      LEFT JOIN cardapio_modalidades cjm ON cjm.cardapio_id = cm.id
      LEFT JOIN modalidades m ON m.id = cjm.modalidade_id
      WHERE cm.ativo = true
        ${periodoFilter}
        ${escolaFilter}
        ${modalidadeFilter}
      GROUP BY cm.id, cm.nome, cm.mes, cm.ano, cm.periodo_id, p.ano
      ORDER BY cm.ano DESC, cm.mes DESC, cm.nome
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error("❌ Erro ao listar cardápios disponíveis:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar cardápios disponíveis",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}


export async function exportarDemandaMensal(req: Request, res: Response) {
  try {
    const { mes, ano, escola_ids, modalidade_ids, formato = 'json' } = req.body;

    // Reutilizar a lógica de gerarDemandaMensal
    const demandaReq = { ...req, body: { mes, ano, escola_ids, modalidade_ids } };
    const demandaRes = {
      json: (data: any) => {
        if (formato === 'csv') {
          // Converter para CSV
          const csvHeader = 'Produto,Unidade,Quantidade,Valor Total\n';
          const csvRows = data.data.demanda.map((item: DemandaItem) => 
            `"${item.produto_nome}","${item.unidade_medida}",${item.quantidade_total.toFixed(2)},${item.valor_total.toFixed(2)}`
          ).join('\n');
          
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="demanda_${mes}_${ano}.csv"`);
          res.send(csvHeader + csvRows);
        } else {
          res.json(data);
        }
      },
      status: (code: number) => ({ json: (data: any) => res.status(code).json(data) })
    } as any;

    await gerarDemandaMensal(demandaReq as Request, demandaRes as Response);

  } catch (error) {
    console.error("❌ Erro ao exportar demanda mensal:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao exportar demanda mensal",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

// Função auxiliar para converter valores para números seguros
function toSafeNumber(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

export async function exportarDemandaExcel(req: Request, res: Response) {
  try {
    const { mes, ano, escola_ids, modalidade_ids } = req.body;

    console.log('Exportando demanda para Excel:', { mes, ano, escola_ids, modalidade_ids });

    // Validações
    if (!mes || !ano) {
      return res.status(400).json({
        success: false,
        message: "Mês e ano são obrigatórios"
      });
    }

    // Filtros para escolas e modalidades
    let escolaFilter = '';
    let modalidadeFilter = '';
    const params: any[] = [];

    if (escola_ids && escola_ids.length > 0) {
      const placeholders = escola_ids.map((_: any, index: number) => `$${params.length + index + 1}`).join(',');
      escolaFilter = `AND e.id IN (${placeholders})`;
      params.push(...escola_ids);
    }

    if (modalidade_ids && modalidade_ids.length > 0) {
      const placeholders = modalidade_ids.map((_: any, index: number) => `$${params.length + index + 1}`).join(',');
      modalidadeFilter = `AND m.id IN (${placeholders})`;
      params.push(...modalidade_ids);
    }

    // Query para buscar dados detalhados para Excel
    const query = `
      SELECT 
        p.id as produto_id,
        p.nome as produto_nome,
        p.unidade_distribuicao as unidade_medida,
        p.preco_referencia,
        COALESCE(
          (SELECT MAX(cp2.preco_unitario) 
           FROM contrato_produtos cp2 
           INNER JOIN contratos ct2 ON cp2.contrato_id = ct2.id 
           WHERE cp2.produto_id = p.id 
           AND ct2.ativo = true 
           AND CURRENT_DATE BETWEEN ct2.data_inicio AND ct2.data_fim),
          p.preco_referencia, 
          0
        ) as preco_unitario,
        p.fator_divisao,
        e.id as escola_id,
        e.nome as escola_nome,
        m.id as modalidade_id,
        m.nome as modalidade_nome,
        c.id as cardapio_id,
        c.nome as cardapio_nome,
        r.id as refeicao_id,
        r.nome as refeicao_nome,
        em.quantidade_alunos,
        cr.frequencia_mensal,
        rp.per_capita,
        COALESCE(rp.tipo_medida, 'gramas') as tipo_medida
      FROM escolas e
      INNER JOIN escola_modalidades em ON e.id = em.escola_id
      INNER JOIN modalidades m ON em.modalidade_id = m.id
      INNER JOIN cardapios c ON (c.modalidade_id = m.id OR c.modalidade_id IS NULL) AND c.ativo = true
      INNER JOIN cardapio_refeicoes cr ON cr.cardapio_id = c.id
      INNER JOIN refeicoes r ON cr.refeicao_id = r.id AND r.ativo = true
      INNER JOIN refeicao_produtos rp ON rp.refeicao_id = r.id
      INNER JOIN produtos p ON rp.produto_id = p.id AND p.ativo = true
      WHERE e.ativo = true
        ${escolaFilter}
        ${modalidadeFilter}
      ORDER BY p.nome, e.nome, m.nome, c.nome, r.nome
    `;

    const result = await db.query(query, params);
    const dados = result.rows;

    console.log(`📊 Processando ${dados.length} registros para Excel`);

    if (dados.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Nenhum dado encontrado para os filtros especificados"
      });
    }

    // Processar dados para Excel
    const demandaMap = new Map<number, any>();
    const escolaProdutoMap = new Map<string, any>();

    dados.forEach((row, index) => {
      const {
        produto_id,
        produto_nome,
        unidade_medida,
        preco_unitario,
        fator_divisao,
        escola_nome,
        quantidade_alunos,
        frequencia_mensal,
        per_capita,
        tipo_medida
      } = row;

      // Debug log para primeiros registros
      if (index < 5) {
        console.log(`📝 Registro ${index + 1}:`, {
          escola_nome,
          produto_nome,
          quantidade_alunos,
          frequencia_mensal,
          per_capita,
          tipo_medida,
          fator_divisao
        });
      }

      // Calcular quantidade
      const quantidade_calculada = calcularQuantidade(
        quantidade_alunos, 
        frequencia_mensal, 
        per_capita, 
        tipo_medida, 
        fator_divisao
      );

      // Debug log para quantidade calculada
      if (index < 5) {
        console.log(`🧮 Quantidade calculada para ${escola_nome} - ${produto_nome}: ${quantidade_calculada}`);
      }

      // Agregar por produto (Aba 1)
      if (!demandaMap.has(produto_id)) {
        demandaMap.set(produto_id, {
          produto_nome,
          unidade_medida,
          quantidade_total: 0,
          preco_unitario: toSafeNumber(preco_unitario),
          valor_total: 0
        });
      }

      const item = demandaMap.get(produto_id)!;
      item.quantidade_total += quantidade_calculada;
      item.valor_total = item.quantidade_total * item.preco_unitario;

      // Agregar por escola e produto (Aba 2)
      const chave = `${escola_nome}|${produto_id}`;
      if (!escolaProdutoMap.has(chave)) {
        escolaProdutoMap.set(chave, {
          escola_nome,
          produto_nome,
          unidade_medida,
          quantidade: 0
        });
      }

      const itemEscola = escolaProdutoMap.get(chave)!;
      itemEscola.quantidade += quantidade_calculada;
      
      // Debug log para primeira escola
      if (escola_nome === 'Anexo - Didi' && produto_nome.includes('Baião')) {
        console.log(`📊 ${escola_nome} - ${produto_nome}:`, {
          chave,
          quantidade_calculada,
          quantidade_anterior: itemEscola.quantidade - quantidade_calculada,
          quantidade_nova: itemEscola.quantidade,
          produto_id,
          modalidade_nome: row.modalidade_nome,
          cardapio_nome: row.cardapio_nome,
          refeicao_nome: row.refeicao_nome,
          calculo_detalhado: {
            alunos: quantidade_alunos,
            freq: frequencia_mensal,
            per_capita: per_capita,
            tipo_medida: tipo_medida,
            fator_divisao: fator_divisao,
            formula: `(${quantidade_alunos} * ${frequencia_mensal} * ${per_capita}) / 1000 / ${fator_divisao} = ${quantidade_calculada}`
          }
        });
      }
    });

    // Criar workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema de Alimentação Escolar';
    workbook.created = new Date();

    // ABA 1: Resumo Geral
    const wsResumo = workbook.addWorksheet('Resumo Geral');
    
    // Cabeçalhos da aba resumo
    wsResumo.columns = [
      { header: 'Produto', key: 'produto', width: 30 },
      { header: 'Unidade de Medida', key: 'unidade', width: 15 },
      { header: 'Quantidade', key: 'quantidade', width: 15 },
      { header: 'Preço Unitário', key: 'preco', width: 15 },
      { header: 'Valor Total', key: 'valor', width: 15 }
    ];

    // Estilizar cabeçalho
    wsResumo.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Adicionar dados do resumo
    const demandaArray = Array.from(demandaMap.values());
    demandaArray.forEach(item => {
      const quantidade = toSafeNumber(item.quantidade_total);
      const preco = toSafeNumber(item.preco_unitario);
      const valor = toSafeNumber(item.valor_total);
      
      const dataRow = wsResumo.addRow({
        produto: item.produto_nome || 'Produto sem nome',
        unidade: item.unidade_medida || 'kg',
        quantidade: Number(quantidade.toFixed(3)),
        preco: Number(preco.toFixed(2)),
        valor: Number(valor.toFixed(2))
      });

      // Adicionar bordas às linhas de dados
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Formatar colunas numéricas
    wsResumo.getColumn('quantidade').numFmt = '#,##0.000';
    wsResumo.getColumn('preco').numFmt = 'R$ #,##0.00';
    wsResumo.getColumn('valor').numFmt = 'R$ #,##0.00';

    // ABA 2: Quantidade por Escola
    const wsEscolas = workbook.addWorksheet('Por Escola');

    // Criar mapeamento produto_nome -> produto_id para facilitar busca
    const produtoNomeParaId = new Map<string, number>();
    Array.from(demandaMap.entries()).forEach(([id, item]) => {
      produtoNomeParaId.set(item.produto_nome, id);
    });

    console.log(`🗺️ Mapeamento produto_nome -> produto_id:`);
    Array.from(produtoNomeParaId.entries()).forEach(([nome, id]) => {
      console.log(`   "${nome}" -> ${id}`);
    });

    // Obter lista única de produtos e escolas
    const produtos = [...new Set(Array.from(escolaProdutoMap.values()).map(item => item.produto_nome))].sort();
    const escolas = [...new Set(Array.from(escolaProdutoMap.values()).map(item => item.escola_nome))].sort();

    console.log(`📋 Produtos encontrados: ${produtos.join(', ')}`);
    console.log(`🏫 Escolas encontradas: ${escolas.join(', ')}`);
    console.log(`🗂️ Total de chaves escola-produto: ${escolaProdutoMap.size}`);
    
    // Log das chaves para Anexo - Didi especificamente
    const chavesAnexoDidi = Array.from(escolaProdutoMap.keys()).filter(chave => chave.includes('Anexo - Didi'));
    console.log(`🔑 Chaves para Anexo - Didi:`, chavesAnexoDidi);
    
    // Log dos valores para Anexo - Didi
    chavesAnexoDidi.forEach(chave => {
      const item = escolaProdutoMap.get(chave);
      console.log(`📋 ${chave}:`, item);
    });

    // Log final dos totais por escola para Anexo - Didi
    console.log(`🎯 Totais finais para Anexo - Didi:`);
    produtos.forEach(produto => {
      const produto_id = produtoNomeParaId.get(produto);
      const chave = `Anexo - Didi|${produto_id}`;
      const item = escolaProdutoMap.get(chave);
      if (item) {
        console.log(`   ${produto}: ${item.quantidade}`);
      }
    });

    // Criar cabeçalhos dinâmicos (primeira linha)
    const headers = ['Escolas', ...produtos];
    const headerRow = wsEscolas.addRow(headers);

    // Estilizar cabeçalho
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD0D0D0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Adicionar linha com unidades de medida (segunda linha)
    const unidadesRow = ['Unidade de medida'];
    produtos.forEach(produto => {
      // Buscar a unidade de medida do produto no demandaMap
      const produtoInfo = Array.from(demandaMap.values()).find(item => item.produto_nome === produto);
      unidadesRow.push(produtoInfo?.unidade_medida || 'Kg');
    });
    const unidadeRowExcel = wsEscolas.addRow(unidadesRow);

    // Estilizar linha de unidades
    unidadeRowExcel.eachCell((cell) => {
      cell.font = { italic: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF2CC' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Adicionar dados por escola
    escolas.forEach(escola => {
      const rowData = [escola];
      
      produtos.forEach(produto => {
        const produto_id = produtoNomeParaId.get(produto);
        const chave = `${escola}|${produto_id}`;
        const item = escolaProdutoMap.get(chave);
        const quantidade = toSafeNumber(item?.quantidade);
        
        // Debug log específico para Anexo - Didi
        if (escola === 'Anexo - Didi' && produto.includes('Baião')) {
          console.log(`🔍 ${escola} - ${produto}:`, {
            produto_id,
            chave,
            item_existe: !!item,
            quantidade_original: item?.quantidade,
            quantidade_convertida: quantidade,
            produto_nome_busca: produto,
            mapeamento_produto_id: produtoNomeParaId.get(produto)
          });
        }
        
        // Usar 2 casas decimais para todos os valores
        const valorFinal = Number(quantidade.toFixed(2));
        rowData.push(valorFinal || 0);
      });
      
      const dataRow = wsEscolas.addRow(rowData);
      
      // Adicionar bordas às linhas de dados
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Ajustar largura das colunas
    wsEscolas.getColumn(1).width = 30; // Coluna de escolas
    for (let i = 2; i <= headers.length; i++) {
      wsEscolas.getColumn(i).width = 15;
    }

    // Configurar resposta HTTP
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=demanda_${mes}_${ano}.xlsx`);

    // Enviar arquivo
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("❌ Erro ao exportar demanda para Excel:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao exportar demanda para Excel",
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
