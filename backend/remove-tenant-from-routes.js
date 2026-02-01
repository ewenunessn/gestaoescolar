const fs = require('fs');
const path = require('path');

// Lista de arquivos de rotas que precisam ser atualizados
const routeFiles = [
  'src/modules/pedidos/routes/pedidoRoutes.ts',
  'src/modules/produtos/routes/produtoRoutes.ts',
  'src/modules/pedidos/routes/faturamentoRoutes.ts',
  'src/modules/contratos/routes/saldoContratosModalidadesRoutes.ts',
  'src/modules/contratos/routes/contratoRoutes.ts',
  'src/modules/estoque/routes/estoqueEscolaRoutes.ts',
  'src/modules/cardapios/routes/refeicaoProdutoRoutes.ts',
  'src/modules/cardapios/routes/refeicaoRoutes.ts',
  'src/modules/cardapios/routes/modalidadeRoutes.ts',
  'src/modules/cardapios/routes/cardapioRoutes.ts',
  'src/routes/configuracaoRoutes.ts'
];

function removeTenantFromRoutes() {
  console.log('🔄 Removendo referências de tenant das rotas...');
  
  routeFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
      return;
    }
    
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remover import do requireTenant
      content = content.replace(/import\s*{\s*[^}]*requireTenant[^}]*}\s*from\s*["'][^"']*tenantMiddleware["'];\s*\n?/g, '');
      
      // Remover uso do requireTenant
      content = content.replace(/router\.use\(requireTenant\(\)\);\s*\n?/g, '');
      content = content.replace(/\/\/\s*Aplicar middleware de tenant para todas as rotas\s*\n?/g, '');
      
      // Remover requireTenant de rotas específicas
      content = content.replace(/requireTenant\(\),?\s*/g, '');
      
      // Limpar linhas vazias extras
      content = content.replace(/\n\n\n+/g, '\n\n');
      
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Atualizado: ${filePath}`);
      
    } catch (error) {
      console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    }
  });
  
  console.log('✅ Remoção de tenant das rotas concluída!');
}

removeTenantFromRoutes();