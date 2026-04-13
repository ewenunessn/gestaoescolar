import { Request, Response } from 'express';
import db from '../../../database';
import { toNum } from '../../../utils/typeHelpers';

// Helper para converter per_capita para gramas
const getQuantidadeLiquida = (ing: {
  per_capita: number;
  tipo_medida: string;
  peso_unitario: number | null;
}) => {
  if (ing.tipo_medida === 'unidades') {
    const peso = toNum(ing.peso_unitario, 100);
    const perCapita = toNum(ing.per_capita, 0);
    return perCapita * peso;
  }
  return toNum(ing.per_capita, 0);
};

interface IngredienteNutricional {
  produto_id: number;
  produto_nome: string;
  per_capita: number;
  tipo_medida: string;
  fator_correcao: number;
  peso_unitario: number | null;
  calorias_100g: number | null;
  proteinas_100g: number | null;
  carboidratos_100g: number | null;
  lipidios_100g: number | null;
  fibras_100g: number | null;
  sodio_100g: number | null;
  calcio_100g: number | null;
  ferro_100g: number | null;
  vitamina_a_100g: number | null;
  vitamina_c_100g: number | null;
}

interface IngredienteCusto {
  produto_id: number;
  produto_nome: string;
  per_capita: number;
  tipo_medida: string;
  fator_correcao: number;
  peso_unitario: number | null;
  peso_embalagem: number;
  unidade_distribuicao: string;
  preco_unitario: number | null;
}

type DetalhamentoCusto = {
  produto: string;
  quantidade_liquida: number;
  quantidade_bruta: number;
  unidade: string;
  fator_correcao: number;
  peso_embalagem?: number;
  unidade_distribuicao?: string;
  preco_unitario: number | null;
  custo: number | null;
  aviso?: string;
};

