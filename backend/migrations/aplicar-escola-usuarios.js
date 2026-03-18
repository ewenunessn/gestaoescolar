const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function aplicarMigracao() {
  const client = await pool.connect();
  try {
    console.log('🔄 Aplicando migração: add_escola_usuarios...\n');

    const sql = fs.readFileSync(
      path.join(__dirname, '20260317_add_escola_usuarios.sql'),
      'utf8'
    );

    await client.query(sql);

    console.log('✅ Migração aplicada com sucesso!\n');
    console.log('📋 Colunas adicionadas:');
    console.log('   - usuarios.escola_id (INTEGER, FK para escolas)');
    console.log('   - usuarios.tipo_secretaria (VARCHAR, valores: educacao|escola)');
    console.log('   - Índice: idx_usuarios_escola\n');

    // Verificar estrutura
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
      AND column_name IN ('escola_id', 'tipo_secretaria')
      ORDER BY column_name
    `);

    console.log('📊 Estrutura verificada:');
    result.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarMigracao().catch(console.error);
