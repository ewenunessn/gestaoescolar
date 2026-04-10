const http = require('http');

// Test if backend is running and test the endpoint
async function testEndpoint() {
  console.log('🔍 Testando se o backend está rodando...\n');

  // Test if server is up
  const testServer = new Promise((resolve) => {
    const req = http.get('http://localhost:3000/health', (res) => {
      console.log(`✅ Backend está rodando na porta 3000`);
      console.log(`   Status: ${res.statusCode}\n`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log(`❌ Backend NÃO está rodando na porta 3000`);
      console.log(`   Erro: ${err.message}\n`);
      console.log('💡 Solução: Inicie o backend com "npm run dev" na pasta backend/\n');
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      console.log(`❌ Backend não respondeu em 2 segundos`);
      resolve(false);
    });
  });

  const isRunning = await testServer;
  
  if (!isRunning) {
    console.log('⚠️  O frontend não consegue buscar dados porque o backend não está rodando!');
    process.exit(0);
  }

  // If backend is running, we need to test with authentication
  console.log('📝 Para testar o endpoint de cálculo nutricional, você precisa:');
  console.log('   1. Fazer login no frontend');
  console.log('   2. Abrir o DevTools (F12)');
  console.log('   3. Ir na aba Network');
  console.log('   4. Recarregar a página da preparação');
  console.log('   5. Procurar pela requisição "calcular-nutricional"');
  console.log('   6. Ver se há erro na resposta\n');
}

testEndpoint();
