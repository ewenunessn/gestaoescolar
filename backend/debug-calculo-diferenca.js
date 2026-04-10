require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function debugCalculoDiferenca() {
  const refeicaoId = process.argv[2] || 1;
  
  try {
    console.log(`🔍 Analisando diferença de cálculo para refeição ${refeicaoId}\n`);

    // 1. Valor salvo na própria tabela refeicoes
    const refeicaoInfo = await pool.query(`
      SELECT 
        id,
        nome,
        calorias_por_porcao,
        rendimento_porcoes,
        (calorias_por_porcao * rendimento_porcoes) as calorias_total
      FROM refeicoes
      WHERE id = $1
    `, [refeicaoId]);

    console.log('📊 Dados da refeição:');
    console.table(refeicaoInfo.rows);

    // 2. Cálculo SEM fator_correcao (como na buscarRefeicao)
    const calculoSemFator = await pool.query(`
      SELECT 
        rp.produto_id,
        p.nome as produto_nome,
        rp.per_capita,
        pcn.energia_kcal as calorias_100g,
        (rp.per_capita / 100.0) * pcn.energia_kcal as calorias_ingrediente
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN produto_composicao_nutricional pcn ON rp.produto_id = pcn.produto_id
      WHERE rp.refeicao_id = $1
    `, [refeicaoId]);

    console.log('\n📋 Cálculo SEM fator_correcao:');
    console.table(calculoSemFator.rows);
    const totalSemFator = calculoSemFator.rows.reduce((sum, row) => sum + (parseFloat(row.calorias_ingrediente) || 0), 0);
    console.log(`Total: ${totalSemFator.toFixed(2)} kcal\n`);

    // 3. Cálculo COM fator_correcao (como no calcularValoresNutricionais)
    const calculoComFator = await pool.query(`
      SELECT 
        rp.produto_id,
        p.nome as produto_nome,
        rp.per_capita,
        rp.tipo_medida,
        COALESCE(p.fator_correcao, 1.0) as fator_correcao,
        p.peso as peso_unitario,
        pcn.energia_kcal as calorias_100g,
        CASE 
          WHEN rp.tipo_medida = 'unidades' THEN 
            ((rp.per_capita * COALESCE(p.peso, 0)) * COALESCE(p.fator_correcao, 1.0) / 100.0) * pcn.energia_kcal
          ELSE 
            ((rp.per_capita * COALESCE(p.fator_correcao, 1.0)) / 100.0) * pcn.energia_kcal
        END as calorias_ingrediente
      FROM refeicao_produtos rp
      INNER JOIN produtos p ON p.id = rp.produto_id
      LEFT JOIN produto_composicao_nutricional pcn ON rp.produto_id = pcn.produto_id
      WHERE rp.refeicao_id = $1
    `, [refeicaoId]);

    console.log('📋 Cálculo COM fator_correcao:');
    console.table(calculoComFator.rows);
    const totalComFator = calculoComFator.rows.reduce((sum, row) => sum + (parseFloat(row.calorias_ingrediente) || 0), 0);
    console.log(`Total: ${totalComFator.toFixed(2)} kcal\n`);

    // 4. Comparação
    console.log('🔍 COMPARAÇÃO:');
    console.log(`Salvo no banco (total): ${refeicaoInfo.rows[0]?.calorias_total || 0} kcal`);
    console.log(`Salvo no banco (por porção): ${refeicaoInfo.rows[0]?.calorias_por_porcao || 0} kcal`);
    console.log(`Sem fator_correcao: ${totalSemFator.toFixed(2)} kcal`);
    console.log(`Com fator_correcao: ${totalComFator.toFixed(2)} kcal`);
    console.log(`\nDiferença (salvo vs com fator): ${Math.abs((refeicaoInfo.rows[0]?.calorias_total || 0) - totalComFator).toFixed(2)} kcal`);

    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

debugCalculoDiferenca();
