import { Request, Response } from 'express';
import db from '../database';
import { toNum } from '../utils/typeHelpers';

interface IngredienteNutricional {
  produto_id: number;
  produto_nome: string;
  per_capita: number;
  tipo_medida: string;
  fator_correcao: number;
  indice_coccao: number;
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
  indice_coccao: number;
  preco_unitario: number | null;
}

// Calcular valores nutricionais da refeição baseado nos ingredientes
export const calcularValoresNutricionais = async (req: Request, res: Response) => {
  const { id } = req.params; // refeicao_id
  const { rendimento_porcoes, modalidade_id } = req.body; // número de porções e modalidade opcional

  try {
    // Query que busca per capita ajustado por modalidade se modalidade_id for fornecido
    const query = modalidade_id ? `
      SELECT 
        rp.produto_id,
        p.nome as produto_nome,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        rp.tipo_medida,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        COALESCE(p.indice_coccao, 1.0) as indice_coccao,
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
        COALESCE(p.indice_coccao, 1.0) as indice_coccao,
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

    // Calcular totais (soma de todos os ingredientes)
    let totalCalorias = 0;
    let totalProteinas = 0;
    let totalCarboidratos = 0;
    let totalLipidios = 0;
    let totalFibras = 0;
    let totalSodio = 0;
    let totalCalcio = 0;
    let totalFerro = 0;
    let totalVitaminaA = 0;
    let totalVitaminaC = 0;
    let ingredientesSemInfo: string[] = [];

    ingredientes.forEach(ing => {
      // Per capita cadastrado é LÍQUIDO (consumo)
      let quantidadeGramasLiquido = ing.per_capita;
      if (ing.tipo_medida === 'unidades') {
        // Assumir 100g por unidade (pode ser ajustado)
        quantidadeGramasLiquido = ing.per_capita * 100;
      }

      // Calcular proporção usando quantidade LÍQUIDA (quantidade / 100g)
      const proporcao = quantidadeGramasLiquido / 100;

      // Somar valores nutricionais
      if (ing.calorias_100g !== null) {
        totalCalorias += ing.calorias_100g * proporcao;
      } else {
        ingredientesSemInfo.push(ing.produto_nome);
      }

      if (ing.proteinas_100g !== null) {
        totalProteinas += ing.proteinas_100g * proporcao;
      }

      if (ing.carboidratos_100g !== null) {
        totalCarboidratos += ing.carboidratos_100g * proporcao;
      }

      if (ing.lipidios_100g !== null) {
        totalLipidios += ing.lipidios_100g * proporcao;
      }

      if (ing.fibras_100g !== null) {
        totalFibras += ing.fibras_100g * proporcao;
      }

      if (ing.sodio_100g !== null) {
        totalSodio += ing.sodio_100g * proporcao;
      }

      if (ing.calcio_100g !== null) {
        totalCalcio += ing.calcio_100g * proporcao;
      }

      if (ing.ferro_100g !== null) {
        totalFerro += ing.ferro_100g * proporcao;
      }

      if (ing.vitamina_a_100g !== null) {
        totalVitaminaA += ing.vitamina_a_100g * proporcao;
      }

      if (ing.vitamina_c_100g !== null) {
        totalVitaminaC += ing.vitamina_c_100g * proporcao;
      }
    });

    // Calcular por porção (se rendimento foi informado)
    const porcoes = rendimento_porcoes || 1;
    const caloriasPorPorcao = totalCalorias / porcoes;
    const proteinasPorPorcao = totalProteinas / porcoes;
    const carboidratosPorPorcao = totalCarboidratos / porcoes;
    const lipidiosPorPorcao = totalLipidios / porcoes;
    const fibrasPorPorcao = totalFibras / porcoes;
    const sodioPorPorcao = totalSodio / porcoes;
    const calcioPorPorcao = totalCalcio / porcoes;
    const ferroPorPorcao = totalFerro / porcoes;
    const vitaminaAPorPorcao = totalVitaminaA / porcoes;
    const vitaminaCPorPorcao = totalVitaminaC / porcoes;

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

    return res.json({
      total: {
        calorias: Math.round(totalCalorias * 100) / 100,
        proteinas: Math.round(totalProteinas * 100) / 100,
        carboidratos: Math.round(totalCarboidratos * 100) / 100,
        lipidios: Math.round(totalLipidios * 100) / 100,
        fibras: Math.round(totalFibras * 100) / 100,
        sodio: Math.round(totalSodio * 100) / 100,
        calcio: Math.round(totalCalcio * 100) / 100,
        ferro: Math.round(totalFerro * 100) / 100,
        vitamina_a: Math.round(totalVitaminaA * 100) / 100,
        vitamina_c: Math.round(totalVitaminaC * 100) / 100
      },
      por_porcao: {
        calorias: Math.round(caloriasPorPorcao * 100) / 100,
        proteinas: Math.round(proteinasPorPorcao * 100) / 100,
        carboidratos: Math.round(carboidratosPorPorcao * 100) / 100,
        lipidios: Math.round(lipidiosPorPorcao * 100) / 100,
        fibras: Math.round(fibrasPorPorcao * 100) / 100,
        sodio: Math.round(sodioPorPorcao * 100) / 100,
        calcio: Math.round(calcioPorPorcao * 100) / 100,
        ferro: Math.round(ferroPorPorcao * 100) / 100,
        vitamina_a: Math.round(vitaminaAPorPorcao * 100) / 100,
        vitamina_c: Math.round(vitaminaCPorPorcao * 100) / 100
      },
      rendimento_porcoes: porcoes,
      alertas,
      ingredientes_sem_info: ingredientesSemInfo,
      aviso: ingredientesSemInfo.length > 0 
        ? `${ingredientesSemInfo.length} ingrediente(s) sem informação nutricional cadastrada`
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
    // Query que busca per capita ajustado por modalidade se modalidade_id for fornecido
    const query = modalidade_id ? `
      SELECT 
        rp.produto_id,
        p.nome as produto_nome,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        rp.tipo_medida,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        COALESCE(p.indice_coccao, 1.0) as indice_coccao,
        cp.preco_unitario
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
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
        COALESCE(p.indice_coccao, 1.0) as indice_coccao,
        cp.preco_unitario
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
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

    let custoTotal = 0;
    let ingredientesSemPreco: string[] = [];
    const detalhamento: any[] = [];

    ingredientes.forEach(ing => {
      if (ing.preco_unitario === null) {
        ingredientesSemPreco.push(ing.produto_nome);
        detalhamento.push({
          produto: ing.produto_nome,
          quantidade: ing.per_capita,
          unidade: ing.tipo_medida,
          preco_unitario: null,
          custo: null,
          aviso: 'Sem contrato ativo'
        });
        return;
      }

      // Per capita cadastrado é LÍQUIDO (consumo final - cozido)
      // Para calcular custo, precisamos do BRUTO (compra)
      // Lógica correta: IC primeiro (cozimento), depois FC (pré-preparo)
      
      const indiceCoccao = toNum(ing.indice_coccao, 1.0);
      const fatorCorrecao = toNum(ing.fator_correcao, 1.0);
      
      // 1. Calcular quanto precisa CRU (antes de cozinhar)
      const perCapitaCru = ing.per_capita / indiceCoccao;
      
      // 2. Calcular quanto precisa COMPRAR (antes de limpar/descascar)
      const perCapitaBruto = perCapitaCru * fatorCorrecao;

      // Calcular custo baseado no per capita BRUTO
      // preco_unitario é por kg, per capita é em gramas ou unidades
      let custo = 0;
      
      if (ing.tipo_medida === 'gramas') {
        // Converter gramas para kg
        const quantidadeKg = perCapitaBruto / 1000;
        custo = quantidadeKg * ing.preco_unitario;
      } else {
        // Unidades - assumir que preco_unitario é por unidade
        custo = perCapitaBruto * ing.preco_unitario;
      }

      custoTotal += custo;

      detalhamento.push({
        produto: ing.produto_nome,
        quantidade_liquida: ing.per_capita,
        quantidade_crua: perCapitaCru,
        quantidade_bruta: perCapitaBruto,
        unidade: ing.tipo_medida,
        indice_coccao: indiceCoccao,
        fator_correcao: fatorCorrecao,
        preco_unitario: ing.preco_unitario,
        custo: Math.round(custo * 100) / 100
      });
    });

    const porcoes = rendimento_porcoes || 1;
    const custoPorPorcao = custoTotal / porcoes;

    // Alertas de custo
    const alertas = [];
    
    if (custoPorPorcao > 5) {
      alertas.push({ tipo: 'warning', mensagem: 'Custo por porção elevado (acima de R$ 5,00)' });
    }

    if (ingredientesSemPreco.length > 0) {
      alertas.push({ 
        tipo: 'error', 
        mensagem: `${ingredientesSemPreco.length} ingrediente(s) sem contrato ativo` 
      });
    }

    return res.json({
      custo_total: Math.round(custoTotal * 100) / 100,
      custo_por_porcao: Math.round(custoPorPorcao * 100) / 100,
      rendimento_porcoes: porcoes,
      detalhamento,
      ingredientes_sem_preco: ingredientesSemPreco,
      alertas,
      aviso: ingredientesSemPreco.length > 0
        ? `${ingredientesSemPreco.length} ingrediente(s) sem contrato ativo cadastrado`
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
    const nutricionalReq = { params: { id }, body: { rendimento_porcoes } } as Request;
    const nutricionalRes = {
      json: (data: any) => data,
      status: (code: number) => ({ json: (data: any) => ({ status: code, ...data }) })
    } as any;
    
    const valoresNutricionais: any = await calcularValoresNutricionais(nutricionalReq, nutricionalRes);

    // Calcular custo
    const custoReq = { params: { id }, body: { rendimento_porcoes } } as Request;
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
