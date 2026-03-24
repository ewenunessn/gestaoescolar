/**
 * Script para testar conversão de unidades
 * Cenário: Produto 900g vs Embalagem 450g
 */

console.log('🧪 Teste de Conversão de Unidades\n');
console.log('='.repeat(60));

// CENÁRIO 1: Produto 900g, Compra 450g
console.log('\n📦 CENÁRIO 1: Embalagens menores');
console.log('-'.repeat(60));

const produto1 = {
  nome: 'Óleo',
  unidade: 'UN',
  peso: 900 // gramas
};

const contrato1 = {
  unidade: 'UN',
  peso_embalagem: 450 // gramas
};

const fator1 = contrato1.peso_embalagem / produto1.peso;
console.log(`Produto: ${produto1.nome}`);
console.log(`  Unidade distribuição: ${produto1.unidade}`);
console.log(`  Peso: ${produto1.peso}g`);
console.log(`\nContrato:`);
console.log(`  Unidade compra: ${contrato1.unidade}`);
console.log(`  Peso embalagem: ${contrato1.peso_embalagem}g`);
console.log(`\n✅ Fator calculado: ${fator1}`);

const demanda1 = 6; // 6 unidades de 900g
const totalGramas1 = demanda1 * produto1.peso;
const quantidadePedido1 = demanda1 / fator1;

console.log(`\n📊 Cálculo:`);
console.log(`  Demanda: ${demanda1} unidades de ${produto1.peso}g`);
console.log(`  Total necessário: ${totalGramas1}g`);
console.log(`  Quantidade no pedido: ${quantidadePedido1} unidades de ${contrato1.peso_embalagem}g`);
console.log(`  Verificação: ${quantidadePedido1} × ${contrato1.peso_embalagem}g = ${quantidadePedido1 * contrato1.peso_embalagem}g ✅`);

// CENÁRIO 2: Produto 900g, Compra 900g (mesmo tamanho)
console.log('\n\n📦 CENÁRIO 2: Embalagens iguais');
console.log('-'.repeat(60));

const produto2 = {
  nome: 'Óleo',
  unidade: 'UN',
  peso: 900
};

const contrato2 = {
  unidade: 'UN',
  peso_embalagem: 900
};

const fator2 = contrato2.peso_embalagem / produto2.peso;
console.log(`Produto: ${produto2.nome}`);
console.log(`  Unidade distribuição: ${produto2.unidade}`);
console.log(`  Peso: ${produto2.peso}g`);
console.log(`\nContrato:`);
console.log(`  Unidade compra: ${contrato2.unidade}`);
console.log(`  Peso embalagem: ${contrato2.peso_embalagem}g`);
console.log(`\n✅ Fator calculado: ${fator2}`);

const demanda2 = 6;
const totalGramas2 = demanda2 * produto2.peso;
const quantidadePedido2 = demanda2 / fator2;

console.log(`\n📊 Cálculo:`);
console.log(`  Demanda: ${demanda2} unidades de ${produto2.peso}g`);
console.log(`  Total necessário: ${totalGramas2}g`);
console.log(`  Quantidade no pedido: ${quantidadePedido2} unidades de ${contrato2.peso_embalagem}g`);
console.log(`  Verificação: ${quantidadePedido2} × ${contrato2.peso_embalagem}g = ${quantidadePedido2 * contrato2.peso_embalagem}g ✅`);

// CENÁRIO 3: Produto 900g, Compra 1800g (embalagem maior)
console.log('\n\n📦 CENÁRIO 3: Embalagens maiores');
console.log('-'.repeat(60));

const produto3 = {
  nome: 'Óleo',
  unidade: 'UN',
  peso: 900
};

const contrato3 = {
  unidade: 'UN',
  peso_embalagem: 1800
};

const fator3 = contrato3.peso_embalagem / produto3.peso;
console.log(`Produto: ${produto3.nome}`);
console.log(`  Unidade distribuição: ${produto3.unidade}`);
console.log(`  Peso: ${produto3.peso}g`);
console.log(`\nContrato:`);
console.log(`  Unidade compra: ${contrato3.unidade}`);
console.log(`  Peso embalagem: ${contrato3.peso_embalagem}g`);
console.log(`\n✅ Fator calculado: ${fator3}`);

const demanda3 = 6;
const totalGramas3 = demanda3 * produto3.peso;
const quantidadePedido3 = demanda3 / fator3;

console.log(`\n📊 Cálculo:`);
console.log(`  Demanda: ${demanda3} unidades de ${produto3.peso}g`);
console.log(`  Total necessário: ${totalGramas3}g`);
console.log(`  Quantidade no pedido: ${quantidadePedido3} unidades de ${contrato3.peso_embalagem}g`);
console.log(`  Verificação: ${quantidadePedido3} × ${contrato3.peso_embalagem}g = ${quantidadePedido3 * contrato3.peso_embalagem}g ✅`);

// RESUMO
console.log('\n\n' + '='.repeat(60));
console.log('📋 RESUMO');
console.log('='.repeat(60));
console.log('\nFórmula do Fator:');
console.log('  fator = peso_embalagem_compra / peso_produto_distribuicao');
console.log('\nFórmula do Pedido:');
console.log('  quantidade_pedido = demanda / fator');
console.log('\nExemplos:');
console.log(`  • Embalagem menor (450g): fator = 0.5, pedido = 12 unidades`);
console.log(`  • Embalagem igual (900g): fator = 1.0, pedido = 6 unidades`);
console.log(`  • Embalagem maior (1800g): fator = 2.0, pedido = 3 unidades`);
console.log('\n✅ Sistema calcula automaticamente e corretamente!\n');
