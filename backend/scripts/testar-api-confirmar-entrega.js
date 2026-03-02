const axios = require('axios');

async function testar() {
  try {
    console.log('🧪 Testando API de confirmar entrega...\n');

    // Simular uma confirmação de entrega
    const response = await axios.post(
      'https://gestaoescolar-backend.vercel.app/api/entregas/itens/999/confirmar',
      {
        quantidade_entregue: 10,
        nome_quem_entregou: 'Teste',
        nome_quem_recebeu: 'Teste',
        observacao: 'Teste'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Aceitar qualquer status
      }
    );

    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.historico_id) {
      console.log('\n✅ historico_id encontrado:', response.data.historico_id);
    } else {
      console.log('\n❌ historico_id NÃO encontrado na resposta');
      console.log('Estrutura da resposta:', Object.keys(response.data));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.log('Response data:', error.response.data);
    }
  }
}

testar();
