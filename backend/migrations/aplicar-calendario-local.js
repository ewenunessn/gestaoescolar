/**
 * Script para aplicar a migration do Calendário Letivo no banco LOCAL
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Conectar ao banco LOCAL
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function aplicarMigration() {
  console.log('🔧 Aplicando migration do Calendário Letivo no banco LOCAL...\n');

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados local\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '20260317_create_calendario_letivo.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar migration
    console.log('📝 Executando SQL...');
    await client.query(sql);

    console.log('\n✅ Migration aplicada com sucesso!\n');

    // Verificar tabelas criadas
    const tabelas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'calendario_letivo',
        'eventos_calendario',
        'periodos_avaliativos',
        'dias_letivos_excecoes'
      )
      ORDER BY table_name
    `);

    console.log('📊 Tabelas criadas:');
    tabelas.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log('\n🎉 Pronto! Agora execute:');
    console.log('   node backend/migrations/inserir-dados-calendario-2024-local.js\n');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

aplicarMigration();
