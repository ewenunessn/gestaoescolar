const axios = require('axios');

// Test script to verify movimentation save functionality
async function testMovimentacaoSave() {
  console.log('🧪 Testing movimentation save functionality...');
  
  const baseURL = 'http://localhost:3000/api';
  
  try {
    // Test data for creating a movement
    const testData = {
      produto_id: 1, // Adjust this to an existing product ID
      quantidade: 5,
      motivo: 'Teste de saída de estoque',
      documento_referencia: 'TEST-001',
      observacoes: 'Teste automatizado para verificar o salvamento de movimentação'
    };

    console.log('📤 Sending request to process stock output...');
    console.log('Test data:', JSON.stringify(testData, null, 2));

    // Make the request to process stock output
    const response = await axios.post(`${baseURL}/estoque-central/saidas`, testData, {
      headers: {
        'Authorization': 'Bearer gestor_84', // Using gestor token for escola 84
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Response received:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('🎉 Movimentation saved successfully!');
      console.log('Movements processed:', response.data.data.movimentacoes?.length || 0);
      console.log('Total quantity processed:', response.data.data.quantidade_total);
    } else {
      console.log('❌ Movimentation save failed:', response.data.message);
    }

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
testMovimentacaoSave();