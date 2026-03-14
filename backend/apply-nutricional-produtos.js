require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Aplicando migration: add_nutricional_produtos...');
    
    const migrationPath = path.join(__dirname, 'migrations', '20260313_add_nutricional_produtos.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration aplicada com sucesso!');
    console.log('\n📊 Campos adicionados na tabela produtos:');
    console.log('   - calorias_100g');
    console.log('   - proteinas_100g');
    console.log('   - carboidratos_100g');
    console.log('   - lipidios_100g');
    console.log('   - fibras_100g');
    console.log('   - sodio_100g');
    console.log('   - eh_fruta_hortalica');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
