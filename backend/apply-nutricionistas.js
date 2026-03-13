require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

async function applyMigration() {
  try {
    console.log('🔄 Criando tabela de nutricionistas...\n');
    
    const sql = fs.readFileSync('./migrations/20260312_create_nutricionistas.sql', 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Tabela criada com sucesso!\n');
    
    // Verificar resultado
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'nutricionistas'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas da tabela nutricionistas:');
    result.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(30)} ${col.data_type}`);
    });
    
    // Verificar nutricionistas
    const nutricionistas = await pool.query('SELECT id, nome, crn, crn_regiao, ativo FROM nutricionistas');
    console.log('\n👨‍⚕️ Nutricionistas cadastrados:');
    nutricionistas.rows.forEach(n => {
      console.log(`   ${n.nome} - ${n.crn_regiao} ${n.crn} - ${n.ativo ? 'Ativo' : 'Inativo'}`);
    });
    
    // Verificar se campo foi adicionado em cardapios
    const cardapiosColumns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'cardapios' AND column_name IN ('nutricionista_id', 'data_aprovacao_nutricionista', 'observacoes_nutricionista')
    `);
    
    console.log('\n📅 Campos adicionados em cardapios:');
    cardapiosColumns.rows.forEach(col => {
      console.log(`   ✓ ${col.column_name}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
