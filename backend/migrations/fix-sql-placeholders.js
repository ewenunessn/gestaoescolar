const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'modules', 'usuarios', 'controllers', 'adminUsuariosController.ts');

let content = fs.readFileSync(filePath, 'utf8');

// Corrigir placeholders SQL na função atualizarUsuario
content = content.replace(
  /if \(nome !== undefined\) { sets\.push\(`nome = \${idx\+\+}`\); values\.push\(nome\); }/g,
  'if (nome !== undefined) { sets.push(`nome = $${idx++}`); values.push(nome); }'
);

content = content.replace(
  /if \(email !== undefined\) { sets\.push\(`email = \${idx\+\+}`\); values\.push\(email\); }/g,
  'if (email !== undefined) { sets.push(`email = $${idx++}`); values.push(email); }'
);

content = content.replace(
  /if \(tipo !== undefined\) { sets\.push\(`tipo = \${idx\+\+}`\); values\.push\(tipo\); }/g,
  'if (tipo !== undefined) { sets.push(`tipo = $${idx++}`); values.push(tipo); }'
);

content = content.replace(
  /if \(funcao_id !== undefined\) { sets\.push\(`funcao_id = \${idx\+\+}`\); values\.push\(funcao_id \|\| null\); }/g,
  'if (funcao_id !== undefined) { sets.push(`funcao_id = $${idx++}`); values.push(funcao_id || null); }'
);

content = content.replace(
  /if \(ativo !== undefined\) { sets\.push\(`ativo = \${idx\+\+}`\); values\.push\(ativo\); }/g,
  'if (ativo !== undefined) { sets.push(`ativo = $${idx++}`); values.push(ativo); }'
);

content = content.replace(
  /if \(escola_id !== undefined\) { sets\.push\(`escola_id = \${idx\+\+}`\); values\.push\(escola_id \|\| null\); }/g,
  'if (escola_id !== undefined) { sets.push(`escola_id = $${idx++}`); values.push(escola_id || null); }'
);

content = content.replace(
  /if \(tipo_secretaria !== undefined\) { sets\.push\(`tipo_secretaria = \${idx\+\+}`\); values\.push\(tipo_secretaria\); }/g,
  'if (tipo_secretaria !== undefined) { sets.push(`tipo_secretaria = $${idx++}`); values.push(tipo_secretaria); }'
);

content = content.replace(
  /if \(senha\) { sets\.push\(`senha = \${idx\+\+}`\); values\.push\(await bcrypt\.hash\(senha, 10\)\); }/g,
  'if (senha) { sets.push(`senha = $${idx++}`); values.push(await bcrypt.hash(senha, 10)); }'
);

content = content.replace(
  /WHERE id = \${idx}/g,
  'WHERE id = $${idx}'
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Placeholders SQL corrigidos com sucesso!');
