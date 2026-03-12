// Script para aplicar alterações PNAE no Neon
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Usar POSTGRES_URL para Neon
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyToNeon() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Aplicando alterações PNAE no Neon...\n');
    
    await client.query('BEGIN');
    
    // 1. Atualizar constraint de tipo_fornecedor
    console.log('1. Atualizando constraint tipo_fornecedor...');
    await client.query(`
      ALTER TABLE fornecedores 
      DROP CONSTRAINT IF EXISTS fornecedores_tipo_fornecedor_check
    `);
    
    await client.query(`
      ALTER TABLE fornecedores 
      ADD CONSTRAINT fornecedores_tipo_fornecedor_check 
      CHECK (tipo_fornecedor IN (
        'empresa', 'cooperativa', 'individual',
        'CONVENCIONAL', 'AGRICULTURA_FAMILIAR', 'COOPERATIVA_AF', 'ASSOCIACAO_AF'
      ))
    `);
    
    // 2. Ler e executar migration PNAE
    console.log('2. Aplicando migration PNAE...');
    const migrationPath = path.join(__dirname, 'migrations', '20260312_add_pnae_compliance.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Alterações aplicadas com sucesso no Neon!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyToNeon();
