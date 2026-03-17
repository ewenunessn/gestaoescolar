/**
 * Script para aplicar LoadingOverlay automaticamente em TODAS as páginas
 * Adiciona imports e overlay global baseado em mutations
 */

const fs = require('fs');
const path = require('path');

let arquivosModificados = 0;
let arquivosProcessados = 0;

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.tsx')) {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

function processarArquivo(caminhoArquivo) {
  let conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
  let modificado = false;
  
  // Verifica se já tem LoadingOverlay
  if (conteudo.includes('LoadingOverlay')) {
    console.log(`⏭️  Pulando ${path.basename(caminhoArquivo)} - já tem LoadingOverlay`);
    return false;
  }
  
  // Verifica se usa mutations do React Query
  const usaMutations = /use\w+Mutation/g.test(conteudo);
  if (!usaMutations) {
    return false;
  }
  
  console.log(`\n📝 Processando: ${path.basename(caminhoArquivo)}`);
  
  // 1. Adicionar import do LoadingOverlay
  if (!conteudo.includes("from '../components/LoadingOverlay'")) {
    const linhas = conteudo.split('\n');
    let ultimoImport = -1;
    
    // Encontra último import
    for (let i = 0; i < linhas.length; i++) {
      if (linhas[i].trim().startsWith('import ')) {
        ultimoImport = i;
      }
    }
    
    if (ultimoImport !== -1) {
      linhas.splice(ultimoImport + 1, 0, "import { LoadingOverlay } from '../components/LoadingOverlay';");
      conteudo = linhas.join('\n');
      modificado = true;
      console.log('  ✅ Import adicionado');
    }
  }
  
  // 2. Encontrar todas as mutations
  const mutationRegex = /const\s+(\w+)\s*=\s*use\w+Mutation/g;
  const mutations = [];
  let match;
  
  while ((match = mutationRegex.exec(conteudo)) !== null) {
    mutations.push(match[1]);
  }
  
  if (mutations.length > 0) {
    console.log(`  🔍 Encontradas ${mutations.length} mutations:`, mutations.join(', '));
    
    // 3. Adicionar LoadingOverlay antes do fechamento do componente
    const padroes = [
      /(  <\/PageContainer>\s*\);?\s*};?\s*export default)/,
      /(  <\/Box>\s*\);?\s*};?\s*export default)/,
      /(  <\/>\s*\);?\s*};?\s*export default)/,
      /(  <\/div>\s*\);?\s*};?\s*export default)/,
    ];
    
    let overlayAdicionado = false;
    for (const padrao of padroes) {
      if (padrao.test(conteudo)) {
        const isPendingChecks = mutations.map(m => `${m}.isPending`).join(' ||\n          ');
        
        const overlayCode = `
      <LoadingOverlay 
        open={
          ${isPendingChecks}
        }
        message="Processando..."
      />
`;
        
        conteudo = conteudo.replace(padrao, `${overlayCode}$1`);
        modificado = true;
        overlayAdicionado = true;
        console.log('  ✅ LoadingOverlay adicionado');
        break;
      }
    }
    
    if (!overlayAdicionado) {
      console.log('  ⚠️  Não foi possível adicionar overlay automaticamente');
    }
  }
  
  if (modificado) {
    fs.writeFileSync(caminhoArquivo, conteudo, 'utf8');
    arquivosModificados++;
    console.log('  💾 Arquivo salvo');
    return true;
  }
  
  return false;
}

// Processa todos os arquivos .tsx em src/pages
const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const arquivos = getAllFiles(pagesDir);

console.log('🚀 APLICANDO LOADING OVERLAY EM TODO O SISTEMA\n');
console.log(`📁 Encontrados ${arquivos.length} arquivos para processar\n`);

arquivos.forEach(arquivo => {
  arquivosProcessados++;
  processarArquivo(arquivo);
});

console.log('\n' + '='.repeat(70));
console.log('📊 RESUMO\n');
console.log(`Arquivos processados: ${arquivosProcessados}`);
console.log(`Arquivos modificados: ${arquivosModificados}`);
console.log(`\n✅ CONCLUÍDO!`);
console.log('\n💡 PRÓXIMOS PASSOS:');
console.log('1. Revisar os arquivos modificados');
console.log('2. Testar cada página');
console.log('3. Commit das alterações\n');
