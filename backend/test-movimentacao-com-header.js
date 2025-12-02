require('dotenv').config();
const axios = require('axios');

async function testMovimentacao() {
  try {
    const tenantId = 'f830d523-25c9-4162-b241-6599df73171b'; // Brenda Nunes
    const escolaId = 181;
    const produtoId = 40; // Arroz
    
    console.log('🧪 Testando movimentação com header X-Tenant-ID...\n');
    console.log(`Tenant ID: ${tenantId}`);
    console.log(`Escola ID: ${escolaId}`);
    console.log(`Produto ID: ${produtoId}\n`);
    
    // Fazer login primeiro para obter token
    console.log('1️⃣ Fazendo login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@sistema.com',
      senha: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log(`✅ Login bem-sucedido! Token: ${token.substring(0, 20)}...\n`);
    
    // Tentar registrar movimentação
    console.log('2️⃣ Registrando movimentação...');
    const movimentacaoResponse = await axios.post(
      `http://localhost:3000/api/estoque-escola/escola/${escolaId}/movimentacao`,
      {
        produto_id: produtoId,
        tipo_movimentacao: 'entrada',
        quantidade: 10,
        motivo: 'Teste de entrada',
        usuario_id: 1
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Movimentação registrada com sucesso!');
    console.log('Resposta:', JSON.stringify(movimentacaoResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers enviados:', error.config?.headers);
    }
  }
}

testMovimentacao();
