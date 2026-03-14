const axios = require('axios');

async function testarIngredientesDetalhados() {
  try {
    console.log('🧪 Testando endpoint de ingredientes detalhados...\n');
    
    // Testar com refeição ID 1
    const refeicaoId = 1;
    const url = `http://localhost:3000/api/refeicoes/${refeicaoId}/ingredientes-detalhados`;
    
    console.log(`📡 GET ${url}`);
    const response = await axios.get(url);
    
    console.log('\n✅ Resposta recebida:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.ingredientes.length === 0) {
      console.log('\n⚠️  Nenhum ingrediente encontrado.');
      console.log('Verifique se a refeição tem ingredientes cadastrados.');
    } else {
      console.log(`\n✅ ${response.data.ingredientes.length} ingrediente(s) encontrado(s)`);
      
      // Mostrar detalhes do primeiro ingrediente
      const primeiro = response.data.ingredientes[0];
      console.log('\n📊 Primeiro ingrediente:');
      console.log(`   Produto: ${primeiro.produto_nome}`);
      console.log(`   Per Capita: ${primeiro.per_capita} ${primeiro.tipo_medida}`);
      console.log(`   Proteínas: ${primeiro.proteinas_porcao}g`);
      console.log(`   Lipídios: ${primeiro.lipidios_porcao}g`);
      console.log(`   Carboidratos: ${primeiro.carboidratos_porcao}g`);
    }
    
  } catch (error) {
    console.error('\n❌ Erro ao testar endpoint:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Dados: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   ${error.message}`);
    }
  }
}

testarIngredientesDetalhados();
