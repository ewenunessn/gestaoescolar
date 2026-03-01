const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function checkAllHistorico() {
  try {
    console.log('🔍 Verificando TODOS os registros de histórico de entregas...\n');

    // Buscar todos os registros de histórico
    const result = await pool.query(`
      SELECT 
        he.id,
        he.guia_produto_escola_id,
        he.quantidade_entregue,
        he.data_entrega,
        he.nome_quem_entregou,
        he.nome_quem_recebeu,
        he.observacao,
        he.created_at,
        p.nome as produto_nome,
        e.nome as escola_nome,
        gpe.quantidade as quantidade_programada,
        gpe.unidade
      FROM historico_entregas he
      INNER JOIN guia_produto_escola gpe ON he.guia_produto_escola_id = gpe.id
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      ORDER BY he.created_at DESC
      LIMIT 20
    `);

    console.log(`📊 Encontrados ${result.rows.length} registros de histórico:\n`);

    for (const h of result.rows) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📋 Histórico ID: ${h.id}`);
      console.log(`   Item ID: ${h.guia_produto_escola_id}`);
      console.log(`   Produto: ${h.produto_nome}`);
      console.log(`   Escola: ${h.escola_nome}`);
      console.log(`   Programado: ${h.quantidade_programada} ${h.unidade}`);
      console.log(`   Quantidade Entregue: ${h.quantidade_entregue} ${h.unidade}`);
      console.log(`   Entregador: ${h.nome_quem_entregou}`);
      console.log(`   Recebedor: ${h.nome_quem_recebeu}`);
      if (h.observacao) {
        console.log(`   Observação: ${h.observacao}`);
      }
      console.log(`   Data Entrega: ${new Date(h.data_entrega).toLocaleString('pt-BR')}`);
      console.log(`   Criado em: ${new Date(h.created_at).toLocaleString('pt-BR')}`);
      console.log('');
    }

    // Contar total de registros
    const countResult = await pool.query('SELECT COUNT(*) as total FROM historico_entregas');
    console.log(`\n📊 Total de registros no histórico: ${countResult.rows[0].total}\n`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkAllHistorico();
