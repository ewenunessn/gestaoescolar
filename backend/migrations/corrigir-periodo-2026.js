const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'alimentacao_escolar',
  password: 'admin123',
  port: 5432,
  ssl: false
});

async function corrigir() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Corrigindo período 2026...\n');

    await client.query(`
      UPDATE periodos 
      SET ativo = true, ocultar_dados = false 
      WHERE ano = 2026
    `);

    await client.query(`
      UPDATE periodos 
      SET ativo = false 
      WHERE ano != 2026
    `);

    const result = await client.query(`
      SELECT id, ano, ativo, ocultar_dados
      FROM periodos
      ORDER BY ano DESC
    `);

    console.log('📊 Períodos atualizados:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

corrigir();
