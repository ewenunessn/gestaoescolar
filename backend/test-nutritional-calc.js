const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testNutritionalCalc() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Find the preparation
    const refeicaoResult = await client.query(`
      SELECT id, nome, rendimento_porcoes FROM refeicoes 
      WHERE nome ILIKE '%ovo%arroz%feijão%'
      LIMIT 1;
    `);

    if (refeicaoResult.rows.length === 0) {
      console.log('❌ Preparação não encontrada');
      client.release();
      await pool.end();
      return;
    }

    const refeicao = refeicaoResult.rows[0];
    console.log(`\n🍽️  Preparação: ${refeicao.nome} (ID: ${refeicao.id})`);
    console.log(`   Rendimento: ${refeicao.rendimento_porcoes} porções\n`);

    // Simulate the backend calculation query
    const query = `
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

    const result = await client.query(query, [refeicao.id]);

    console.log('📋 Ingredientes e composição nutricional:\n');
    
    let totalCalorias = 0;
    let totalProteinas = 0;
    let totalLipidios = 0;
    let totalCarboidratos = 0;
    let ingredientesSemInfo = [];

    result.rows.forEach(ing => {
      console.log(`${ing.produto_nome}:`);
      console.log(`  Per capita: ${ing.per_capita} ${ing.tipo_medida}`);
      console.log(`  Peso unitário: ${ing.peso_unitario}g`);
      console.log(`  Fator correção: ${ing.fator_correcao}`);
      
      // Calculate quantidade em gramas
      let quantidadeGramas;
      if (ing.tipo_medida === 'unidades') {
        quantidadeGramas = ing.per_capita * (ing.peso_unitario || 100);
      } else {
        quantidadeGramas = ing.per_capita;
      }
      
      console.log(`  Quantidade líquida: ${quantidadeGramas}g`);
      
      if (ing.calorias_100g) {
        const proporcao = quantidadeGramas / 100;
        const calorias = ing.calorias_100g * proporcao;
        const proteinas = ing.proteinas_100g * proporcao;
        const lipidios = ing.lipidios_100g * proporcao;
        const carboidratos = ing.carboidratos_100g * proporcao;
        
        console.log(`  Composição (100g): ${ing.calorias_100g} kcal, ${ing.proteinas_100g}g prot, ${ing.lipidios_100g}g lip, ${ing.carboidratos_100g}g carb`);
        console.log(`  Contribuição: ${calorias.toFixed(1)} kcal, ${proteinas.toFixed(1)}g prot, ${lipidios.toFixed(1)}g lip, ${carboidratos.toFixed(1)}g carb`);
        
        totalCalorias += calorias;
        totalProteinas += proteinas;
        totalLipidios += lipidios;
        totalCarboidratos += carboidratos;
      } else {
        console.log(`  ❌ SEM DADOS NUTRICIONAIS`);
        ingredientesSemInfo.push(ing.produto_nome);
      }
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════');
    console.log(`\n📊 TOTAIS (${refeicao.rendimento_porcoes} porção):`);
    console.log(`  Energia: ${totalCalorias.toFixed(1)} kcal`);
    console.log(`  Proteínas: ${totalProteinas.toFixed(1)}g`);
    console.log(`  Lipídios: ${totalLipidios.toFixed(1)}g`);
    console.log(`  Carboidratos: ${totalCarboidratos.toFixed(1)}g`);

    if (ingredientesSemInfo.length > 0) {
      console.log(`\n⚠️  Ingredientes sem informação nutricional: ${ingredientesSemInfo.join(', ')}`);
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

testNutritionalCalc();
