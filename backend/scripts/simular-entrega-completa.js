const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function simular() {
  try {
    console.log('🧪 Simulando fluxo completo de entrega...\n');

    // 1. Buscar um item válido
    const item = await pool.query(`
      SELECT gpe.id, p.nome, gpe.quantidade, gpe.unidade, gpe.escola_id
      FROM guia_produto_escola gpe
      INNER JOIN produtos p ON gpe.produto_id = p.id
      WHERE gpe.para_entrega = true
      AND (gpe.quantidade - COALESCE(gpe.quantidade_total_entregue, 0)) > 0
      LIMIT 1
    `);

    if (item.rows.length === 0) {
      console.log('❌ Nenhum item disponível para entrega');
      return;
    }

    const itemData = item.rows[0];
    console.log('📦 Item selecionado:');
    console.log(`   ID: ${itemData.id}`);
    console.log(`   Produto: ${itemData.nome}`);
    console.log(`   Quantidade: ${itemData.quantidade} ${itemData.unidade}`);
    console.log(`   Escola ID: ${itemData.escola_id}\n`);

    // 2. Confirmar entrega (sem token para simular)
    console.log('📤 Confirmando entrega...');
    const response = await axios.post(
      `https://gestaoescolar-backend.vercel.app/api/entregas/itens/${itemData.id}/confirmar`,
      {
        quantidade_entregue: 1,
        nome_quem_entregou: 'Teste Simulação',
        nome_quem_recebeu: 'Teste Recebedor',
        observacao: 'Teste de simulação'
      },
      {
        validateStatus: () => true
      }
    );

    console.log('📥 Status:', response.status);
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));

    if (response.data.historico_id) {
      console.log('\n✅ historico_id encontrado:', response.data.historico_id);
      console.log('\n🎯 O backend está funcionando corretamente!');
      console.log('   O problema deve estar no app não capturando o historico_id');
    } else {
      console.log('\n❌ historico_id NÃO encontrado');
      console.log('   Estrutura:', Object.keys(response.data));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

simular();
