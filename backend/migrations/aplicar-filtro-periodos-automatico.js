/**
 * Script para aplicar filtro de períodos ocultos automaticamente
 * Modifica os controllers para adicionar JOIN e WHERE
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Aplicando filtros de períodos ocultos nos controllers...\n');

// 1. Controller de Compras (Pedidos)
const compraControllerPath = path.join(__dirname, '../src/modules/compras/controllers/compraController.ts');

if (fs.existsSync(compraControllerPath)) {
  let content = fs.readFileSync(compraControllerPath, 'utf8');
  
  // Adicionar JOIN com períodos na query principal
  content = content.replace(
    /LEFT JOIN fornecedores f ON c\.fornecedor_id = f\.id\s+WHERE/g,
    `LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
      LEFT JOIN periodos per ON p.periodo_id = per.id
      WHERE`
  );
  
  // Adicionar condição WHERE na query principal
  content = content.replace(
    /WHERE \$\{whereClause\}\s+GROUP BY p\.id/g,
    `WHERE \${whereClause}
        AND (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
      GROUP BY p.id`
  );
  
  // Adicionar JOIN e WHERE na query de contagem
  content = content.replace(
    /FROM pedidos p\s+WHERE \$\{whereClause\}\s+\`, params\.slice/g,
    `FROM pedidos p
      LEFT JOIN periodos per ON p.periodo_id = per.id
      WHERE \${whereClause}
        AND (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
    \`, params.slice`
  );
  
  fs.writeFileSync(compraControllerPath, content, 'utf8');
  console.log('✅ Controller de Compras atualizado');
} else {
  console.log('⚠️  Controller de Compras não encontrado');
}

// 2. Buscar e atualizar controller de Guias
const possiveisGuiasControllers = [
  path.join(__dirname, '../src/controllers/guiaController.ts'),
  path.join(__dirname, '../src/modules/guias/controllers/guiaController.ts'),
  path.join(__dirname, '../src/controllers/guiaDemandaController.ts'),
];

let guiaControllerPath = null;
for (const caminho of possiveisGuiasControllers) {
  if (fs.existsSync(caminho)) {
    guiaControllerPath = caminho;
    break;
  }
}

if (guiaControllerPath) {
  let content = fs.readFileSync(guiaControllerPath, 'utf8');
  
  // Procurar por queries que selecionam de guias
  if (content.includes('FROM guias')) {
    // Adicionar JOIN se não existir
    if (!content.includes('LEFT JOIN periodos per ON g.periodo_id')) {
      content = content.replace(
        /FROM guias g\s+(LEFT JOIN|JOIN|WHERE)/g,
        `FROM guias g
      LEFT JOIN periodos per ON g.periodo_id = per.id
      $1`
      );
    }
    
    // Adicionar condição WHERE
    content = content.replace(
      /WHERE (.*?)\s+(GROUP BY|ORDER BY|LIMIT)/g,
      (match, whereClause, nextClause) => {
        if (!match.includes('per.ocultar_dados')) {
          return `WHERE ${whereClause}
        AND (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
      ${nextClause}`;
        }
        return match;
      }
    );
    
    fs.writeFileSync(guiaControllerPath, content, 'utf8');
    console.log('✅ Controller de Guias atualizado');
  }
} else {
  console.log('⚠️  Controller de Guias não encontrado');
}

// 3. Buscar e atualizar controller de Cardápios
const possiveisCardapiosControllers = [
  path.join(__dirname, '../src/controllers/cardapioController.ts'),
  path.join(__dirname, '../src/modules/cardapios/controllers/cardapioController.ts'),
];

let cardapioControllerPath = null;
for (const caminho of possiveisCardapiosControllers) {
  if (fs.existsSync(caminho)) {
    cardapioControllerPath = caminho;
    break;
  }
}

if (cardapioControllerPath) {
  let content = fs.readFileSync(cardapioControllerPath, 'utf8');
  
  // Procurar por queries que selecionam de cardapios
  if (content.includes('FROM cardapios')) {
    // Adicionar JOIN se não existir
    if (!content.includes('LEFT JOIN periodos per ON c.periodo_id')) {
      content = content.replace(
        /FROM cardapios c\s+(LEFT JOIN|JOIN|WHERE)/g,
        `FROM cardapios c
      LEFT JOIN periodos per ON c.periodo_id = per.id
      $1`
      );
    }
    
    // Adicionar condição WHERE
    content = content.replace(
      /WHERE (.*?)\s+(GROUP BY|ORDER BY|LIMIT)/g,
      (match, whereClause, nextClause) => {
        if (!match.includes('per.ocultar_dados')) {
          return `WHERE ${whereClause}
        AND (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
      ${nextClause}`;
        }
        return match;
      }
    );
    
    fs.writeFileSync(cardapioControllerPath, content, 'utf8');
    console.log('✅ Controller de Cardápios atualizado');
  }
} else {
  console.log('⚠️  Controller de Cardápios não encontrado');
}

console.log('\n✅ Processo concluído!');
console.log('\n📝 Próximos passos:');
console.log('1. Revisar as mudanças com: git diff');
console.log('2. Reiniciar o backend');
console.log('3. Testar as listagens');
console.log('4. Verificar se dados ocultos não aparecem');
