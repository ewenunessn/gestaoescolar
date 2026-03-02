const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteAllEmptyGuias() {
  try {
    console.log('🔍 Buscando guias vazias (sem itens)...\n');

    // Buscar guias vazias
    const guiasVazias = await pool.query(`
      SELECT 
        g.id,
        g.mes,
        g.ano,
        g.nome,
        g.status,
        COUNT(gpe.id) as total_itens
      FROM guias g
      LEFT JOIN guia_produto_escola gpe ON g.id = gpe.guia_id
      GROUP BY g.id, g.mes, g.ano, g.nome, g.status
      HAVING COUNT(gpe.id) = 0
      ORDER BY g.id
    `);

    if (guiasVazias.rows.length === 0) {
      console.log('✅ Nenhuma guia vazia encontrada');
      return;
    }

    console.log(`📋 Encontradas ${guiasVazias.rows.length} guias vazias:\n`);
    guiasVazias.rows.forEach(row => {
      console.log(`   ID: ${row.id} | ${row.mes}/${row.ano} | ${row.nome || 'Sem nome'} | Status: ${row.status}`);
    });

    console.log('\n⚠️  ATENÇÃO: Todas essas guias serão DELETADAS!\n');
    console.log('🗑️  Deletando...\n');

    let deletadas = 0;
    for (const guia of guiasVazias.rows) {
      try {
        await pool.query('DELETE FROM guias WHERE id = $1', [guia.id]);
        console.log(`✅ Guia ID ${guia.id} (${guia.mes}/${guia.ano}) deletada`);
        deletadas++;
      } catch (error) {
        console.error(`❌ Erro ao deletar guia ID ${guia.id}:`, error.message);
      }
    }

    console.log(`\n✅ Total deletado: ${deletadas} de ${guiasVazias.rows.length} guias`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

deleteAllEmptyGuias();
