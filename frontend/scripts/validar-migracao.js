#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Script para validar se a migração para react-toastify foi completa
 * Detecta variáveis não definidas e padrões antigos
 */

const PADROES_ANTIGOS = [
  // Variáveis de estado antigas
  { pattern: /\bsetSuccessMessage\b/, message: 'setSuccessMessage ainda sendo usado' },
  { pattern: /\bsetError\b(?!\w)/, message: 'setError ainda sendo usado (pode ser válido se for de React Query)' },
  { pattern: /\bsuccessMessage\b(?!\w)/, message: 'successMessage ainda sendo usado' },
  
  // Padrões de JSX antigos
  { pattern: /{successMessage\s*&&/, message: 'Renderização condicional de successMessage' },
  { pattern: /{error\s*&&/, message: 'Renderização condicional de error (verificar se não é de React Query)' },
  { pattern: /Alert.*onClose.*setSuccessMessage/, message: 'Alert com setSuccessMessage no onClose' },
  { pattern: /Alert.*onClose.*setError/, message: 'Alert com setError no onClose' },
  
  // Estados antigos
  { pattern: /useState.*successMessage/, message: 'Estado successMessage ainda definido' },
  { pattern: /useState.*error.*null/, message: 'Estado error ainda definido (verificar contexto)' },
  
  // Imports antigos
  { pattern: /from.*NotificationContext/, message: 'Import do NotificationContext antigo' },
  { pattern: /useNotification/, message: 'Hook useNotification antigo ainda sendo usado' },
];

const PADROES_CORRETOS = [
  { pattern: /toast\.(success|error|info|warning)/, message: 'Usando react-toastify corretamente' },
  { pattern: /useToast\(\)/, message: 'Usando hook useToast' },
];

function analisarArquivo(filePath) {
  const conteudo = fs.readFileSync(filePath, 'utf8');
  const linhas = conteudo.split('\n');
  const problemas = [];
  const acertos = [];

  linhas.forEach((linha, index) => {
    const numeroLinha = index + 1;
    
    // Verificar padrões antigos
    PADROES_ANTIGOS.forEach(({ pattern, message }) => {
      if (pattern.test(linha)) {
        problemas.push({
          linha: numeroLinha,
          conteudo: linha.trim(),
          problema: message,
          tipo: 'ERRO'
        });
      }
    });
    
    // Verificar padrões corretos
    PADROES_CORRETOS.forEach(({ pattern, message }) => {
      if (pattern.test(linha)) {
        acertos.push({
          linha: numeroLinha,
          conteudo: linha.trim(),
          acerto: message,
          tipo: 'OK'
        });
      }
    });
  });

  return { problemas, acertos };
}

function validarMigracao() {
  console.log('🔍 Validando migração para react-toastify...\n');
  
  // Buscar todos os arquivos .tsx no src
  const arquivos = glob.sync('src/**/*.tsx', { cwd: __dirname + '/..' });
  
  let totalProblemas = 0;
  let totalAcertos = 0;
  let arquivosComProblemas = 0;
  
  arquivos.forEach(arquivo => {
    const caminhoCompleto = path.join(__dirname, '..', arquivo);
    const { problemas, acertos } = analisarArquivo(caminhoCompleto);
    
    if (problemas.length > 0) {
      arquivosComProblemas++;
      console.log(`❌ ${arquivo}:`);
      problemas.forEach(p => {
        console.log(`   Linha ${p.linha}: ${p.problema}`);
        console.log(`   Código: ${p.conteudo}`);
      });
      console.log('');
    }
    
    totalProblemas += problemas.length;
    totalAcertos += acertos.length;
  });
  
  // Resumo
  console.log('📊 RESUMO DA VALIDAÇÃO:');
  console.log(`   Arquivos analisados: ${arquivos.length}`);
  console.log(`   Arquivos com problemas: ${arquivosComProblemas}`);
  console.log(`   Total de problemas: ${totalProblemas}`);
  console.log(`   Padrões corretos encontrados: ${totalAcertos}`);
  
  if (totalProblemas === 0) {
    console.log('\n✅ Migração completa! Nenhum problema encontrado.');
    return true;
  } else {
    console.log('\n⚠️  Migração incompleta. Corrija os problemas acima.');
    return false;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const sucesso = validarMigracao();
  process.exit(sucesso ? 0 : 1);
}

module.exports = { validarMigracao, analisarArquivo };