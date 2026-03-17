const fs = require('fs');
const path = require('path');

// Arquivos que usam useNotification e precisam ser migrados
const arquivosParaMigrar = [
  'src/pages/CardapiosModalidade.tsx',
  'src/pages/Romaneio.tsx',
  'src/pages/ConfiguracaoInstituicao.tsx'
];

function migrarArquivo(caminhoArquivo) {
  try {
    console.log(`Migrando: ${caminhoArquivo}`);
    
    let conteudo = fs.readFileSync(caminhoArquivo, 'utf8');
    
    // Substituir import
    conteudo = conteudo.replace(
      /import\s*{\s*useNotification\s*}\s*from\s*['"][^'"]*NotificationContext['"];?/g,
      "import { useToast } from '../hooks/useToast';"
    );
    
    // Substituir uso do hook
    conteudo = conteudo.replace(
      /const\s*{\s*success,\s*error(?:\s*:\s*\w+)?\s*}\s*=\s*useNotification\(\);?/g,
      "const toast = useToast();"
    );
    
    // Substituir chamadas success()
    conteudo = conteudo.replace(/\bsuccess\(/g, 'toast.success(');
    
    // Substituir chamadas error() - cuidado com variáveis que podem ter o nome error
    conteudo = conteudo.replace(/\berror\(/g, 'toast.error(');
    
    // Substituir showError() se existir
    conteudo = conteudo.replace(/\bshowError\(/g, 'toast.error(');
    
    // Escrever arquivo modificado
    fs.writeFileSync(caminhoArquivo, conteudo, 'utf8');
    
    console.log(`✅ Migrado: ${caminhoArquivo}`);
    
  } catch (error) {
    console.error(`❌ Erro ao migrar ${caminhoArquivo}:`, error.message);
  }
}

function main() {
  console.log('🚀 Iniciando migração de notificações para react-toastify...\n');
  
  arquivosParaMigrar.forEach(arquivo => {
    if (fs.existsSync(arquivo)) {
      migrarArquivo(arquivo);
    } else {
      console.log(`⚠️  Arquivo não encontrado: ${arquivo}`);
    }
  });
  
  console.log('\n✨ Migração concluída!');
  console.log('\n📋 Próximos passos manuais:');
  console.log('1. Verificar se todas as chamadas foram migradas corretamente');
  console.log('2. Testar as notificações em cada página migrada');
  console.log('3. Remover imports não utilizados se necessário');
}

main();