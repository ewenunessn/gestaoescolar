const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificar() {
  try {
    console.log('🔍 Verificando comprovantes (NEON)...\n');

    // Verificar se as tabelas existem
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('comprovantes_entrega', 'comprovante_itens')
      ORDER BY table_name
    `);

    console.log('📋 Tabelas encontradas:');
    if (tables.rows.length === 0) {
      console.log('   ❌ Nenhuma tabela encontrada!');
      return;
    }
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Contar comprovantes
    const count = await pool.query('SELECT COUNT(*) as total FROM comprovantes_entrega');
    console.log(`\n📊 Total de comprovantes: ${count.rows[0].total}`);

    // Listar comprovantes
    const comprovantes = await pool.query(`
      SELECT 
        id,
        numero_comprovante,
        escola_id,
        data_entrega,
        nome_quem_entregou,
        nome_quem_recebeu,
        total_itens,
        status
      FROM comprovantes_entrega
      ORDER BY data_entrega DESC
      LIMIT 10
    `);

    if (comprovantes.rows.length > 0) {
      console.log('\n📝 Últimos comprovantes:');
      comprovantes.rows.forEach(c => {
        console.log(`   ${c.numero_comprovante} - Escola ${c.escola_id} - ${c.total_itens} itens - ${c.status}`);
      });
    } else {
      console.log('\n⚠️  Nenhum comprovante cadastrado ainda');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificar();
