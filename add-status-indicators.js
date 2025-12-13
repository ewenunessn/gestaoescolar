const fs = require('fs');
const path = require('path');

// Lista de todas as páginas que precisam de StatusIndicator
const pagesToUpdate = [
  'SaldoContratos.tsx',
  'SaldoContratosModalidades.tsx', 
  'VisualizacaoEntregas.tsx',
  'ItensFornecedor.tsx',
  'GerenciarAlunosModalidades.tsx',
  'EstoqueEscolar.tsx',
  'EstoqueLotes.tsx',
  'EstoqueMovimentacoes.tsx',
  'EstoqueAlertas.tsx'
];

const frontendPagesDir = './frontend/src/pages';

function addStatusIndicatorImport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Se já tem o import, pula
  if (content.includes('StatusIndicator')) {
    console.log(`✅ ${path.basename(filePath)} já tem StatusIndicator`);
    return;
  }
  
  // Encontra a primeira linha de import do React
  const reactImportMatch = content.match(/^import React.*from ['"]react['"];?\s*$/m);
  if (reactImportMatch) {
    const importLine = reactImportMatch[0];
    const newImportLine = importLine + '\nimport StatusIndicator from "../components/StatusIndicator";';
    content = content.replace(importLine, newImportLine);
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Adicionado import StatusIndicator em ${path.basename(filePath)}`);
  } else {
    console.log(`⚠️ Não encontrou import do React em ${path.basename(filePath)}`);
  }
}

// Adicionar imports em todas as páginas
pagesToUpdate.forEach(fileName => {
  const filePath = path.join(frontendPagesDir, fileName);
  if (fs.existsSync(filePath)) {
    addStatusIndicatorImport(filePath);
  } else {
    console.log(`❌ Arquivo não encontrado: ${fileName}`);
  }
});

console.log('\n🎯 Imports adicionados! Agora você precisa adicionar manualmente as bolinhas nas primeiras colunas das tabelas.');
console.log('Padrão a seguir:');
console.log(`
<TableCell>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <StatusIndicator status={item.status || (item.ativo ? 'ativo' : 'inativo')} size="small" />
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {item.nome}
    </Typography>
  </Box>
</TableCell>
`);