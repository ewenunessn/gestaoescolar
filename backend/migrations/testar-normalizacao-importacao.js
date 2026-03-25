// Simular a função de validação do frontend
function validarProdutos(dadosRaw) {
  return dadosRaw.map((linha, index) => {
    // Normalizar tipo_processamento para lowercase
    let tipoProcessamento = linha.tipo_processamento || '';
    if (tipoProcessamento && typeof tipoProcessamento === 'string') {
      tipoProcessamento = tipoProcessamento.trim().toLowerCase();
    }
    
    const produto = {
      nome: linha.nome || '',
      unidade: linha.unidade || 'UN',
      tipo_processamento: tipoProcessamento,
      status: 'valido',
      mensagem: ''
    };

    const erros = [];

    // Validar nome
    if (!produto.nome || produto.nome.trim().length < 2) {
      erros.push('Nome do produto é obrigatório');
    }

    // Validar tipo de processamento (já normalizado para lowercase)
    if (produto.tipo_processamento && produto.tipo_processamento !== '' && 
        !['in natura', 'minimamente processado', 'ingrediente culinário', 'processado', 'ultraprocessado'].includes(produto.tipo_processamento)) {
      erros.push('Tipo de processamento inválido');
    }

    if (erros.length > 0) {
      produto.status = 'erro';
      produto.mensagem = erros.join('; ');
    } else {
      produto.status = 'valido';
      produto.mensagem = 'Dados válidos';
    }

    return produto;
  });
}

// Testes
console.log('🧪 Testando normalização de tipo_processamento na importação\n');

const testCases = [
  { nome: 'Abóbora', tipo_processamento: 'In Natura', esperado: 'valido' },
  { nome: 'Alface', tipo_processamento: 'In natura', esperado: 'valido' },
  { nome: 'Alho', tipo_processamento: 'Minimamente Processado', esperado: 'valido' },
  { nome: 'Arroz', tipo_processamento: 'minimamente processado', esperado: 'valido' },
  { nome: 'Azeite', tipo_processamento: 'Ingrediente Culinário', esperado: 'valido' },
  { nome: 'Açúcar', tipo_processamento: 'ingrediente culinário', esperado: 'valido' },
  { nome: 'Banana', tipo_processamento: 'IN NATURA', esperado: 'valido' },
  { nome: 'Batata', tipo_processamento: 'in natura', esperado: 'valido' },
  { nome: 'Biscoito', tipo_processamento: 'Ultraprocessado', esperado: 'valido' },
  { nome: 'Pão', tipo_processamento: 'Processado', esperado: 'valido' },
  { nome: 'Teste Vazio', tipo_processamento: '', esperado: 'valido' },
  { nome: 'Teste Null', tipo_processamento: null, esperado: 'valido' },
  { nome: 'Teste Inválido', tipo_processamento: 'Outro Valor', esperado: 'erro' },
];

const resultados = validarProdutos(testCases);

let passados = 0;
let falhados = 0;

resultados.forEach((resultado, index) => {
  const testCase = testCases[index];
  const passou = resultado.status === testCase.esperado;
  
  if (passou) {
    passados++;
    console.log(`✅ ${resultado.nome}`);
    console.log(`   Entrada: "${testCase.tipo_processamento || '(vazio)'}"`);
    console.log(`   Normalizado: "${resultado.tipo_processamento || '(vazio)'}"`);
    console.log(`   Status: ${resultado.status}\n`);
  } else {
    falhados++;
    console.log(`❌ ${resultado.nome}`);
    console.log(`   Entrada: "${testCase.tipo_processamento || '(vazio)'}"`);
    console.log(`   Normalizado: "${resultado.tipo_processamento || '(vazio)'}"`);
    console.log(`   Esperado: ${testCase.esperado}`);
    console.log(`   Obtido: ${resultado.status}`);
    console.log(`   Mensagem: ${resultado.mensagem}\n`);
  }
});

console.log('='.repeat(60));
console.log(`📊 Resultado: ${passados}/${testCases.length} testes passaram`);
console.log('='.repeat(60));

if (falhados === 0) {
  console.log('\n✅ Todos os testes passaram! A normalização está funcionando corretamente.');
} else {
  console.log(`\n❌ ${falhados} teste(s) falharam.`);
  process.exit(1);
}