// Calcular valores nutricionais da refeição baseado nos ingredientes
export const calcularValoresNutricionais = async (req: Request, res: Response) => {
  const { id } = req.params; // refeicao_id
  const { rendimento_porcoes, modalidade_id } = req.body; // número de porções e modalidade opcional

  console.log(`[NUTRICIONAL] Calculando para refeição ${id}, rendimento: ${rendimento_porcoes}, modalidade: ${modalidade_id}`);

  try {
    // Validar entrada
    const porcoes = Math.max(1, Number(rendimento_porcoes) || 1);
    // Query que busca per capita ajustado por modalidade se modalidade_id for fornecido
    // NOTA: per_capita sempre representa alimento PRONTO (cozido/preparado)
    // Por isso NÃO usamos indice_coccao - apenas fator_correcao (perda no pré-preparo)
    const query = modalidade_id ? `
      SELECT
        rp.produto_id,
        p.nome as produto_nome,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        rp.tipo_medida,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        p.peso as peso_unitario,
        pcn.energia_kcal as calorias_100g,
        pcn.proteina_g as proteinas_100g,
        pcn.carboidratos_g as carboidratos_100g,
        pcn.lipideos_g as lipidios_100g,
        pcn.fibra_alimentar_g as fibras_100g,
        pcn.sodio_mg as sodio_100g,
        pcn.calcio_mg as calcio_100g,
        pcn.ferro_mg as ferro_100g,
        pcn.vitamina_a_mcg as vitamina_a_100g,
        pcn.vitamina_c_mg as vitamina_c_100g
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN produto_composicao_nutricional pcn ON pcn.produto_id = p.id
      LEFT JOIN refeicao_produto_modalidade rpm ON rpm.refeicao_produto_id = rp.id AND rpm.modalidade_id = $2
      WHERE rp.refeicao_id = $1
      ORDER BY rp.ordem, rp.id
    ` : `
      SELECT
        rp.produto_id,
        p.nome as produto_nome,
        rp.per_capita,
        rp.tipo_medida,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        p.peso as peso_unitario,
        pcn.energia_kcal as calorias_100g,
        pcn.proteina_g as proteinas_100g,
        pcn.carboidratos_g as carboidratos_100g,
        pcn.lipideos_g as lipidios_100g,
        pcn.fibra_alimentar_g as fibras_100g,
        pcn.sodio_mg as sodio_100g,
        pcn.calcio_mg as calcio_100g,
        pcn.ferro_mg as ferro_100g,
        pcn.vitamina_a_mcg as vitamina_a_100g,
        pcn.vitamina_c_mg as vitamina_c_100g
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN produto_composicao_nutricional pcn ON pcn.produto_id = p.id
      WHERE rp.refeicao_id = $1
      ORDER BY rp.ordem, rp.id
    `;

    const params = modalidade_id ? [id, modalidade_id] : [id];
    const result = await db.pool.query<IngredienteNutricional>(query, params);

    const ingredientes = result.rows;

    if (ingredientes.length === 0) {
      return res.status(400).json({
        error: 'Nenhum ingrediente encontrado para esta refeição'
      });
    }

    // Helper para arredondar valores
    const round2 = (n: number) => Math.round(n * 100) / 100;

    // Calcular totais (soma de todos os ingredientes)
    const totais = {
      calorias: 0,
      proteinas: 0,
      carboidratos: 0,
      lipidios: 0,
      fibras: 0,
      sodio: 0,
      calcio: 0,
      ferro: 0,
      vitamina_a: 0,
      vitamina_c: 0
    };
    
    const camposMap = {
      calorias: 'calorias_100g',
      proteinas: 'proteinas_100g',
      carboidratos: 'carboidratos_100g',
      lipidios: 'lipidios_100g',
      fibras: 'fibras_100g',
      sodio: 'sodio_100g',
      calcio: 'calcio_100g',
      ferro: 'ferro_100g',
      vitamina_a: 'vitamina_a_100g',
      vitamina_c: 'vitamina_c_100g'
    } as const;
    
    const camposEntries = Object.entries(camposMap);
    const ingredientesSemInfo = new Set<string>();

    for (const ing of ingredientes) {
      // Per capita cadastrado depende do tipo_medida:
      // - Se 'gramas' ou 'mililitros': per_capita já está em gramas/ml
      // - Se 'unidades': per_capita é a QUANTIDADE de unidades, precisa multiplicar pelo peso
      const quantidadeGramasLiquido = getQuantidadeLiquida(ing);

      // Calcular proporção usando quantidade LÍQUIDA (quantidade / 100g)
      // Evitar divisão por zero
      const proporcao = quantidadeGramasLiquido ? quantidadeGramasLiquido / 100 : 0;

      // Somar valores nutricionais usando mapeamento dinâmico
      for (const [key, campo] of camposEntries) {
        const valor = ing[campo as keyof IngredienteNutricional];
        
        if (valor != null) {
          totais[key as keyof typeof totais] += Number(valor) * proporcao;
        } else if (key === 'calorias') {
          // Só adiciona uma vez se não tiver calorias
          ingredientesSemInfo.add(ing.produto_nome);
        }
      }
    }

    // Calcular por porção (se rendimento foi informado)
    const caloriasPorPorcao = totais.calorias / porcoes;
    const proteinasPorPorcao = totais.proteinas / porcoes;
    const carboidratosPorPorcao = totais.carboidratos / porcoes;
    const lipidiosPorPorcao = totais.lipidios / porcoes;
    const fibrasPorPorcao = totais.fibras / porcoes;
    const sodioPorPorcao = totais.sodio / porcoes;
    const calcioPorPorcao = totais.calcio / porcoes;
    const ferroPorPorcao = totais.ferro / porcoes;
    const vitaminaAPorPorcao = totais.vitamina_a / porcoes;
    const vitaminaCPorPorcao = totais.vitamina_c / porcoes;

    // Alertas nutricionais (valores de referência para refeição principal)
    const alertas = [];
    
    if (caloriasPorPorcao < 300) {
      alertas.push({ tipo: 'warning', mensagem: 'Calorias abaixo do recomendado para refeição principal (mínimo 300 kcal)' });
    } else if (caloriasPorPorcao > 800) {
      alertas.push({ tipo: 'warning', mensagem: 'Calorias acima do recomendado para refeição principal (máximo 800 kcal)' });
    }

    if (proteinasPorPorcao < 10) {
      alertas.push({ tipo: 'info', mensagem: 'Proteínas abaixo do ideal (mínimo 10g por refeição)' });
    }

    if (sodioPorPorcao > 800) {
      alertas.push({ tipo: 'warning', mensagem: 'Sódio elevado (máximo recomendado 800mg por refeição)' });
    }

    if (fibrasPorPorcao < 3) {
      alertas.push({ tipo: 'info', mensagem: 'Fibras abaixo do ideal (mínimo 3g por refeição)' });
    }

    console.log(`[NUTRICIONAL] Cálculo concluído - Total: ${totais.calorias.toFixed(1)} kcal, Por porção: ${caloriasPorPorcao.toFixed(1)} kcal`);

    return res.json({
      total: {
        calorias: round2(totais.calorias),
        proteinas: round2(totais.proteinas),
        carboidratos: round2(totais.carboidratos),
        lipidios: round2(totais.lipidios),
        fibras: round2(totais.fibras),
        sodio: round2(totais.sodio),
        calcio: round2(totais.calcio),
        ferro: round2(totais.ferro),
        vitamina_a: round2(totais.vitamina_a),
        vitamina_c: round2(totais.vitamina_c)
      },
      por_porcao: {
        calorias: round2(caloriasPorPorcao),
        proteinas: round2(proteinasPorPorcao),
        carboidratos: round2(carboidratosPorPorcao),
        lipidios: round2(lipidiosPorPorcao),
        fibras: round2(fibrasPorPorcao),
        sodio: round2(sodioPorPorcao),
        calcio: round2(calcioPorPorcao),
        ferro: round2(ferroPorPorcao),
        vitamina_a: round2(vitaminaAPorPorcao),
        vitamina_c: round2(vitaminaCPorPorcao)
      },
      rendimento_porcoes: porcoes,
      alertas,
      ingredientes_sem_info: Array.from(ingredientesSemInfo),
      aviso: ingredientesSemInfo.size > 0 
        ? `${ingredientesSemInfo.size} ingrediente(s) sem informação nutricional cadastrada. Complete os dados nutricionais para cálculo preciso.`
        : null
    });

  } catch (error) {
    console.error('Erro ao calcular valores nutricionais:', error);
    return res.status(500).json({ error: 'Erro ao calcular valores nutricionais' });
  }
};

