const fs = require('fs');
const path = require('path');

// Lista de controllers e funções a corrigir
const fixes = [
  {
    file: 'backend/src/modules/cardapios/controllers/cardapioController.ts',
    functions: ['buscarCardapio', 'editarCardapio', 'removerCardapio']
  },
  {
    file: 'backend/src/modules/contratos/controllers/contratoController.ts',
    functions: ['buscarContrato', 'editarContrato', 'removerContrato']
  },
  {
    file: 'backend/src/modules/contratos/controllers/fornecedorController.ts',
    functions: ['buscarFornecedor', 'editarFornecedor', 'removerFornecedor']
  }
];

console.log('🔧 Iniciando correção automática de segurança...\n');

let totalFixed = 0;

for (const fix of fixes) {
  const filePath = path.join(process.cwd(), fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Arquivo não encontrado: ${fix.file}`);
    continue;
  }
  
  console.log(`📝 Processando: ${fix.file}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Padrão 1: WHERE id = $1 sem tenant_id (SELECT)
  const pattern1 = /WHERE id = \$1(?!\s+AND\s+tenant_id)/g;
  if (content.match(pattern1)) {
    content = content.replace(pattern1, 'WHERE id = $1 AND tenant_id = $2');
    modified = true;
    console.log('   ✅ Corrigido: SELECT com tenant_id');
  }
  
  // Padrão 2: WHERE id = $X sem tenant_id (UPDATE/DELETE com múltiplos params)
  // Procurar por UPDATE/DELETE seguido de WHERE id = $N
  const updatePattern = /(UPDATE\s+\w+\s+SET[\s\S]*?WHERE\s+id\s*=\s*\$)(\d+)(?!\s+AND\s+tenant_id)/gi;
  const matches = [...content.matchAll(updatePattern)];
  
  if (matches.length > 0) {
    for (const match of matches) {
      const paramNum = parseInt(match[2]);
      const newParamNum = paramNum + 1;
      const oldText = match[0];
      const newText = oldText.replace(
        new RegExp(`WHERE\\s+id\\s*=\\s*\\$${paramNum}`, 'i'),
        `WHERE id = $${paramNum} AND tenant_id = $${newParamNum}`
      );
      content = content.replace(oldText, newText);
      modified = true;
      console.log(`   ✅ Corrigido: UPDATE/DELETE com tenant_id (param $${newParamNum})`);
    }
  }
  
  // Adicionar validação de tenant no início das funções se não existir
  for (const funcName of fix.functions) {
    const funcPattern = new RegExp(`export async function ${funcName}\\([^)]+\\)[^{]*{([^}]*?)const.*?id.*?=.*?req\\.params`, 's');
    const funcMatch = content.match(funcPattern);
    
    if (funcMatch && !funcMatch[1].includes('setTenantContextFromRequest')) {
      const tenantValidation = `
    // Configurar contexto de tenant
    await setTenantContextFromRequest(req);
    
    // Validar se tenant está presente
    if (!req.tenant?.id) {
      return res.status(400).json({
        success: false,
        message: "Contexto de tenant não encontrado"
      });
    }
    `;
      
      // Inserir após a declaração da função
      const insertPoint = content.indexOf('{', content.indexOf(`export async function ${funcName}`)) + 1;
      content = content.slice(0, insertPoint) + tenantValidation + content.slice(insertPoint);
      modified = true;
      console.log(`   ✅ Adicionada validação de tenant em ${funcName}()`);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   💾 Arquivo salvo\n`);
    totalFixed++;
  } else {
    console.log(`   ℹ️ Nenhuma alteração necessária\n`);
  }
}

console.log(`\n✅ Processo concluído!`);
console.log(`📊 Total de arquivos modificados: ${totalFixed}/${fixes.length}\n`);
