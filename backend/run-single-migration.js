const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Conectando ao banco de dados...');
    const client = await pool.connect();
    console.log('✅ Conectado!');

    const migrationPath = path.join(__dirname, 'migrations', 'fix_produto_composicao_nutricional_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Executando migration...');
    await client.query(sql);
    console.log('✅ Migration executada com sucesso!');

    // Verificar se as colunas foram adicionadas
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'produto_composicao_nutricional'
      AND column_name IN ('energia_kcal', 'proteina_g', 'carboidratos_g', 'lipideos_g', 'fibra_alimentar_g', 'sodio_mg', 'calcio_mg', 'ferro_mg', 'vitamina_a_mcg', 'vitamina_c_mg')
      ORDER BY column_name;
    `);

    console.log('\n📋 Colunas adicionadas:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    client.release();
    await pool.end();
    console.log('\n✅ Concluído!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
