const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function addEggNutrition() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Find the egg product
    const eggResult = await client.query(`
      SELECT id, nome FROM produtos 
      WHERE nome ILIKE '%ovo%galinha%caipira%'
      LIMIT 1;
    `);

    if (eggResult.rows.length === 0) {
      console.log('❌ Produto "Ovos de galinha caipira" não encontrado');
      client.release();
      await pool.end();
      return;
    }

    const produtoId = eggResult.rows[0].id;
    const produtoNome = eggResult.rows[0].nome;

    console.log(`\n📦 Produto encontrado: ${produtoNome} (ID: ${produtoId})`);

    // Nutritional data from user (per 100g):
    // Energia: 143 kcal
    // Proteínas: 13g
    // Lipídios: 8.9g
    // Carboidratos: 1.6g
    // Cálcio: 42mg
    // Ferro: 1.6mg
    // Retinol (Vit. A): 79mcg
    // Sódio: 168mg
    // Colesterol: 356mg

    // Check if composition already exists
    const existingComp = await client.query(`
      SELECT id FROM produto_composicao_nutricional
      WHERE produto_id = $1;
    `, [produtoId]);

    if (existingComp.rows.length > 0) {
      // Update existing
      await client.query(`
        UPDATE produto_composicao_nutricional
        SET 
          energia_kcal = 143,
          proteina_g = 13.0,
          lipideos_g = 8.9,
          carboidratos_g = 1.6,
          fibra_alimentar_g = 0,
          calcio_mg = 42.0,
          ferro_mg = 1.6,
          vitamina_a_mcg = 79.0,
          vitamina_c_mg = 0,
          sodio_mg = 168.0,
          colesterol_mg = 356.0
        WHERE produto_id = $1;
      `, [produtoId]);
      console.log('✅ Composição nutricional ATUALIZADA');
    } else {
      // Insert new
      await client.query(`
        INSERT INTO produto_composicao_nutricional (
          produto_id,
          energia_kcal,
          proteina_g,
          lipideos_g,
          carboidratos_g,
          fibra_alimentar_g,
          calcio_mg,
          ferro_mg,
          vitamina_a_mcg,
          vitamina_c_mg,
          sodio_mg,
          colesterol_mg
        ) VALUES ($1, 143, 13.0, 8.9, 1.6, 0, 42.0, 1.6, 79.0, 0, 168.0, 356.0);
      `, [produtoId]);
      console.log('✅ Composição nutricional INSERIDA');
    }

    // Verify
    const verify = await client.query(`
      SELECT * FROM produto_composicao_nutricional
      WHERE produto_id = $1;
    `, [produtoId]);

    console.log('\n📊 Composição nutricional cadastrada (por 100g):');
    const comp = verify.rows[0];
    console.log(`  Energia: ${comp.energia_kcal} kcal`);
    console.log(`  Proteínas: ${comp.proteina_g}g`);
    console.log(`  Lipídeos: ${comp.lipideos_g}g`);
    console.log(`  Carboidratos: ${comp.carboidratos_g}g`);
    console.log(`  Cálcio: ${comp.calcio_mg}mg`);
    console.log(`  Ferro: ${comp.ferro_mg}mg`);
    console.log(`  Vitamina A: ${comp.vitamina_a_mcg}mcg`);
    console.log(`  Sódio: ${comp.sodio_mg}mg`);
    console.log(`  Colesterol: ${comp.colesterol_mg}mg`);

    client.release();
    await pool.end();
    console.log('\n✅ Concluído!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addEggNutrition();
