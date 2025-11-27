const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/pedidos/controllers/pedidoController.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Remover todas as linhas com require inline
content = content.replace(/    const \{ setTenantContextFromRequest \} = require\("\.\.\/\.\.\/\.\.\/utils\/tenantContext"\);\n/g, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Removidos todos os require inline do pedidoController.ts');
