/**
 * Script para limpar o cache do dashboard
 * Execute: node limpar-cache-dashboard.js
 */

const { cacheService } = require('./dist/utils/cacheService');

async function limparCache() {
  try {
    console.log('🧹 Limpando cache do dashboard...');
    
    // Limpar cache de estatísticas do dashboard
    await cacheService.delete('dashboard:stats');
    console.log('✅ Cache dashboard:stats limpo');
    
    // Limpar cache de escolas
    await cacheService.delete('escolas:list:all');
    console.log('✅ Cache escolas:list:all limpo');
    
    console.log('✨ Cache limpo com sucesso!');
    console.log('💡 As estatísticas agora mostrarão apenas alunos de escolas ativas');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error);
    process.exit(1);
  }
}

limparCache();
