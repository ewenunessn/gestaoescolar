const axios = require('axios');

async function testar() {
  try {
    console.log('🧪 Testando API de comprovantes...\n');

    // Buscar comprovante ID 2 (que tem assinatura)
    const response = await axios.get(
      'https://gestaoescolar-backend.vercel.app/api/entregas/comprovantes/2',
      { validateStatus: () => true }
    );

    console.log('Status:', response.status);
    
    if (response.data) {
      console.log('\n📋 Comprovante:', response.data.numero_comprovante);
      console.log('Recebedor:', response.data.nome_quem_recebeu);
      
      if (response.data.assinatura_base64) {
        const tamanho = response.data.assinatura_base64.length;
        const preview = response.data.assinatura_base64.substring(0, 50);
        console.log('\n✅ Assinatura encontrada!');
        console.log('   Tamanho:', tamanho, 'chars');
        console.log('   Preview:', preview + '...');
        console.log('   Formato válido:', response.data.assinatura_base64.startsWith('data:image/'));
      } else {
        console.log('\n❌ Assinatura NÃO encontrada na resposta da API');
      }
      
      console.log('\n📊 Campos retornados:', Object.keys(response.data));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testar();
