const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/demandas/models/demandaModel.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Substituir todos os placeholders SQL incorretos
// De: ${paramCount} para: $${paramCount}
// Mas apenas dentro de strings SQL (após query +=)

content = content.replace(/query \+= `([^`]*)\$\{paramCount\}/g, 'query += `$1$${paramCount}');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Corrigidos todos os placeholders SQL no demandaModel.ts');
