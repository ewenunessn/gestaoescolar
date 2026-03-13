const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function aplicarMigration() {
  try {
    console.log('🔄 Aplicando migration de nutricionistas no Neon...\n');

    const migrationPath = path.join(__dirname, 'migrations', '20260312_create_nutricionistas.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);
    console.log('✅ Migration aplicada com sucesso!\n');

    // Verificar tabela
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
    const nutricionistas = await pool.query('SELECT * FROM nutricionistas');
    console.log(`\n👨‍⚕️ Nutricionistas cadastrados: ${nutricionistas.rows.length}`);
    nutricionistas.rows.forEach(n => {
      console.log(`   ${n.nome} - ${n.crn_regiao} ${n.crn} - ${n.ativo ? 'Ativo' : 'Inativo'}`);
    });

    // Verificar campos em cardapios_modalidade
    const cardapiosCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cardapios_modalidade' 
      AND column_name IN ('nutricionista_id', 'data_aprovacao_nutricionista', 'observacoes_nutricionista')
    `);

    console.log('\n📅 Campos adicionados em cardapios_modalidade:');
    cardapiosCols.rows.forEach(col => {
      console.log(`   ✓ ${col.column_name}`);
    });

    console.log('\n✅ Tudo pronto no Neon!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

aplicarMigration();
