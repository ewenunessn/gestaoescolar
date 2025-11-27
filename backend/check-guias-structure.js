const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function checkGuias() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estrutura da tabela guias\n');

    const structure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'guias'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas:');
    structure.rows.forEach(col => {
      const mark = col.column_name === 'tenant_id' ? '✅' : '  ';
      console.log(`${mark} ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    const count = await client.query('SELECT COUNT(*) as total FROM guias');
    console.log(`Total de guias: ${count.rows[0].total}\n`);

    if (parseInt(count.rows[0].total) > 0) {
      const guias = await client.query(`
        SELECT id, mes, ano, status, created_at FROM guias ORDER BY created_at DESC
      `);
      
      console.log('Guias cadastradas:');
      guias.rows.forEach(g => {
        console.log(`  ID ${g.id}: ${g.mes}/${g.ano} - ${g.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkGuias();
