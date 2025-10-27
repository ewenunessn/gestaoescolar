// Testar se a correção de timezone funcionou

console.log('🧪 Testando correção de timezone...\n');

// Simular a função corrigida do app mobile
function processarDataCorreta(dataStr) {
  if (dataStr.includes('T')) {
    return new Date(dataStr);
  } else {
    // Para datas apenas (YYYY-MM-DD), criar data local sem timezone
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }
}

function formatarDataValidadeCorrigida(dataValidade) {
  try {
    if (!dataValidade) return 'Sem validade';
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Processar data corrigindo problema de timezone
    let validade = processarDataCorreta(dataValidade);
    
    // Verificar se a data é válida
    if (isNaN(validade.getTime())) {
      return 'Data inválida';
    }
    
    const diffTime = validade.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Vencido';
    if (diffDays === 0) return 'Vence hoje';
    if (diffDays === 1) return 'Vence amanhã';
    if (diffDays <= 7) return `${diffDays} dias`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} sem`;
    return `${Math.ceil(diffDays / 30)} mês`;
  } catch (error) {
    console.error('Erro ao formatar data de validade:', error);
    return 'Data inválida';
  }
}

// Testar com a data problemática
const dataProblematica = '2025-11-20';

console.log('📅 Teste com data problemática:', dataProblematica);
console.log('');

// Método antigo (problemático)
console.log('🔴 Método ANTIGO (problemático):');
const dataAntigaUTC = new Date(dataProblematica);
console.log('new Date(dataProblematica):', dataAntigaUTC);
console.log('toLocaleDateString():', dataAntigaUTC.toLocaleDateString('pt-BR'));
console.log('getDate():', dataAntigaUTC.getDate());

const dataAntigaLocal = new Date(dataProblematica + 'T00:00:00');
console.log('new Date(dataProblematica + T00:00:00):', dataAntigaLocal);
console.log('toLocaleDateString():', dataAntigaLocal.toLocaleDateString('pt-BR'));
console.log('getDate():', dataAntigaLocal.getDate());

console.log('');

// Método novo (corrigido)
console.log('✅ Método NOVO (corrigido):');
const dataCorrigida = processarDataCorreta(dataProblematica);
console.log('processarDataCorreta(dataProblematica):', dataCorrigida);
console.log('toLocaleDateString():', dataCorrigida.toLocaleDateString('pt-BR'));
console.log('getDate():', dataCorrigida.getDate());

console.log('');

// Testar formatação
console.log('📝 Teste de formatação:');
console.log('Método antigo (UTC):', (() => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const validade = new Date(dataProblematica);
  const diffTime = validade.getTime() - hoje.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Vencido';
  if (diffDays === 0) return 'Vence hoje';
  if (diffDays === 1) return 'Vence amanhã';
  if (diffDays <= 7) return `${diffDays} dias`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} sem`;
  return `${Math.ceil(diffDays / 30)} mês`;
})());

console.log('Método corrigido:', formatarDataValidadeCorrigida(dataProblematica));

console.log('');

// Testar vários casos
console.log('🔍 Teste com vários casos:');
const casosTeste = [
  '2025-11-20',           // Caso original
  '2025-12-14',           // Outro caso do banco
  '2025-10-28',           // Caso próximo
  '2025-11-20T03:00:00.000Z', // Com timezone
];

casosTeste.forEach((caso, index) => {
  console.log(`\nCaso ${index + 1}: ${caso}`);
  
  // Método antigo
  const dataAntiga = new Date(caso);
  console.log('  Antigo:', dataAntiga.toLocaleDateString('pt-BR'));
  
  // Método corrigido
  const dataCorrigida = processarDataCorreta(caso);
  console.log('  Corrigido:', dataCorrigida.toLocaleDateString('pt-BR'));
  
  // Verificar se são diferentes
  if (dataAntiga.getDate() !== dataCorrigida.getDate()) {
    console.log('  ⚠️  DIFERENÇA DETECTADA!');
  } else {
    console.log('  ✅ Mesmo resultado');
  }
});

console.log('\n🎯 Conclusão:');
console.log('A correção deve resolver o problema de timezone onde:');
console.log('- Você cadastra: 20/11/2025');
console.log('- Banco salva: 2025-11-20');
console.log('- App agora mostra: 20/11/2025 (corrigido!)');
console.log('- Antes mostrava: 19/11/2025 (problema resolvido)');