/**
 * Script para aplicar a migration de remoção do campo codigo_acesso
 * 
 * Este script:
 * 1. Remove a coluna codigo_acesso da tabela escolas
 * 2. Adiciona comentário ao campo codigo explicando seu uso
 * 
 * Uso:
 *   node backend/migrations/aplicar-remocao-codigo-acesso.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function aplicarMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando remoção do campo codigo_acesso...\n');
    
    // Ler o arquivo SQL da migration
    const migrationPath = path.join(__dirname, '20260320_remove_codigo_acesso_escolas.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Verificar se a coluna existe antes de tentar remover
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'escolas' 
      AND column_name = 'codigo_acesso'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('✅ A coluna codigo_acesso já foi removida anteriormente.');
      return;
    }
    
    console.log('📋 Coluna codigo_acesso encontrada. Removendo...');
    
    // Executar a migration
    await client.query(migrationSQL);
    
    console.log('✅ Migration aplicada com sucesso!');
    console.log('\n📊 Verificando estrutura da tabela escolas...\n');
    
    // Verificar a estrutura final
    const columns = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'escolas'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas da tabela escolas:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Verificar comentário no campo codigo
    const comment = await client.query(`
      SELECT 
        col_description('escolas'::regclass, ordinal_position) as comment
      FROM information_schema.columns
      WHERE table_name = 'escolas' AND column_name = 'codigo'
    `);
    
    if (comment.rows[0]?.comment) {
      console.log(`\n💬 Comentário no campo 'codigo': ${comment.rows[0].comment}`);
    }
    
    console.log('\n✅ Remoção do campo codigo_acesso concluída com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Reiniciar o backend para aplicar as mudanças no código');
    console.log('   2. Testar o cadastro de novas escolas');
    console.log('   3. Verificar se o login das escolas ainda funciona usando o campo codigo');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
aplicarMigration()
  .then(() => {
    console.log('\n✅ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
