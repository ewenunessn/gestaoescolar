/**
 * Executar migration: Simplificar contrato_produtos
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function executarMigration() {
  console.log('\n🔧 MIGRATION: Simplificar contrato_produtos\n');
  console.log('═'.repeat(70));

  try {
    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '../migrations/20260324_simplificar_contrato_produtos.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('\n📋 Executando migration...\n');

    // Executar
    const result = await pool.query(sql);
    
    console.log('✅ Migration executada com sucesso!');
    console.log('\n📊 Resultado:');
    if (result.length > 0 && result[result.length - 1].rows) {
      console.log(result[result.length - 1].rows[0]);
    }

    // Verificar estrutura final
    const colunas = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contrato_produtos'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Colunas restantes em contrato_produtos:');
    colunas.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    console.log('\n✅ Campos removidos:');
    console.log('   ❌ peso_embalagem');
    console.log('   ❌ unidade_compra');
    console.log('   ❌ fator_conversao');

    console.log('\n✅ Agora o peso vem APENAS do produto!');
    console.log('   Sem conversões complexas');
    console.log('   Sem erros humanos');
    console.log('   Sistema mais simples');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

executarMigration();
