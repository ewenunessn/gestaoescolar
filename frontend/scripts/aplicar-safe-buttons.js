/**
 * Script para aplicar SafeButton automaticamente em todo o sistema
 * Encontra botões de ações críticas e os substitui por SafeButton
 */

const fs = require('fs');
const path = require('path');

// Padrões de botões que devem ser protegidos
const PADROES_CRITICOS = [
  /onClick.*delete/i,
  /onClick.*excluir/i,
  /onClick.*remover/i,
  /onClick.*salvar/i,
  /onClick.*save/i,
  /onClick.*criar/i,
  /onClick.*create/i,
  /onClick.*atualizar/i,
  /onClick.*update/i,
  /onClick.*enviar/i,
  /onClick.*submit/i,
  /onClick.*confirmar/i,
  /onClick.*confirm/i,
];

// Diretórios para processar
const DIRETORIOS = [
  'src/pages',
  'src/components',
];

let arquivosProcessados = 0;
let botoesEncontrados = 0;
let arquivosModificados = [];

function processarArquivo(caminhoArquivo) {
  const conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
  
  // Verifica se já usa SafeButton
  if (conteudo.includes('SafeButton')) {
    return false;
  }
  
  // Verifica se tem botões críticos
  const temBotaoCritico = PADROES_CRITICOS.some(padrao => padrao.test(conteudo));
  
  if (!temBotaoCritico) {
    return false;
  }
  
  console.log(`\n📄 Processando: ${caminhoArquivo}`);
  
  let novoConteudo = conteudo;
  let modificado = false;
  
  // Adiciona import do SafeButton se não existir
  if (!conteudo.includes("from '../components/SafeButton'") && 
      !conteudo.includes("from './SafeButton'")) {
    
    // Encontra a última linha de import do Material-UI
    const linhasImport = conteudo.split('\n');
    let ultimoImportMUI = -1;
    
    for (let i = 0; i < linhasImport.length; i++) {
      if (linhasImport[i].includes("from '@mui/material'")) {
        ultimoImportMUI = i;
      }
    }
    
    if (ultimoImportMUI !== -1) {
      // Calcula o caminho relativo correto
      const nivelPasta = caminhoArquivo.split('/').length - 2;
      const prefixo = '../'.repeat(nivelPasta);
      
      linhasImport.splice(
        ultimoImportMUI + 1,
        0,
        `import { SafeButton } from '${prefixo}components/SafeButton';`
      );
      
      novoConteudo = linhasImport.join('\n');
      modificado = true;
      console.log('  ✅ Import adicionado');
    }
  }
  
  // Encontra e reporta botões que devem ser atualizados
  const regexButton = /<Button[^>]*onClick[^>]*>/g;
  const matches = novoConteudo.match(regexButton);
  
  if (matches) {
    matches.forEach(match => {
      const temAcaoCritica = PADROES_CRITICOS.some(padrao => padrao.test(match));
      if (temAcaoCritica) {
        botoesEncontrados++;
        console.log(`  🔍 Botão encontrado: ${match.substring(0, 80)}...`);
      }
    });
  }
  
  if (modificado) {
    // Salva o arquivo (comentado por segurança - descomente para aplicar)
    // fs.writeFileSync(caminhoArquivo, novoConteudo, 'utf8');
    arquivosModificados.push(caminhoArquivo);
    return true;
  }
  
  return false;
}

function processarDiretorio(diretorio) {
  const caminhoCompleto = path.join(__dirname, '..', diretorio);
  
  if (!fs.existsSync(caminhoCompleto)) {
    console.log(`⚠️  Diretório não encontrado: ${diretorio}`);
    return;
  }
  
  const arquivos = fs.readdirSync(caminhoCompleto, { withFileTypes: true });
  
  arquivos.forEach(arquivo => {
    const caminhoArquivo = path.join(caminhoCompleto, arquivo.name);
    
    if (arquivo.isDirectory()) {
      // Recursivo
      processarDiretorio(path.join(diretorio, arquivo.name));
    } else if (arquivo.name.endsWith('.tsx') || arquivo.name.endsWith('.ts')) {
      arquivosProcessados++;
      processarArquivo(caminhoArquivo);
    }
  });
}

console.log('🚀 INICIANDO ANÁLISE DO SISTEMA\n');
console.log('Procurando botões críticos que precisam de proteção...\n');

DIRETORIOS.forEach(dir => {
  console.log(`\n📁 Processando diretório: ${dir}`);
  processarDiretorio(dir);
});

console.log('\n' + '='.repeat(70));
console.log('📊 RESUMO DA ANÁLISE\n');
console.log(`Arquivos processados: ${arquivosProcessados}`);
console.log(`Botões críticos encontrados: ${botoesEncontrados}`);
console.log(`Arquivos que precisam de atualização: ${arquivosModificados.length}`);

if (arquivosModificados.length > 0) {
  console.log('\n📝 Arquivos que precisam de atualização:');
  arquivosModificados.forEach(arquivo => {
    console.log(`  - ${arquivo}`);
  });
}

console.log('\n💡 PRÓXIMOS PASSOS:\n');
console.log('1. Revise os botões encontrados acima');
console.log('2. Para cada botão crítico, substitua:');
console.log('   <Button onClick={...}> por <SafeButton onClick={...}>');
console.log('3. Adicione loadingMessage para ações destrutivas');
console.log('4. Teste com internet lenta (DevTools > Network > Slow 3G)');
console.log('\n⚠️  NOTA: Este script apenas ANALISA. Para aplicar automaticamente,');
console.log('   descomente a linha "fs.writeFileSync" no código.\n');
