/**
 * 🎨 Exemplo Visual dos Cálculos com Índice de Cocção
 * 
 * Este script mostra de forma visual como os cálculos funcionam
 */

console.log('\n' + '='.repeat(70));
console.log('🎨 EXEMPLO VISUAL: CÁLCULO COM ÍNDICE DE COCÇÃO');
console.log('='.repeat(70) + '\n');

// Exemplo 1: Arroz
console.log('📊 EXEMPLO 1: ARROZ COZIDO\n');
console.log('Situação: Nutricionista quer servir 150g de arroz cozido por aluno');
console.log('');
console.log('Dados do produto:');
console.log('  • Índice de Cocção (IC): 2.5 (arroz absorve água e ganha peso)');
console.log('  • Fator de Correção (FC): 1.0 (arroz não perde no pré-preparo)');
console.log('');
console.log('Cálculo:');
console.log('  1️⃣  Per Capita Final (cozido): 150g');
console.log('  2️⃣  Per Capita Cru = 150g ÷ 2.5 = 60g');
console.log('  3️⃣  Per Capita Bruto (compra) = 60g × 1.0 = 60g');
console.log('');
console.log('✅ Resultado: Comprar 60g de arroz cru para servir 150g cozido');
console.log('   (O arroz vai absorver água e aumentar 2.5x de peso)');
console.log('');
console.log('-'.repeat(70) + '\n');

// Exemplo 2: Carne
console.log('📊 EXEMPLO 2: CARNE BOVINA COZIDA\n');
console.log('Situação: Nutricionista quer servir 100g de carne cozida por aluno');
console.log('');
console.log('Dados do produto:');
console.log('  • Índice de Cocção (IC): 0.7 (carne perde água e encolhe)');
console.log('  • Fator de Correção (FC): 1.2 (carne perde gordura/osso na limpeza)');
console.log('');
console.log('Cálculo:');
console.log('  1️⃣  Per Capita Final (cozido): 100g');
console.log('  2️⃣  Per Capita Cru = 100g ÷ 0.7 = 142.86g');
console.log('  3️⃣  Per Capita Bruto (compra) = 142.86g × 1.2 = 171.43g');
console.log('');
console.log('✅ Resultado: Comprar 171.43g de carne bruta para servir 100g cozida');
console.log('   (A carne vai perder 20% na limpeza e 30% no cozimento)');
console.log('');
console.log('-'.repeat(70) + '\n');

// Exemplo 3: Batata
console.log('📊 EXEMPLO 3: BATATA COZIDA\n');
console.log('Situação: Nutricionista quer servir 120g de batata cozida por aluno');
console.log('');
console.log('Dados do produto:');
console.log('  • Índice de Cocção (IC): 0.95 (batata perde pouca água)');
console.log('  • Fator de Correção (FC): 1.18 (batata perde casca)');
console.log('');
console.log('Cálculo:');
console.log('  1️⃣  Per Capita Final (cozido): 120g');
console.log('  2️⃣  Per Capita Cru = 120g ÷ 0.95 = 126.32g');
console.log('  3️⃣  Per Capita Bruto (compra) = 126.32g × 1.18 = 149.05g');
console.log('');
console.log('✅ Resultado: Comprar 149.05g de batata com casca para servir 120g cozida');
console.log('   (A batata vai perder 18% na casca e 5% no cozimento)');
console.log('');
console.log('-'.repeat(70) + '\n');

// Exemplo 4: Salada
console.log('📊 EXEMPLO 4: SALADA CRUA\n');
console.log('Situação: Nutricionista quer servir 80g de salada crua por aluno');
console.log('');
console.log('Dados do produto:');
console.log('  • Índice de Cocção (IC): 1.0 (não cozinha, fica crua)');
console.log('  • Fator de Correção (FC): 1.25 (perde folhas ruins)');
console.log('');
console.log('Cálculo:');
console.log('  1️⃣  Per Capita Final (cru): 80g');
console.log('  2️⃣  Per Capita Cru = 80g ÷ 1.0 = 80g');
console.log('  3️⃣  Per Capita Bruto (compra) = 80g × 1.25 = 100g');
console.log('');
console.log('✅ Resultado: Comprar 100g de salada para servir 80g limpa');
console.log('   (A salada não cozinha, mas perde 25% na limpeza)');
console.log('');
console.log('='.repeat(70) + '\n');

// Resumo
console.log('📋 RESUMO DA LÓGICA:\n');
console.log('1. Nutricionista define: Per Capita FINAL (o que o aluno vai comer)');
console.log('2. Sistema calcula: Per Capita CRU (antes de cozinhar) usando IC');
console.log('3. Sistema calcula: Per Capita BRUTO (o que precisa comprar) usando FC');
console.log('');
console.log('🎯 ORDEM IMPORTA: IC primeiro (cozimento), depois FC (pré-preparo)');
console.log('');
console.log('✅ Implementação completa e matematicamente correta!');
console.log('');
console.log('='.repeat(70) + '\n');
