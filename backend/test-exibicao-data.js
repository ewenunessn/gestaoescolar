// Testar especificamente a exibição de data como o app faz

console.log('🔍 Testando exibição de data no app...\n');

// Simular dados que vêm do banco
const dadosDoBanco = {
  data_validade: '2025-12-14',
  data_validade_objeto: new Date('2025-12-14T03:00:00.000Z')
};

console.log('📦 Dados do banco:');
console.log('  data_validade (string):', dadosDoBanco.data_validade);
console.log('  data_validade (objeto):', dadosDoBanco.data_validade_objeto);
console.log('');

// Simular função formatarData CORRIGIDA
function formatarDataCorrigida(data) {
  try {
    if (!data) return 'Sem validade';
    
    // Se for objeto Date, converter para string
    if (data instanceof Date) {
      data = data.toISOString().split('T')[0];
    }
    
    let dataLocal;
    
    if (data.includes('T')) {
      // Se já tem timezone, usar diretamente
      dataLocal = new Date(data);
    } else {
      // CORREÇÃO: Para datas apenas (YYYY-MM-DD), criar data local sem timezone
      const [ano, mes, dia] = data.split('-').map(Number);
      dataLocal = new Date(ano, mes - 1, dia);
    }
    
    // Verificar se a data é válida
    if (isNaN(dataLocal.getTime())) {
      return 'Data inválida';
    }
    
    return dataLocal.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data:', error, 'Data recebida:', data);
    return 'Data inválida';
  }
}

// Simular função formatarData ANTIGA (problemática)
function formatarDataAntiga(data) {
  try {
    if (!data) return 'Sem validade';
    
    // Se for objeto Date, converter para string
    if (data instanceof Date) {
      data = data.toISOString().split('T')[0];
    }
    
    let dataLocal;
    
    if (data.includes('T')) {
      dataLocal = new Date(data);
    } else {
      // PROBLEMA: Adiciona T00:00:00 que é interpretado como local
      dataLocal = new Date(data + 'T00:00:00');
    }
    
    if (isNaN(dataLocal.getTime())) {
      dataLocal = new Date(data);
      if (isNaN(dataLocal.getTime())) {
        return 'Data inválida';
      }
    }
    
    return dataLocal.toLocaleDateString('pt-BR');
  } catch (error) {
    return 'Data inválida';
  }
}

console.log('🔴 Método ANTIGO (problemático):');
console.log('  String:', formatarDataAntiga(dadosDoBanco.data_validade));
console.log('  Objeto:', formatarDataAntiga(dadosDoBanco.data_validade_objeto));
console.log('');

console.log('✅ Método CORRIGIDO:');
console.log('  String:', formatarDataCorrigida(dadosDoBanco.data_validade));
console.log('  Objeto:', formatarDataCorrigida(dadosDoBanco.data_validade_objeto));
console.log('');

// Testar diferentes cenários
console.log('🧪 Testando diferentes cenários:');

const cenarios = [
  { nome: 'String simples', valor: '2025-12-14' },
  { nome: 'String com timezone', valor: '2025-12-14T03:00:00.000Z' },
  { nome: 'Objeto Date', valor: new Date('2025-12-14T03:00:00.000Z') },
  { nome: 'String ISO completa', valor: '2025-12-14T00:00:00' },
];

cenarios.forEach(cenario => {
  console.log(`\n${cenario.nome}: ${cenario.valor}`);
  console.log('  Antigo:', formatarDataAntiga(cenario.valor));
  console.log('  Corrigido:', formatarDataCorrigida(cenario.valor));
});

// Verificar se há diferença
console.log('\n\n🎯 CONCLUSÃO:');
const resultadoAntigo = formatarDataAntiga('2025-12-14');
const resultadoCorrigido = formatarDataCorrigida('2025-12-14');

if (resultadoAntigo !== resultadoCorrigido) {
  console.log('⚠️  HÁ DIFERENÇA!');
  console.log(`   Antigo: ${resultadoAntigo}`);
  console.log(`   Corrigido: ${resultadoCorrigido}`);
  console.log('');
  console.log('✅ A correção está funcionando corretamente!');
  console.log('   Se o app ainda mostra errado, pode ser:');
  console.log('   1. Cache do React Native não foi limpo');
  console.log('   2. App não foi recompilado');
  console.log('   3. Algum componente não foi atualizado');
} else {
  console.log('✅ Ambos retornam o mesmo resultado');
  console.log(`   Resultado: ${resultadoCorrigido}`);
}

// Testar especificamente o caso relatado
console.log('\n\n📋 CASO ESPECÍFICO RELATADO:');
console.log('Você cadastrou: 14/12/2025');
console.log('Banco salvou: 2025-12-14');
console.log('App deveria mostrar: 14/12/2025');
console.log('');
console.log('Resultado com correção:', formatarDataCorrigida('2025-12-14'));

if (formatarDataCorrigida('2025-12-14') === '14/12/2025') {
  console.log('✅ CORRETO! A correção está funcionando.');
} else {
  console.log('❌ ERRO! Algo ainda está errado.');
}