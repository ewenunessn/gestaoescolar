const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function verificar() {
  try {
    console.log('🔍 Verificando entregas recentes...\n');

    const result = await pool.query(`
      SELECT COUNT(*) as total, MAX(data_entrega) as ultima 
      FROM historico_entregas
    `);
    
    console.log('📊 Estatísticas:');
    console.log(`   Total de entregas: ${result.rows[0].total}`);
    console.log(`   Última entrega: ${result.rows[0].ultima || 'Nenhuma'}\n`);

    const recentes = await pool.query(`
      SELECT 
        he.id,
        he.data_entrega,
        he.nome_quem_entregou,
        he.nome_quem_recebeu,
        he.quantidade_entregue,
        gpe.escola_id,
        e.nome as escola_nome
      FROM historico_entregas he
      INNER JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      ORDER BY he.data_entrega DESC
      LIMIT 10
    `);

    if (recentes.rows.length > 0) {
      console.log('📝 Últimas 10 entregas:');
      recentes.rows.forEach(r => {
        console.log(`   ID ${r.id}: ${new Date(r.data_entrega).toLocaleString('pt-BR')}`);
        console.log(`      Escola: ${r.escola_nome} (ID: ${r.escola_id})`);
        console.log(`      ${r.nome_quem_entregou} -> ${r.nome_quem_recebeu}`);
        console.log(`      Quantidade: ${r.quantidade_entregue}\n`);
      });
    } else {
      console.log('⚠️  Nenhuma entrega encontrada');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificar();
