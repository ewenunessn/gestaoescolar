const axios = require('axios');

const API_URL = 'https://gestaoescolar-backend.vercel.app/api';

async function testar() {
  try {
    console.log('🧪 Testando API de comprovantes...\n');
    
    // Buscar comprovante com assinatura (ID 2)
    console.log('📋 Buscando comprovante COMP-2026-03-00002...');
    const response = await axios.get(`${API_URL}/entregas/comprovantes/2`);
    
    const comprovante = response.data;
    
    console.log(`\n✅ Comprovante encontrado:`);
    console.log(`   Número: ${comprovante.numero_comprovante}`);
    console.log(`   Recebedor: ${comprovante.nome_quem_recebeu}`);
    console.log(`   Itens: ${comprovante.total_itens}`);
    
    if (comprovante.assinatura_base64) {
      const tamanho = comprovante.assinatura_base64.length;
      const preview = comprovante.assinatura_base64.substring(0, 50);
      console.log(`\n✅ ASSINATURA PRESENTE:`);
      console.log(`   Tamanho: ${tamanho} caracteres`);
      console.log(`   Preview: ${preview}...`);
      console.log(`   Formato: ${comprovante.assinatura_base64.startsWith('data:image') ? 'Base64 válido' : 'Base64 sem header'}`);
    } else {
      console.log(`\n❌ ASSINATURA AUSENTE`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testar();
