const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/pedidos/controllers/pedidoController.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Substituir todas as verificações de req.tenant?.id por uma que também busca do header
content = content.replace(
  /\/\/ Validar se tenant está presente\s+if \(!req\.tenant\?\.id\) \{/g,
  `// Obter tenant_id do req.tenant ou do header
    const tenantId = req.tenant?.id || req.get('X-Tenant-ID') || req.headers['x-tenant-id'];
    
    // Validar se tenant está presente
    if (!tenantId) {`
);

// Substituir todas as referências a req.tenant.id por tenantId nas queries
content = content.replace(/req\.tenant\.id/g, 'tenantId');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Corrigidas todas as verificações de tenant no pedidoController.ts');
