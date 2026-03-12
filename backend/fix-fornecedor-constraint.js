// Script para atualizar constraint de tipo_fornecedor
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function fixConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Atualizando constraint tipo_fornecedor...\n');
    
    await client.query('BEGIN');
    
    // Remover constraint antiga
    console.log('1. Removendo constraint antiga...');
    await client.query(`
      ALTER TABLE fornecedores 
      DROP CONSTRAINT IF EXISTS fornecedores_tipo_fornecedor_check
    `);
    
    // Criar nova constraint com valores PNAE
    console.log('2. Criando nova constraint com valores PNAE...');
    await client.query(`
      ALTER TABLE fornecedores 
      ADD CONSTRAINT fornecedores_tipo_fornecedor_check 
      CHECK (tipo_fornecedor IN (
        'empresa', 
        'cooperativa', 
        'individual',
        'CONVENCIONAL',
        'AGRICULTURA_FAMILIAR',
        'COOPERATIVA_AF',
        'ASSOCIACAO_AF'
      ))
    `);
    
    // Atualizar valores antigos para novos padrões
    console.log('3. Atualizando valores existentes...');
    await client.query(`
      UPDATE fornecedores 
      SET tipo_fornecedor = CASE 
        WHEN tipo_fornecedor = 'empresa' THEN 'CONVENCIONAL'
        WHEN tipo_fornecedor = 'cooperativa' THEN 'CONVENCIONAL'
        WHEN tipo_fornecedor = 'individual' THEN 'CONVENCIONAL'
        ELSE tipo_fornecedor
      END
      WHERE tipo_fornecedor IN ('empresa', 'cooperativa', 'individual')
    `);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Constraint atualizada com sucesso!');
    console.log('\nValores permitidos agora:');
    console.log('  - CONVENCIONAL (padrão)');
    console.log('  - AGRICULTURA_FAMILIAR');
    console.log('  - COOPERATIVA_AF');
    console.log('  - ASSOCIACAO_AF');
    console.log('  - empresa, cooperativa, individual (compatibilidade)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixConstraint();
