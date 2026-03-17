/**
 * Script para adicionar filtro de períodos ocultos nos controllers
 * 
 * Este script adiciona automaticamente o JOIN com períodos e o filtro
 * de ocultar_dados nas queries de listagem dos controllers principais
 */

const fs = require('fs');
const path = require('path');

// Padrões a serem substituídos
const patterns = [
  {
    name: 'Pedidos - Query principal',
    file: 'backend/src/modules/compras/controllers/compraController.ts',
    search: /FROM pedidos p\s+JOIN usuarios u/g,
    replace: `FROM pedidos p
      LEFT JOIN periodos per ON p.periodo_id = per.id
      JOIN usuarios u`,
    addWhere: true
  },
  {
    name: 'Pedidos - Query de contagem',
    file: 'backend/src/modules/compras/controllers/compraController.ts',
    search: /FROM pedidos p\s+WHERE \$\{whereClause\}/g,
    replace: `FROM pedidos p
      LEFT JOIN periodos per ON p.periodo_id = per.id
      WHERE (per.ocultar_dados = false OR per.ocultar_dados IS NULL)
        AND \${whereClause}`,
    addWhere: false
  }
];

// Condição WHERE para adicionar
const whereCondition = `AND (per.ocultar_dados = false OR per.ocultar_dados IS NULL)`;

function aplicarFiltros() {
  console.log('🔧 Aplicando filtros de períodos ocultos...\n');

  patterns.forEach(pattern => {
    const filePath = path.join(__dirname, '..', '..', pattern.file.replace('backend/', ''));
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Arquivo não encontrado: ${pattern.file}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Aplicar substituição
    if (pattern.search.test(content)) {
      content = content.replace(pattern.search, pattern.replace);
      
      // Adicionar WHERE se necessário
      if (pattern.addWhere) {
        // Procurar WHERE ${whereClause} e adicionar condição
        content = content.replace(
          /WHERE \$\{whereClause\}\s+GROUP BY/g,
          `WHERE \${whereClause}
        ${whereCondition}
      GROUP BY`
        );
      }

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${pattern.name}`);
        console.log(`   Arquivo: ${pattern.file}\n`);
      } else {
        console.log(`⚠️  ${pattern.name} - Nenhuma alteração necessária\n`);
      }
    } else {
      console.log(`⚠️  ${pattern.name} - Padrão não encontrado\n`);
    }
  });

  console.log('\n✅ Processo concluído!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Revisar as mudanças nos arquivos');
  console.log('2. Testar as listagens');
  console.log('3. Verificar se os dados ocultos não aparecem');
}

// Executar
try {
  aplicarFiltros();
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
