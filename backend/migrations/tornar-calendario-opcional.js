/**
 * Script para tornar calendario_letivo_id opcional na tabela eventos_calendario
 * Permite criar eventos sem precisar de um calendário letivo
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function tornarCalendarioOpcional() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Tornando calendario_letivo_id opcional...\n');

    await client.query(`
      ALTER TABLE eventos_calendario 
      ALTER COLUMN calendario_letivo_id DROP NOT NULL;
    `);

    console.log('✅ Coluna calendario_letivo_id agora é opcional!\n');
    console.log('📝 Agora você pode criar eventos sem precisar de um calendário letivo.\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

tornarCalendarioOpcional().catch(console.error);
