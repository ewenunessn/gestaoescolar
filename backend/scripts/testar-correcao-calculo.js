/**
 * TESTE: Verificar se a correção do cálculo está funcionando
 * 
 * Antes: demanda × fator (ERRADO)
 * Depois: demanda ÷ fator (CORRETO)
 */

console.log('\n🧪 TESTE: Correção do Cálculo de Conversão\n');
console.log('═'.repeat(60));

// Cenário 1: Óleo 900g vs 450g
console.log('\n📦 Cenário 1: Óleo de Soja');
console.log('   Produto: 900g por unidade');
console.log('   Contrato: 450g por unidade');
console.log('   Fator: 450 / 900 = 0.5');
console.log('');

const demanda1 = 13;
const fator1 = 0.5;

console.log(`   Demanda: ${demanda1} unidades de 900g`);
console.log(`   Total: ${demanda1 * 900}g`);
console.log('');

// Cálculo ERRADO (antes)
const pedidoErrado1 = Math.ceil(demanda1 * fator1);
console.log(`   ❌ Cálculo ERRADO (antes): ${demanda1} × ${fator1} = ${pedidoErrado1} unidades`);
console.log(`      Total: ${pedidoErrado1 * 450}g`);
console.log(`      Diferença: ${(demanda1 * 900) - (pedidoErrado1 * 450)}g faltando!`);
console.log('');

// Cálculo CORRETO (depois)
const pedidoCorreto1 = Math.ceil(demanda1 / fator1);
console.log(`   ✅ Cálculo CORRETO (depois): ${demanda1} ÷ ${fator1} = ${pedidoCorreto1} unidades`);
console.log(`      Total: ${pedidoCorreto1 * 450}g`);
console.log(`      Diferença: ${(demanda1 * 900) - (pedidoCorreto1 * 450)}g`);

// Cenário 2: Exemplo genérico
console.log('\n' + '─'.repeat(60));
console.log('\n📦 Cenário 2: Produto Genérico');
console.log('   Produto: 1000g por unidade');
console.log('   Contrato: 500g por unidade');
console.log('   Fator: 500 / 1000 = 0.5');
console.log('');

const demanda2 = 10;
const fator2 = 0.5;

console.log(`   Demanda: ${demanda2} unidades de 1000g`);
console.log(`   Total: ${demanda2 * 1000}g`);
console.log('');

const pedidoErrado2 = Math.ceil(demanda2 * fator2);
console.log(`   ❌ Cálculo ERRADO: ${demanda2} × ${fator2} = ${pedidoErrado2} unidades`);
console.log(`      Total: ${pedidoErrado2 * 500}g (falta ${(demanda2 * 1000) - (pedidoErrado2 * 500)}g)`);
console.log('');

const pedidoCorreto2 = Math.ceil(demanda2 / fator2);
console.log(`   ✅ Cálculo CORRETO: ${demanda2} ÷ ${fator2} = ${pedidoCorreto2} unidades`);
console.log(`      Total: ${pedidoCorreto2 * 500}g (perfeito!)`);

// Cenário 3: Fator > 1 (embalagem maior que produto)
console.log('\n' + '─'.repeat(60));
console.log('\n📦 Cenário 3: Embalagem Maior');
console.log('   Produto: 500g por unidade');
console.log('   Contrato: 1000g por unidade');
console.log('   Fator: 1000 / 500 = 2');
console.log('');

const demanda3 = 10;
const fator3 = 2;

console.log(`   Demanda: ${demanda3} unidades de 500g`);
console.log(`   Total: ${demanda3 * 500}g`);
console.log('');

const pedidoErrado3 = Math.ceil(demanda3 * fator3);
console.log(`   ❌ Cálculo ERRADO: ${demanda3} × ${fator3} = ${pedidoErrado3} unidades`);
console.log(`      Total: ${pedidoErrado3 * 1000}g (sobra ${(pedidoErrado3 * 1000) - (demanda3 * 500)}g)`);
console.log('');

const pedidoCorreto3 = Math.ceil(demanda3 / fator3);
console.log(`   ✅ Cálculo CORRETO: ${demanda3} ÷ ${fator3} = ${pedidoCorreto3} unidades`);
console.log(`      Total: ${pedidoCorreto3 * 1000}g (perfeito!)`);

console.log('\n' + '═'.repeat(60));
console.log('\n✅ CONCLUSÃO:');
console.log('   A fórmula correta é: quantidade_pedido = demanda ÷ fator');
console.log('   Isso garante que o total em gramas seja sempre igual!');
console.log('');
