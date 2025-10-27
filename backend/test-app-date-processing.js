// Simular exatamente como o app mobile está processando as datas

console.log('🔍 Testando processamento de datas como no app mobile...\n');

// Data que está vindo do banco (como string ISO)
const dataValidadeDoBanco = '2025-11-20T03:00:00.000Z';

console.log('📅 Data recebida do banco:', dataValidadeDoBanco);

// Simular função formatarDataValidade do app
function formatarDataValidadeApp(dataValidade) {
  try {
    if (!dataValidade) return 'Sem validade';
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de datas
    
    console.log('Hoje (zerado):', hoje);
    console.log('Hoje ISO:', hoje.toISOString());
    
    // Tentar diferentes formatos de data
    let validade;
    
    if (dataValidade.includes('T')) {
      // Se já tem timezone, usar diretamente
      validade = new Date(dataValidade);
      console.log('Método 1 - new Date(dataValidade):', validade);
    } else {
      // Se é apenas data (YYYY-MM-DD), adicionar horário local
      validade = new Date(dataValidade + 'T00:00:00');
      console.log('Método 2 - new Date(dataValidade + T00:00:00):', validade);
    }
    
    // Verificar se a data é válida
    if (isNaN(validade.getTime())) {
      // Tentar formato ISO simples
      validade = new Date(dataValidade);
      if (isNaN(validade.getTime())) {
        return 'Data inválida';
      }
    }
    
    console.log('Data de validade processada:', validade);
    console.log('Data de validade ISO:', validade.toISOString());
    console.log('Data de validade local:', validade.toLocaleDateString('pt-BR'));
    
    const diffTime = validade.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log('Diferença em ms:', diffTime);
    console.log('Diferença em dias:', diffDays);
    
    if (diffDays < 0) return 'Vencido';
    if (diffDays === 0) return 'Vence hoje';
    if (diffDays === 1) return 'Vence amanhã';
    if (diffDays <= 7) return `${diffDays} dias`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} sem`;
    return `${Math.ceil(diffDays / 30)} mês`;
  } catch (error) {
    console.error('Erro:', error);
    return 'Data inválida';
  }
}

// Simular função de formatação de data para exibição
function formatarDataParaExibicao(dataValidade) {
  try {
    if (!dataValidade) return 'Sem validade';
    
    let data;
    if (dataValidade.includes('T')) {
      data = new Date(dataValidade);
    } else {
      data = new Date(dataValidade + 'T00:00:00');
    }
    
    if (isNaN(data.getTime())) {
      data = new Date(dataValidade);
      if (isNaN(data.getTime())) {
        return 'Data inválida';
      }
    }
    
    return data.toLocaleDateString('pt-BR');
  } catch (error) {
    return 'Data inválida';
  }
}

console.log('\n🔧 Resultado do processamento:');
const resultado = formatarDataValidadeApp(dataValidadeDoBanco);
console.log('Texto de validade:', resultado);

const dataFormatada = formatarDataParaExibicao(dataValidadeDoBanco);
console.log('Data formatada para exibição:', dataFormatada);

console.log('\n🌍 Informações de timezone:');
console.log('Timezone local:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Offset local (minutos):', new Date().getTimezoneOffset());

// Testar diferentes cenários
console.log('\n🧪 Testando diferentes cenários:');

const cenarios = [
  '2025-11-20T03:00:00.000Z', // Como vem do banco
  '2025-11-20',               // Apenas data
  '2025-11-20T00:00:00',      // Data com horário local
  '2025-11-19T21:00:00.000Z', // UTC que seria 19/11 no Brasil
];

cenarios.forEach((cenario, index) => {
  console.log(`\nCenário ${index + 1}: ${cenario}`);
  console.log('  Resultado:', formatarDataValidadeApp(cenario));
  console.log('  Formatado:', formatarDataParaExibicao(cenario));
});

// Testar especificamente o problema relatado
console.log('\n🎯 Teste específico do problema:');
console.log('Você cadastrou para dia 20/11/2025');
console.log('App está mostrando dia 19/11/2025');
console.log('Banco tem:', dataValidadeDoBanco);

const dataEsperada = new Date('2025-11-20T00:00:00'); // 20/11 às 00:00 local
const dataDoBanco = new Date(dataValidadeDoBanco);    // Como vem do banco

console.log('Data esperada (20/11 local):', dataEsperada.toLocaleDateString('pt-BR'));
console.log('Data do banco (processada):', dataDoBanco.toLocaleDateString('pt-BR'));

// Verificar se o problema é timezone
const offsetMinutos = new Date().getTimezoneOffset();
const offsetHoras = offsetMinutos / 60;
console.log(`Offset local: ${offsetHoras} horas (${offsetMinutos} minutos)`);

if (offsetHoras > 0) {
  console.log('⚠️  Timezone local está ATRÁS do UTC');
  console.log('   Isso pode causar a data aparecer um dia antes');
} else {
  console.log('✅ Timezone local está à frente ou igual ao UTC');
}