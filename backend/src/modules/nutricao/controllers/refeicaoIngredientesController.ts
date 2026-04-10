import { Request, Response } from 'express';
import db from '../../../database';
import { toNum } from '../../../utils/typeHelpers';

interface IngredienteDetalhado {
  produto_id: number;
  produto_nome: string;
  per_capita: number;
  per_capita_liquido: number;
  per_capita_bruto: number;
  tipo_medida: string;
  fator_correcao: number;
  // Valores por 100g do produto
  proteinas_100g: number | null;
  lipidios_100g: number | null;
  carboidratos_100g: number | null;
  calcio_100g: number | null;
  ferro_100g: number | null;
  vitamina_a_100g: number | null;
  vitamina_c_100g: number | null;
  sodio_100g: number | null;
  // Valores calculados para o per capita
  proteinas_porcao: number;
  lipidios_porcao: number;
  carboidratos_porcao: number;
  calcio_porcao: number;
  ferro_porcao: number;
  vitamina_a_porcao: number;
  vitamina_c_porcao: number;
  sodio_porcao: number;
}

// Buscar ingredientes com composição nutricional detalhada
export const buscarIngredientesDetalhados = async (req: Request, res: Response) => {
  const { id } = req.params; // refeicao_id
  const { modalidade_id } = req.query; // modalidade opcional

  try {
    console.log('🔍 Buscando ingredientes detalhados para refeição:', id, 'modalidade:', modalidade_id);
    
    // Query que busca per capita ajustado por modalidade se modalidade_id for fornecido
    const query = modalidade_id ? `
      SELECT 
        rp.produto_id,
        p.nome as produto_nome,
        COALESCE(rpm.per_capita_ajustado, rp.per_capita) as per_capita,
        rp.tipo_medida,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        p.peso as peso_unitario,
        pcn.proteina_g as proteinas_100g,
        pcn.lipideos_g as lipidios_100g,
        pcn.carboidratos_g as carboidratos_100g,
        pcn.calcio_mg as calcio_100g,
        pcn.ferro_mg as ferro_100g,
        pcn.vitamina_a_mcg as vitamina_a_100g,
        pcn.vitamina_c_mg as vitamina_c_100g,
        pcn.sodio_mg as sodio_100g
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
        pcn.proteina_g as proteinas_100g,
        pcn.lipideos_g as lipidios_100g,
        pcn.carboidratos_g as carboidratos_100g,
        pcn.calcio_mg as calcio_100g,
        pcn.ferro_mg as ferro_100g,
        pcn.vitamina_a_mcg as vitamina_a_100g,
        pcn.vitamina_c_mg as vitamina_c_100g,
        pcn.sodio_mg as sodio_100g
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN produto_composicao_nutricional pcn ON pcn.produto_id = p.id
      WHERE rp.refeicao_id = $1
      ORDER BY rp.ordem, rp.id
    `;

    const params = modalidade_id ? [id, modalidade_id] : [id];
    const result = await db.pool.query(query, params);

    // Helper para arredondar valores nutricionais
    const round2 = (n: number) => Math.round(n * 100) / 100;
    
    // Helper para calcular valores nutricionais por porção
    const calcNutricional = (valor: number | null, proporcao: number) => 
      valor ? round2(valor * proporcao) : 0;

    const ingredientes: IngredienteDetalhado[] = result.rows.map(ing => {
      // Per capita cadastrado depende do tipo_medida:
      // - Se 'gramas' ou 'mililitros': per_capita já está em gramas/ml
      // - Se 'unidades': per_capita é a QUANTIDADE de unidades, precisa multiplicar pelo peso
      let quantidadeGramasLiquido = ing.per_capita;
      
      if (ing.tipo_medida === 'unidades') {
        // Usar peso unitário do produto cadastrado, ou 100g como fallback
        const pesoUnitario = ing.peso_unitario || 100;
        quantidadeGramasLiquido = ing.per_capita * pesoUnitario;
      }

      // Calcular proporção usando quantidade LÍQUIDA (quantidade / 100g)
      // Evitar divisão por zero
      const proporcao = quantidadeGramasLiquido ? quantidadeGramasLiquido / 100 : 0;

      // Calcular per capita BRUTO (compra) = líquido em gramas * fator de correção
      const fatorCorrecao = toNum(ing.fator_correcao, 1.0);
      const perCapitaBruto = quantidadeGramasLiquido * fatorCorrecao;

      return {
        produto_id: ing.produto_id,
        produto_nome: ing.produto_nome,
        per_capita: quantidadeGramasLiquido, // LÍQUIDO em gramas (já convertido se for unidades)
        per_capita_liquido: quantidadeGramasLiquido, // Explícito
        per_capita_bruto: perCapitaBruto, // BRUTO (compra) em gramas
        tipo_medida: ing.tipo_medida,
        fator_correcao: fatorCorrecao,
        proteinas_100g: ing.proteinas_100g,
        lipidios_100g: ing.lipidios_100g,
        carboidratos_100g: ing.carboidratos_100g,
        calcio_100g: ing.calcio_100g,
        ferro_100g: ing.ferro_100g,
        vitamina_a_100g: ing.vitamina_a_100g,
        vitamina_c_100g: ing.vitamina_c_100g,
        sodio_100g: ing.sodio_100g,
        // Valores calculados para o per capita LÍQUIDO usando helper
        proteinas_porcao: calcNutricional(ing.proteinas_100g, proporcao),
        lipidios_porcao: calcNutricional(ing.lipidios_100g, proporcao),
        carboidratos_porcao: calcNutricional(ing.carboidratos_100g, proporcao),
        calcio_porcao: calcNutricional(ing.calcio_100g, proporcao),
        ferro_porcao: calcNutricional(ing.ferro_100g, proporcao),
        vitamina_a_porcao: calcNutricional(ing.vitamina_a_100g, proporcao),
        vitamina_c_porcao: calcNutricional(ing.vitamina_c_100g, proporcao),
        sodio_porcao: calcNutricional(ing.sodio_100g, proporcao)
      };
    });

    return res.json({
      ingredientes
    });

  } catch (error) {
    console.error('Erro ao buscar ingredientes detalhados:', error);
    return res.status(500).json({ error: 'Erro ao buscar ingredientes detalhados' });
  }
};
