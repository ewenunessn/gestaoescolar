const fs = require('fs-extra');
const path = require('path');

const source = path.join(__dirname, '..', 'frontend', 'dist');
const destination = path.join(__dirname, 'frontend', 'dist');

console.log('📦 Copiando frontend para electron...');
console.log('De:', source);
console.log('Para:', destination);

// Remover pasta antiga se existir
if (fs.existsSync(destination)) {
  console.log('🗑️  Removendo pasta antiga...');
  fs.removeSync(destination);
}

// Copiar arquivos
try {
  fs.copySync(source, destination);
  console.log('✅ Frontend copiado com sucesso!');
} catch (error) {
  console.error('❌ Erro ao copiar frontend:', error);
  process.exit(1);
}
