const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function debugSpecificItems() {
  try {
    console.log('🔍 Buscando itens específicos (Ovos e Macarrão)...\n');

    // Buscar itens de Ovos e Macarrão
    const result = await pool.query(`
      SELECT 
        gpe.id,
        p.nome as produto_nome,
        e.nome as escola_nome,
        gpe.quantidade as quantidade_programada,
        gpe.unidade,
        gpe.quantidade_total_entregue,
        (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) as saldo_pendente,
        gpe.entrega_confirmada,
        (
          SELECT json_agg(
            json_build_object(
              'id', he.id,
              'quantidade_entregue', he.quantidade_entregue,
              'data_entrega', he.data_entrega,
              'nome_quem_entregou', he.nome_quem_entregou,
              'nome_quem_recebeu', he.nome_quem_recebeu,
              'observacao', he.observacao
            ) ORDER BY he.data_entrega DESC
          )
          FROM historico_entregas he
          WHERE he.guia_produto_escola_id = gpe.id
        ) as historico_entregas
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      INNER JOIN escolas e ON gpe.escola_id = e.id
      WHERE gpe.para_entrega = true
        AND (p.nome ILIKE '%ovo%' OR p.nome ILIKE '%macarr%')
      ORDER BY p.nome, e.nome
    `);

    console.log(`📊 Encontrados ${result.rows.length} itens:\n`);

    for (const item of result.rows) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📦 Item ID: ${item.id}`);
      console.log(`   Produto: ${item.produto_nome}`);
      console.log(`   Escola: ${item.escola_nome}`);
      console.log(`   Programado: ${item.quantidade_programada} ${item.unidade}`);
      console.log(`   Total Entregue: ${item.quantidade_total_entregue || 0} ${item.unidade}`);
      console.log(`   Saldo Pendente: ${item.saldo_pendente} ${item.unidade}`);
      console.log(`   Entrega Confirmada: ${item.entrega_confirmada}`);
      
      if (item.historico_entregas && item.historico_entregas.length > 0) {
        console.log(`   📋 Histórico (${item.historico_entregas.length} entregas):`);
        let soma = 0;
        item.historico_entregas.forEach((h, i) => {
          soma += parseFloat(h.quantidade_entregue);
          console.log(`      ${i + 1}. ${h.quantidade_entregue} ${item.unidade} - ${h.nome_quem_entregou} → ${h.nome_quem_recebeu}`);
          console.log(`         Data: ${new Date(h.data_entrega).toLocaleString('pt-BR')}`);
          if (h.observacao) {
            console.log(`         Obs: ${h.observacao}`);
          }
        });
        console.log(`   📊 Soma das entregas: ${soma} ${item.unidade}`);
      } else {
        console.log(`   📋 Nenhuma entrega registrada`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

debugSpecificItems();
