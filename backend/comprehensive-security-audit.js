const fs = require('fs');
const path = require('path');

// Padrões de queries inseguras
const INSECURE_PATTERNS = [
  // SELECT sem tenant_id
  { pattern: /SELECT\s+.*\s+FROM\s+\w+\s+WHERE\s+id\s*=\s*\$\d+(?!\s+AND\s+tenant_id)/gi, type: 'SELECT', severity: 'CRITICAL' },
  // UPDATE sem tenant_id
  { pattern: /UPDATE\s+\w+\s+SET\s+.*\s+WHERE\s+id\s*=\s*\$\d+(?!\s+AND\s+tenant_id)/gi, type: 'UPDATE', severity: 'CRITICAL' },
  // DELETE sem tenant_id
  { pattern: /DELETE\s+FROM\s+\w+\s+WHERE\s+id\s*=\s*\$\d+(?!\s+AND\s+tenant_id)/gi, type: 'DELETE', severity: 'CRITICAL' },
  // WHERE id = $X sem AND tenant_id (genérico)
  { pattern: /WHERE\s+id\s*=\s*\$\d+\s*(?:RETURNING|\)|$)/gmi, type: 'GENERIC', severity: 'HIGH' },
];

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Verificar se o arquivo usa tenant (tem setTenantContextFromRequest ou tenant_id)
  const usesTenant = content.includes('setTenantContextFromRequest') || 
                     content.includes('tenant_id') ||
                     content.includes('current_setting');
  
  if (!usesTenant) {
    return null; // Arquivo não usa tenant, não precisa verificar
  }
  
  // Procurar por cada padrão inseguro
  for (const { pattern, type, severity } of INSECURE_PATTERNS) {
    const matches = [...content.matchAll(pattern)];
    
    for (const match of matches) {
      const matchText = match[0];
      
      // Verificar se já tem tenant_id na mesma linha ou próximas
      const startPos = match.index;
      const contextStart = Math.max(0, startPos - 200);
      const contextEnd = Math.min(content.length, startPos + matchText.length + 200);
      const context = content.substring(contextStart, contextEnd);
      
      // Se já tem tenant_id no contexto, não é inseguro
      if (context.includes('tenant_id') || context.includes('current_setting')) {
        continue;
      }
      
      // Encontrar número da linha
      const beforeMatch = content.substring(0, startPos);
      const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
      
      issues.push({
        type,
        severity,
        line: lineNumber,
        code: matchText.trim(),
        context: context.trim()
      });
    }
  }
  
  return issues.length > 0 ? issues : null;
}

function scanDirectory(dir, results = {}) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.git')) {
        scanDirectory(filePath, results);
      }
    } else if (file.endsWith('Controller.ts') || file.endsWith('Controller.js')) {
      const issues = analyzeFile(filePath);
      if (issues) {
        results[filePath.replace(process.cwd(), '')] = issues;
      }
    }
  }
  
  return results;
}

console.log('🔒 AUDITORIA COMPLETA DE SEGURANÇA - ISOLAMENTO DE TENANT\n');
console.log('═'.repeat(70));
console.log('\n🔍 Analisando todos os controllers...\n');

const backendDir = path.join(process.cwd(), 'backend', 'src');
const results = scanDirectory(backendDir);

const totalFiles = Object.keys(results).length;
const totalIssues = Object.values(results).reduce((sum, issues) => sum + issues.length, 0);

if (totalFiles === 0) {
  console.log('✅ NENHUM PROBLEMA ENCONTRADO!\n');
  console.log('Todos os controllers estão seguros.\n');
} else {
  console.log(`⚠️  ENCONTRADOS ${totalIssues} PROBLEMAS EM ${totalFiles} ARQUIVO(S)\n`);
  console.log('═'.repeat(70));
  
  // Agrupar por severidade
  const critical = [];
  const high = [];
  
  Object.entries(results).forEach(([file, issues]) => {
    issues.forEach(issue => {
      const item = { file, ...issue };
      if (issue.severity === 'CRITICAL') {
        critical.push(item);
      } else {
        high.push(item);
      }
    });
  });
  
  // Mostrar problemas críticos
  if (critical.length > 0) {
    console.log(`\n🚨 CRÍTICO (${critical.length} problemas):\n`);
    critical.forEach((item, index) => {
      console.log(`${index + 1}. ${item.file}`);
      console.log(`   Linha: ${item.line}`);
      console.log(`   Tipo: ${item.type}`);
      console.log(`   Código: ${item.code.substring(0, 80)}...`);
      console.log('');
    });
  }
  
  // Mostrar problemas de alta severidade
  if (high.length > 0) {
    console.log(`\n⚠️  ALTA SEVERIDADE (${high.length} problemas):\n`);
    high.forEach((item, index) => {
      console.log(`${index + 1}. ${item.file}`);
      console.log(`   Linha: ${item.line}`);
      console.log(`   Tipo: ${item.type}`);
      console.log(`   Código: ${item.code.substring(0, 80)}...`);
      console.log('');
    });
  }
  
  console.log('═'.repeat(70));
  console.log('\n📋 RESUMO POR ARQUIVO:\n');
  
  Object.entries(results).forEach(([file, issues]) => {
    const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
    const highCount = issues.filter(i => i.severity === 'HIGH').length;
    
    console.log(`${file}`);
    console.log(`   🚨 Crítico: ${criticalCount} | ⚠️  Alto: ${highCount}`);
    console.log('');
  });
  
  console.log('═'.repeat(70));
  console.log('\n💡 RECOMENDAÇÕES:\n');
  console.log('1. Adicionar "AND tenant_id = $X" em todas as queries WHERE id = $Y');
  console.log('2. Adicionar validação: if (!req.tenant?.id) return 400');
  console.log('3. Usar setTenantContextFromRequest() no início de cada função');
  console.log('4. Testar acesso cross-tenant após correções\n');
}

// Salvar relatório em arquivo
const report = {
  timestamp: new Date().toISOString(),
  totalFiles,
  totalIssues,
  results
};

fs.writeFileSync(
  path.join(process.cwd(), 'backend', 'SECURITY_AUDIT_REPORT.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Relatório detalhado salvo em: backend/SECURITY_AUDIT_REPORT.json\n');