// Calcular custo da refeição baseado nos contratos ativos
export const calcularCusto = async (req: Request, res: Response) => {
  const { id } = req.params; // refeicao_id
  const { rendimento_porcoes, modalidade_id } = req.body;

  try {
    // Validar entrada
    const porcoes = Math.max(1, Number(rendimento_porcoes) || 1);
    // Query que busca per capita ajustado por modalidade se modalidade_id for fornecido
    // NOTA: per_capita sempre representa alimento PRONTO (cozido/preparado)
    // Por isso NÃO usamos indice_coccao aqui - apenas fator_correcao (perda no pré-preparo)
    const query = modalidade_id ? `
      SELECT
        rp.produto_id,
        p.nome as produto_nome,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        rp.tipo_medida,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        p.peso as peso_unitario,
        COALESCE(p.peso, 1000) as peso_embalagem,
        COALESCE(um.codigo, 'UN') as unidade,
        cp.preco_unitario
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      LEFT JOIN refeicao_produto_modalidade rpm ON rpm.refeicao_produto_id = rp.id AND rpm.modalidade_id = $2
      LEFT JOIN LATERAL (
        SELECT preco_unitario
        FROM contrato_produtos cp
        INNER JOIN contratos c ON c.id = cp.contrato_id
        WHERE cp.produto_id = rp.produto_id
          AND c.status = 'ativo'
          AND cp.ativo = true
          AND CURRENT_DATE BETWEEN c.data_inicio AND c.data_fim
        ORDER BY c.data_inicio DESC
        LIMIT 1
      ) cp ON true
      WHERE rp.refeicao_id = $1
      ORDER BY rp.ordem, rp.id
    ` : `
      SELECT
        rp.produto_id,
        p.nome as produto_nome,
        rp.per_capita,
        rp.tipo_medida,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        p.peso as peso_unitario,
        COALESCE(p.peso, 1000) as peso_embalagem,
        COALESCE(um.codigo, 'UN') as unidade,
        cp.preco_unitario
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      LEFT JOIN LATERAL (
        SELECT preco_unitario
        FROM contrato_produtos cp
        INNER JOIN contratos c ON c.id = cp.contrato_id
        WHERE cp.produto_id = rp.produto_id
          AND c.status = 'ativo'
          AND cp.ativo = true
          AND CURRENT_DATE BETWEEN c.data_inicio AND c.data_fim
        ORDER BY c.data_inicio DESC
        LIMIT 1
      ) cp ON true
      WHERE rp.refeicao_id = $1
      ORDER BY rp.ordem, rp.id
    `;

    const params = modalidade_id ? [id, modalidade_id] : [id];
    const result = await db.pool.query<IngredienteCusto>(query, params);

    const ingredientes = result.rows;

    if (ingredientes.length === 0) {
      return res.status(400).json({
        error: 'Nenhum ingrediente encontrado para esta refeição'
      });
    }

    // Helper para arredondar valores
    const round2 = (n: number) => Math.round(n * 100) / 100;

    let custoTotal = 0;
    const ingredientesSemPreco = new Set<string>();
    const ingredientesComErro = new Set<string>();
    const detalhamento: DetalhamentoCusto[] = [];

    for (const ing of ingredientes) {
      if (ing.preco_unitario === null) {
        ingredientesSemPreco.add(ing.produto_nome);
        
        const quantidadeGramasLiquido = getQuantidadeLiquida(ing);
        
        detalhamento.push({
          produto: ing.produto_nome,
          quantidade_liquida: quantidadeGramasLiquido,
          quantidade_bruta: quantidadeGramasLiquido * toNum(ing.fator_correcao, 1.0),
          unidade: ing.tipo_medida,
          fator_correcao: toNum(ing.fator_correcao, 1.0),
          preco_unitario: null,
          custo: null,
          aviso: 'Sem contrato ativo'
        });
        continue;
      }

      // Converter per_capita para gramas se for unidades
      // IMPORTANTE: usar peso_unitario (peso de 1 unidade), não peso_embalagem
      // Exemplo: 1 ovo = 50g (peso_unitario), mas caixa pode ter 30 ovos = 1500g (peso_embalagem)
      const quantidadeGramasLiquido = getQuantidadeLiquida(ing);
      
      // Per capita cadastrado é LÍQUIDO (consumo final - já preparado/cozido)
      // Para calcular custo, precisamos do BRUTO (compra - antes de limpar/descascar)
      // Aplicar Fator de Correção (perda no pré-preparo: cascas, aparas, etc)
      const fatorCorrecao = toNum(ing.fator_correcao, 1.0);
      const perCapitaBruto = quantidadeGramasLiquido * fatorCorrecao;
      
      // Calcular custo baseado no per capita BRUTO
      // preco_unitario é por EMBALAGEM (ex: garrafa de 900ml, pacote de 1kg)
      const pesoEmbalagem = toNum(ing.peso_embalagem, 1000);
      
      // Validar peso da embalagem para evitar divisão por zero
      if (pesoEmbalagem <= 0) {
        ingredientesComErro.add(ing.produto_nome);
        detalhamento.push({
          produto: ing.produto_nome,
          quantidade_liquida: quantidadeGramasLiquido,
          quantidade_bruta: perCapitaBruto,
          unidade: ing.tipo_medida,
          fator_correcao: fatorCorrecao,
          preco_unitario: ing.preco_unitario,
          custo: null,
          aviso: 'Peso da embalagem inválido'
        });
        continue;
      }
      
      // Sempre calcular pela proporção da embalagem
      // Exemplo: 50g de ovo em embalagem de 50g = 1 embalagem
      // Exemplo: 1ml de óleo em garrafa de 900ml = 1/900 embalagens
      const proporcaoEmbalagem = perCapitaBruto / pesoEmbalagem;
      const custo = proporcaoEmbalagem * ing.preco_unitario;

      custoTotal += custo;

      detalhamento.push({
        produto: ing.produto_nome,
        quantidade_liquida: quantidadeGramasLiquido,
        quantidade_bruta: perCapitaBruto,
        unidade: ing.tipo_medida,
        fator_correcao: fatorCorrecao,
        peso_embalagem: pesoEmbalagem,
        unidade_distribuicao: ing.unidade_distribuicao,
        preco_unitario: ing.preco_unitario,
        custo: round2(custo)
      });
    }

    // Garantir que porções seja sempre >= 1
    const custoPorPorcao = custoTotal / porcoes;

    // Alertas de custo
    const alertas = [];
    
    if (custoPorPorcao > 5) {
      alertas.push({ tipo: 'warning', mensagem: 'Custo por porção elevado (acima de R$ 5,00)' });
    }

    if (ingredientesSemPreco.size > 0) {
      alertas.push({ 
        tipo: 'error', 
        mensagem: `${ingredientesSemPreco.size} ingrediente(s) sem contrato ativo` 
      });
    }

    if (ingredientesComErro.size > 0) {
      alertas.push({ 
        tipo: 'error', 
        mensagem: `${ingredientesComErro.size} ingrediente(s) com peso de embalagem inválido` 
      });
    }

    return res.json({
      custo_total: round2(custoTotal),
      custo_por_porcao: round2(custoPorPorcao),
      rendimento_porcoes: porcoes,
      detalhamento,
      ingredientes_sem_preco: Array.from(ingredientesSemPreco),
      ingredientes_com_erro: Array.from(ingredientesComErro),
      alertas,
      aviso: ingredientesSemPreco.size > 0 || ingredientesComErro.size > 0
        ? `${ingredientesSemPreco.size} sem contrato, ${ingredientesComErro.size} com erro de cadastro`
        : null
    });

  } catch (error) {
    console.error('Erro ao calcular custo:', error);
    return res.status(500).json({ error: 'Erro ao calcular custo' });
  }
};

