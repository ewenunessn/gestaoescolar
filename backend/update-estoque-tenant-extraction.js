/**
 * Script para atualizar a extração de tenant no controller de estoque-escola
 * Substitui tenantInventoryValidator.extractTenantFromRequest por getTenantIdFromUser
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/estoque/controllers/estoqueEscolaController.ts');

try {
  console.log('📝 Atualizando extração de tenant...\n');

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Contar ocorrências antes
  const beforeCount = (content.match(/tenantInventoryValidator\.extractTenantFromRequest\(req\)/g) || []).length;
  console.log(`🔍 Encontradas ${beforeCount} ocorrências de tenantInventoryValidator.extractTenantFromRequest`);

  // Substituir todas as ocorrências
  content = content.replace(
    /\/\/ Extrair e validar tenant da requisição\s+const tenantId = tenantInventoryValidator\.extractTenantFromRequest\(req\);/g,
    `// Extrair tenant do usuário logado (via token JWT)
    const tenantId = getTenantIdFromUser(req);
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'Tenant ID não encontrado. Faça login novamente.'
      });
    }`
  );

  // Contar ocorrências depois
  const afterCount = (content.match(/tenantInventoryValidator\.extractTenantFromRequest\(req\)/g) || []).length;
  
  // Salvar arquivo
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`✅ Substituídas ${beforeCount - afterCount} ocorrências`);
  console.log(`📊 Ocorrências restantes: ${afterCount}`);
  
  if (afterCount === 0) {
    console.log('\n✅ Todas as ocorrências foram substituídas com sucesso!');
  } else {
    console.log('\n⚠️  Ainda há ocorrências que precisam ser verificadas manualmente');
  }

} catch (error) {
  console.error('❌ Erro:', error.message);
}
