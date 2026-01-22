const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔍 Testando API /api/pedidos/produtos-disponiveis...\n');

    // Você precisa substituir este token por um válido do seu sistema
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIzLCJub21lIjoiRXdlcnRvbiBEYW1hc2Nlbm8gTnVuZXMiLCJpYXQiOjE3MzcwNjI0NTUsImV4cCI6MTczNzE0ODg1NX0.Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8Ks8'; // Token de exemplo
    
    const response = await axios.get('http://localhost:3000/api/pedidos/produtos-disponiveis', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': '1'
      }
    });

    console.log('✅ Status:', response.status);
    console.log('✅ Total de produtos:', response.data.data.length);
    
    if (response.data.data.length > 0) {
      const arroz = response.data.data.find(p => p.produto_nome.toLowerCase().includes('arroz'));
      if (arroz) {
        console.log('\n📦 Dados do Arroz:');
        console.log('  - Produto:', arroz.produto_nome);
        console.log('  - Contrato:', arroz.contrato_numero);
        console.log('  - Quantidade Contratada:', arroz.quantidade_contratada);
        console.log('  - Saldo Disponível:', arroz.saldo_disponivel);
        console.log('  - Preço Unitário:', arroz.preco_unitario);
        console.log('  - Unidade:', arroz.unidade);
      } else {
        console.log('\n⚠️ Arroz não encontrado nos produtos');
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testAPI();
