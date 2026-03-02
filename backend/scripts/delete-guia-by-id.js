const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteGuia() {
  const guiaId = process.argv[2];

  if (!guiaId) {
    console.log('❌ Uso: node delete-guia-by-id.js <ID_DA_GUIA>');
    console.log('Exemplo: node delete-guia-by-id.js 123');
    process.exit(1);
  }

  try {
    console.log(`🔍 Buscando guia ID ${guiaId}...\n`);

    // Buscar a guia
    const guia = await pool.query('SELECT * FROM guias WHERE id = $1', [guiaId]);

    if (guia.rows.length === 0) {
      console.log(`❌ Guia ID ${guiaId} não encontrada`);
      process.exit(1);
    }

    console.log('📋 Guia encontrada:');
    console.log(`   ID: ${guia.rows[0].id}`);
    console.log(`   Mês/Ano: ${guia.rows[0].mes}/${guia.rows[0].ano}`);
    console.log(`   Nome: ${guia.rows[0].nome || 'N/A'}`);
    console.log(`   Status: ${guia.rows[0].status}`);
    console.log(`   Criada em: ${new Date(guia.rows[0].created_at).toLocaleString('pt-BR')}`);

    // Contar itens relacionados
    const itens = await pool.query(
      'SELECT COUNT(*) as total FROM guia_produto_escola WHERE guia_id = $1',
      [guiaId]
    );
    console.log(`\n📦 Itens relacionados: ${itens.rows[0].total}`);

    // Contar entregas relacionadas
    const entregas = await pool.query(`
      SELECT COUNT(*) as total 
      FROM historico_entregas he
      INNER JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      WHERE gpe.guia_id = $1
    `, [guiaId]);
    console.log(`📋 Entregas relacionadas: ${entregas.rows[0].total}`);

    console.log('\n⚠️  ATENÇÃO: Esta operação irá deletar:');
    console.log(`   - A guia ID ${guiaId}`);
    console.log(`   - ${itens.rows[0].total} itens da guia`);
    console.log(`   - ${entregas.rows[0].total} entregas relacionadas (CASCADE)`);

    // Deletar
    console.log('\n🗑️  Deletando...');
    const result = await pool.query('DELETE FROM guias WHERE id = $1', [guiaId]);

    if (result.rowCount > 0) {
      console.log(`✅ Guia ID ${guiaId} deletada com sucesso!`);
    } else {
      console.log(`❌ Falha ao deletar guia ID ${guiaId}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

deleteGuia();
