const fs = require('fs');
const path = require('path');

// Procurar por queries que usam apenas ID sem tenant_id
function findInsecureQueries(dir, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules')) {
        findInsecureQueries(filePath, results);
      }
    } else if (file.endsWith('Controller.ts') || file.endsWith('Controller.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Procurar por queries SELECT/UPDATE/DELETE que usam WHERE id = $1 mas não tenant_id
      const patterns = [
        /WHERE\s+id\s*=\s*\$1(?!\s+AND\s+tenant_id)/gi,
        /WHERE\s+id\s*=\s*\$1\s*$/gmi,
        /WHERE\s+id\s*=\s*\$1\s*\)/gmi,
      ];
      
      let hasIssue = false;
      let issues = [];
      
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          hasIssue = true;
          issues.push(...matches);
        }
      }
      
      if (hasIssue) {
        // Verificar se o arquivo tem setTenantContextFromRequest (indica que deveria validar tenant)
        const hasTenantContext = content.includes('setTenantContextFromRequest');
        
        if (hasTenantContext) {
          results.push({
            file: filePath.replace(process.cwd(), ''),
            issues: [...new Set(issues)],
            severity: 'HIGH'
          });
        }
      }
    }
  }
  
  return results;
}

console.log('🔍 Procurando queries inseguras (sem validação de tenant)...\n');

const backendDir = path.join(process.cwd(), 'backend', 'src');
const results = findInsecureQueries(backendDir);

if (results.length === 0) {
  console.log('✅ Nenhuma query insegura encontrada!\n');
} else {
  console.log(`⚠️ Encontradas ${results.length} arquivo(s) com possíveis problemas:\n`);
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.file}`);
    console.log(`   Severidade: ${result.severity}`);
    console.log(`   Problemas encontrados:`);
    result.issues.forEach(issue => {
      console.log(`   - ${issue.trim()}`);
    });
    console.log('');
  });
  
  console.log('💡 Recomendação: Adicionar "AND tenant_id = $X" em todas essas queries\n');
}
