const axios = require('axios');

async function checkVercelEnv() {
  console.log('\n=== VERIFICANDO VARIÁVEIS NO VERCEL ===\n');
  
  try {
    // Tentar acessar um endpoint que retorne info sobre o ambiente
    const response = await axios.get('https://gestaoescolar-backend.vercel.app/api/health');
    console.log('✅ Backend está online');
    console.log('Resposta:', response.data);
  } catch (error) {
    console.log('Status:', error.response?.status);
    console.log('Dados:', error.response?.data);
  }
  
  console.log('\n📋 CHECKLIST VERCEL:\n');
  console.log('1. ✓ Você atualizou JWT_SECRET?');
  console.log('2. ✓ Marcou para Production?');
  console.log('3. ✓ Fez Redeploy?');
  console.log('4. ✓ Aguardou o deploy completar (2-3 minutos)?');
  console.log('\n💡 DICA: Vá em Vercel > Deployments > Último deploy');
  console.log('   Clique nos "..." > View Function Logs');
  console.log('   Procure por erros de JWT\n');
}

checkVercelEnv();
