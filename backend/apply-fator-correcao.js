const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Aplicando migration: fator de correção...');
    
    const migrationPath = path.join(__dirname, 'migrations', '20260313_add_fator_correcao_produtos.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration aplicada com sucesso!');
    
    // Verificar alguns produtos
    const result = await client.query(`
      SELECT nome, fator_correcao 
      FROM produtos 
      WHERE fator_correcao > 1.0 
      LIMIT 10
    `);
    
    console.log('\n📊 Produtos com fator de correção:');
    result.rows.forEach(row => {
      console.log(`  - ${row.nome}: ${row.fator_correcao}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