// Aplicar cálculos automáticos na refeição
export const aplicarCalculosAutomaticos = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rendimento_porcoes } = req.body;

  try {
    // Calcular valores nutricionais
    const nutricionalReq = { params: { id }, body: { rendimento_porcoes } } as unknown as Request;
    const nutricionalRes = {
      json: (data: any) => data,
      status: (code: number) => ({ json: (data: any) => ({ status: code, ...data }) })
    } as any;
    
    const valoresNutricionais: any = await calcularValoresNutricionais(nutricionalReq, nutricionalRes);

    // Calcular custo
    const custoReq = { params: { id }, body: { rendimento_porcoes } } as unknown as Request;
    const custoRes = {
      json: (data: any) => data,
      status: (code: number) => ({ json: (data: any) => ({ status: code, ...data }) })
    } as any;
    
    const custo: any = await calcularCusto(custoReq, custoRes);

    // Atualizar refeição com valores calculados
    await db.pool.query(`
      UPDATE refeicoes
      SET 
        calorias_por_porcao = $1,
        proteinas_g = $2,
        carboidratos_g = $3,
        lipidios_g = $4,
        fibras_g = $5,
        sodio_mg = $6,
        custo_por_porcao = $7,
        rendimento_porcoes = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
    `, [
      valoresNutricionais.por_porcao.calorias,
      valoresNutricionais.por_porcao.proteinas,
      valoresNutricionais.por_porcao.carboidratos,
      valoresNutricionais.por_porcao.lipidios,
      valoresNutricionais.por_porcao.fibras,
      valoresNutricionais.por_porcao.sodio,
      custo.custo_por_porcao,
      rendimento_porcoes,
      id
    ]);

    return res.json({
      message: 'Cálculos aplicados com sucesso',
      valores_nutricionais: valoresNutricionais,
      custo: custo,
      alertas: [...valoresNutricionais.alertas, ...custo.alertas]
    });

  } catch (error) {
    console.error('Erro ao aplicar cálculos automáticos:', error);
    return res.status(500).json({ error: 'Erro ao aplicar cálculos automáticos' });
  }
};
