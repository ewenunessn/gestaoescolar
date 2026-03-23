/**
 * Script para adicionar campos de unidades em pedido_itens
 * Executa a migration: 20260323_add_unidades_pedido_itens.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function executeMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migration: Adicionar campos de unidades em pedido_itens');
    
    await client.query('BEGIN');
    
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '../migrations/20260323_add_unidades_pedido_itens.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executando SQL...');
    await client.query(sql);
    
    // Verificar se os campos foram criados
    const checkResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pedido_itens' 
        AND column_name IN ('quantidade_kg', 'unidade', 'quantidade_distribuicao', 'unidade_distribuicao')
      ORDER BY column_name
    `);
    
    console.log('\n✅ Campos criados:');
    checkResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    // Contar registros atualizados
    const countResult = await client.query(`
      SELECT COUNT(*) as total FROM pedido_itens WHERE quantidade_kg IS NOT NULL
    `);
    
    console.log(`\n📊 Registros atualizados: ${countResult.rows[0].total}`);
    
    await client.query('COMMIT');
    console.log('\n✅ Migration executada com sucesso!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
executeMigration()
  .then(() => {
    console.log('\n🎉 Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha na migration:', error.message);
    process.exit(1);
  });
