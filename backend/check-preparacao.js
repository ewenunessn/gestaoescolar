const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkPreparacao() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Find the preparation
    const result = await client.query(`
      SELECT id, nome, rendimento_porcoes, categoria, tempo_preparo_minutos
      FROM refeicoes
      WHERE nome ILIKE '%ovo%arroz%feijão%'
      OR nome ILIKE '%ovo frito%'
      ORDER BY nome;
    `);

    console.log('\n📋 Preparações encontradas:');
    result.rows.forEach(row => {
      console.log(`\nID: ${row.id}`);
      console.log(`Nome: ${row.nome}`);
      console.log(`Rendimento: ${row.rendimento_porcoes || 'NÃO DEFINIDO'} porções`);
      console.log(`Categoria: ${row.categoria || 'N/A'}`);
      console.log(`Tempo: ${row.tempo_preparo_minutos || 'N/A'} min`);
    });

    // Check ingredients for the first one
    if (result.rows.length > 0) {
      const refeicaoId = result.rows[0].id;
      const ingredientes = await client.query(`
        SELECT 
          p.nome as produto_nome,
          rp.per_capita,
          rp.tipo_medida,
          p.peso as peso_unitario,
          p.fator_correcao
        FROM refeicao_produtos rp
        JOIN produtos p ON p.id = rp.produto_id
        WHERE rp.refeicao_id = $1
        ORDER BY p.nome;
      `, [refeicaoId]);

      console.log(`\n🥘 Ingredientes da preparação "${result.rows[0].nome}":`);
      ingredientes.rows.forEach(ing => {
        console.log(`  - ${ing.produto_nome}: ${ing.per_capita} ${ing.tipo_medida} (peso unit: ${ing.peso_unitario}g, FC: ${ing.fator_correcao})`);
      });

      // Check if products have nutritional composition
      const composicao = await client.query(`
        SELECT 
          p.nome,
          pcn.calorias_100g,
          pcn.proteinas_100g,
          pcn.lipidios_100g,
          pcn.carboidratos_100g
        FROM refeicao_produtos rp
        JOIN produtos p ON p.id = rp.produto_id
        LEFT JOIN produto_composicao_nutricional pcn ON pcn.produto_id = p.id
        WHERE rp.refeicao_id = $1;
      `, [refeicaoId]);

      console.log(`\n🔬 Composição nutricional dos produtos:`);
      composicao.rows.forEach(comp => {
        if (comp.calorias_100g) {
          console.log(`  ✅ ${comp.nome}: ${comp.calorias_100g} kcal, ${comp.proteinas_100g}g prot, ${comp.lipidios_100g}g lip, ${comp.carboidratos_100g}g carb`);
        } else {
          console.log(`  ❌ ${comp.nome}: SEM DADOS NUTRICIONAIS`);
        }
      });
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkPreparacao();
