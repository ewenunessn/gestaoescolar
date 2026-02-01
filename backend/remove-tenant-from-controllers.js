const fs = require('fs');
const path = require('path');

function findControllerFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findControllerFiles(fullPath, files);
    } else if (item.endsWith('Controller.ts') || item.endsWith('controller.ts')) {
      files.push(path.relative(__dirname, fullPath));
    }
  }
  
  return files;
}

function removeTenantFromControllers() {
  console.log('🔄 Removendo referências de tenant dos controllers...');
  
  const controllerFiles = findControllerFiles(path.join(__dirname, 'src'));
  
  if (controllerFiles.length === 0) {
    console.log('❌ Nenhum arquivo controller encontrado');
    return;
  }
  
  console.log(`📋 Encontrados ${controllerFiles.length} controllers`);
  
  controllerFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;
      
      // Remover imports relacionados a tenant
      content = content.replace(/import\s*{\s*[^}]*setTenantContextFromRequest[^}]*}\s*from\s*["'][^"']*tenantContext["'];\s*\n?/g, '');
      content = content.replace(/import\s*{\s*[^}]*tenantContext[^}]*}\s*from\s*["'][^"']*tenantContext["'];\s*\n?/g, '');
      content = content.replace(/import\s*{\s*[^}]*requireTenant[^}]*}\s*from\s*["'][^"']*tenantMiddleware["'];\s*\n?/g, '');
      
      // Remover chamadas setTenantContextFromRequest
      content = content.replace(/await\s+setTenantContextFromRequest\(req\);\s*\n?/g, '');
      content = content.replace(/setTenantContextFromRequest\(req\);\s*\n?/g, '');
      
      // Remover comentários sobre tenant
      content = content.replace(/\/\/\s*Configurar contexto de tenant\s*\n?/g, '');
      content = content.replace(/\/\/\s*Validar se tenant está presente\s*\n?/g, '');
      
      // Remover validações de tenant (versão mais simples)
      content = content.replace(/if\s*\(\s*!req\.tenant\?\.id\s*\)\s*{[^}]*}\s*\n?/g, '');
      
      // Remover WHERE clauses com tenant_id
      content = content.replace(/WHERE\s+[^=]*\.tenant_id\s*=\s*current_setting\([^)]+\)[^A-Z]*ORDER/g, 'ORDER');
      content = content.replace(/WHERE\s+[^=]*\.tenant_id\s*=\s*current_setting\([^)]+\)[^A-Z]*GROUP/g, 'GROUP');
      content = content.replace(/WHERE\s+[^=]*\.tenant_id\s*=\s*current_setting\([^)]+\)[^A-Z]*LIMIT/g, 'LIMIT');
      content = content.replace(/WHERE\s+[^=]*\.tenant_id\s*=\s*current_setting\([^)]+\)[^A-Z]*$/gm, '');
      
      // Remover tenant_id de INSERTs
      content = content.replace(/,\s*tenant_id/g, '');
      content = content.replace(/tenant_id,\s*/g, '');
      
      // Remover parâmetros tenant_id
      content = content.replace(/,\s*req\.tenant\.id/g, '');
      content = content.replace(/req\.tenant\.id,\s*/g, '');
      content = content.replace(/,\s*tenantId/g, '');
      content = content.replace(/tenantId,\s*/g, '');
      
      // Limpar linhas vazias extras
      content = content.replace(/\n\n\n+/g, '\n\n');
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Atualizado: ${filePath}`);
      } else {
        console.log(`⚪ Sem alterações: ${filePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    }
  });
  
  console.log('✅ Remoção de tenant dos controllers concluída!');
}

removeTenantFromControllers();