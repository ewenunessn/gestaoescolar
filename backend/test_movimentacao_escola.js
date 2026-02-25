const axios = require('axios');

// Test script to verify the new movimentacao endpoint
async function testMovimentacaoEndpoint() {
  console.log('🧪 Testing movimentacao endpoint...');
  
  const baseURL = 'http://localhost:3000/api';
  const escolaId = 84; // Using escola 84 from the error message
  
  try {
    // Test data for creating a movement
    const testData = {
      produto_id: 1, // Adjust this to an existing product ID
      tipo_movimentacao: 'entrada', // entrada, saida, or ajuste
      quantidade: 10,
      motivo: 'Teste de entrada de estoque',
      documento_referencia: 'TEST-ENTRADA-001',
      usuario_id: 1,
      data_validade: '2024-12-31' // Optional, for products with expiration
    };

    console.log('📤 Testing ENTRADA movement...');
    console.log('Test data:', JSON.stringify(testData, null, 2));

    // Make the request to register movement
    const response = await axios.post(`${baseURL}/estoque-escola/escola/${escolaId}/movimentacao`, testData, {
      headers: {
        'Authorization': 'Bearer gestor_84', // Using gestor token for escola 84
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Response received:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('🎉 Movimentation registered successfully!');
      console.log('Estoque atualizado:', response.data.data.estoque);
      console.log('Histórico:', response.data.data.historico);
    } else {
      console.log('❌ Movimentation registration failed:', response.data.message);
    }

    // Test SAIDA movement
    console.log('\n📤 Testing SAIDA movement...');
    const saidaData = {
      produto_id: 1,
      tipo_movimentacao: 'saida',
      quantidade: 5,
      motivo: 'Teste de saída de estoque',
      documento_referencia: 'TEST-SAIDA-001',
      usuario_id: 1
    };

    const saidaResponse = await axios.post(`${baseURL}/estoque-escola/escola/${escolaId}/movimentacao`, saidaData, {
      headers: {
        'Authorization': 'Bearer gestor_84',
        'Content-Type': 'application/json'
      }
    });

    console.log('SAIDA Response:', JSON.stringify(saidaResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error during test:');
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error message:', error.message);
    }
  }
}

// Run the test
testMovimentacaoEndpoint();