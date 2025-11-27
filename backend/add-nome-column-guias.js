const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function addNomeColumn() {
  const client = await pool.connect();
  
  try {
    console.log('📝 Adicionando coluna nome à tabela guias\n');

    await client.query(`
      ALTER TABLE guias ADD COLUMN IF NOT EXISTS nome VARCHAR(255)
    `);

    console.log('✅ Coluna nome adicionada com sucesso!\n');

    // Verificar
    const check = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'guias' AND column_name = 'nome'
    `);

    if (check.rows.length > 0) {
      console.log('✅ Coluna confirmada:', check.rows[0]);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addNomeColumn();
