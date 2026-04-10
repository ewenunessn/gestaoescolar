require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkNutritionalData() {
  try {
    console.log('🔍 Verificando dados nutricionais...\n');

    // 1. Contar registros na tabela produto_composicao_nutricional
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM produto_composicao_nutricional
    `);
    console.log(`📊 Total de registros em produto_composicao_nutricional: ${countResult.rows[0].total}`);

    // 2. Ver alguns exemplos
    const sampleResult = await pool.query(`
      SELECT 
        pcn.id,
        pcn.produto_id,
        p.nome as produto_nome,
        pcn.energia_kcal,
        pcn.proteina_g,
        pcn.carboidratos_g
      FROM produto_composicao_nutricional pcn
      INNER JOIN produtos p ON p.id = pcn.produto_id
      LIMIT 5
    `);
    
    console.log('\n📋 Exemplos de dados:');
    console.table(sampleResult.rows);

    // 3. Verificar produtos SEM dados nutricionais
    const missingResult = await pool.query(`
      SELECT 
        p.id,
        p.nome
      FROM produtos p
      LEFT JOIN produto_composicao_nutricional pcn ON pcn.produto_id = p.id
      WHERE pcn.id IS NULL
      LIMIT 10
    `);

    console.log(`\n⚠️  Produtos SEM dados nutricionais: ${missingResult.rowCount}`);
    if (missingResult.rows.length > 0) {
      console.log('Primeiros 10:');
      console.table(missingResult.rows);
    }

    // 4. Verificar uma refeição específica (se tiver ID)
    const refeicaoId = process.argv[2];
    if (refeicaoId) {
      console.log(`\n🍽️  Verificando refeição ${refeicaoId}:`);
      const refeicaoResult = await pool.query(`
        SELECT 
          rp.produto_id,
          p.nome as produto_nome,
          rp.per_capita,
          pcn.energia_kcal as calorias_100g,
          pcn.proteina_g as proteinas_100g,
          pcn.carboidratos_g as carboidratos_100g
        FROM refeicao_produtos rp
        INNER JOIN produtos p ON p.id = rp.produto_id
        LEFT JOIN produto_composicao_nutricional pcn ON pcn.produto_id = p.id
        WHERE rp.refeicao_id = $1
      `, [refeicaoId]);

      console.table(refeicaoResult.rows);
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

checkNutritionalData();
