/**
 * Script para testar a API de estoque da escola 121
 */

const axios = require('axios');

async function testApiEstoque() {
  try {
    console.log('🧪 Testando API de estoque da escola 121...\n');

    const baseURL = 'http://localhost:3000/api';
    const tenantId = '00000000-0000-0000-0000-000000000000';

    // Fazer requisição sem autenticação (para testar)
    const response = await axios.get(`${baseURL}/estoque-escola/escola/121`, {
      headers: {
        'X-Tenant-ID': tenantId,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Status:', response.status);
    console.log('📦 Dados retornados:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data) {
      console.log(`\n✅ Total de itens: ${response.data.data.length}`);
      
      if (response.data.data.length > 0) {
        console.log('\nPrimeiros 5 itens:');
        response.data.data.slice(0, 5).forEach(item => {
          console.log(`   - ${item.produto_nome}: ${item.quantidade_atual} ${item.unidade}`);
        });
      } else {
        console.log('\n⚠️  Array vazio retornado!');
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testApiEstoque();
