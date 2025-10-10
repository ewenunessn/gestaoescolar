const db = require('./src/database');

async function testarPrevia() {
  try {
    console.log('🧪 Testando prévia de faturamento...\n');
    
    // Importar o serviço
    const { FaturamentoService } = require('./src/modules/pedidos/services/FaturamentoService');
    
    const pedidoId = 8;
    console.log(`📋 Calculando prévia para pedido ${pedidoId}...\n`);
    
    const previa = await FaturamentoService.calcularPreviaFaturamento(pedidoId);
    
    console.log('✅ Prévia calculada com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(JSON.stringify(previa.resumo, null, 2));
    
    if (previa.alertas && previa.alertas.length > 0) {
      console.log('\n⚠️ Alertas:');
      previa.alertas.forEach(alerta => console.log(`  - ${alerta}`));
    }
    
    console.log('\n✅ Teste concluído!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('\n📋 Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

testarPrevia();
