const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function listarGuias() {
  try {
    console.log('📋 Listando guias no Neon...\n');

    const result = await pool.query(`
      SELECT 
        g.id,
        g.mes,
        g.ano,
        g.nome,
        g.status,
        g.created_at,
        COUNT(DISTINCT gpe.id) as total_itens,
        COUNT(DISTINCT he.id) as total_entregas
      FROM guias g
      LEFT JOIN guia_produto_escola gpe ON g.id = gpe.guia_id
      LEFT JOIN historico_entregas he ON gpe.id = he.guia_produto_escola_id
      GROUP BY g.id, g.mes, g.ano, g.nome, g.status, g.created_at
      ORDER BY g.id DESC
    `);

    console.log(`Total de guias: ${result.rows.length}\n`);
    console.log('═'.repeat(120));

    result.rows.forEach(row => {
      console.log(`ID: ${row.id} | ${row.mes}/${row.ano} | ${row.nome || 'Sem nome'} | Status: ${row.status}`);
      console.log(`   Itens: ${row.total_itens} | Entregas: ${row.total_entregas}`);
      console.log(`   Criada em: ${new Date(row.created_at).toLocaleString('pt-BR')}`);
      console.log('─'.repeat(120));
    });

    console.log('\n💡 Para deletar uma guia, execute:');
    console.log('   node scripts/delete-guia-by-id.js <ID>');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

listarGuias();
