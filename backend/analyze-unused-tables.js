const fs = require('fs');
const path = require('path');

// Lista de todas as tabelas do schema.sql
const allTables = [
  'aditivos_contratos',
  'aditivos_contratos_itens',
  'agrupamentos_faturamentos',
  'agrupamentos_mensais',
  'agrupamentos_pedidos',
  'alertas',
  'analises_qualidade',
  'auditoria_universal',
  'backup_estoque_escolas',
  'backup_movimentacoes_estoque',
  'backups',
  'calculos_entrega',
  'calculos_resultados',
  'cardapio_refeicoes',
  'cardapios',
  'carrinho_itens',
  'configuracao_entregas',
  'configuracoes_notificacao',
  'consistencia_dados',
  'contrato_produtos',
  'contrato_produtos_modalidades',
  'contratos',
  'controle_qualidade',
  'demandas',
  'demandas_escolas',
  'escola_modalidades',
  'escolas',
  'escolas_modalidades',
  'estoque_alertas',
  'estoque_escola',
  'estoque_escolar_movimentacoes',
  'estoque_escolas',
  'estoque_escolas_historico',
  'estoque_lotes',
  'estoque_movimentacoes',
  'faturamento_itens',
  'faturamento_itens_modalidades',
  'faturamentos',
  'fornecedores',
  'gas_controle',
  'gas_estoque',
  'gas_movimentacoes',
  'gestor_escola',
  'guia_produto_escola',
  'guias',
  'historico_saldos',
  'itens_pedido',
  'jobs',
  'logs_auditoria',
  'logs_sistema',
  'modalidades',
  'movimentacoes_estoque',
  'movimentacoes_estoque_escolas',
  'notificacoes',
  'pedidos',
  'planejamento_compras',
  'planejamento_compras_itens',
  'preparacao_cardapios',
  'preparacao_itens',
  'produtos',
  'produtos_categorias',
  'produtos_unidades',
  'recebimentos',
  'recebimentos_itens',
  'refeicoes',
  'relatorios_agendados',
  'romaneios',
  'romaneios_itens',
  'rotas',
  'rotas_escolas',
  'saldo_contratos_modalidades',
  'sessoes',
  'usuarios'
];

// Função para buscar referências a uma tabela no código
function searchTableInCode(tableName, directory) {
  const results = [];
  
  function searchInDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Ignorar node_modules e outras pastas
        if (!['node_modules', 'dist', '.git', 'build'].includes(file)) {
          searchInDirectory(filePath);
        }
      } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.jsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Buscar por referências à tabela
        const patterns = [
          new RegExp(`FROM\\s+${tableName}`, 'i'),
          new RegExp(`JOIN\\s+${tableName}`, 'i'),
          new RegExp(`INTO\\s+${tableName}`, 'i'),
          new RegExp(`UPDATE\\s+${tableName}`, 'i'),
          new RegExp(`DELETE\\s+FROM\\s+${tableName}`, 'i'),
          new RegExp(`TABLE\\s+${tableName}`, 'i'),
          new RegExp(`['"\`]${tableName}['"\`]`, 'i'),
        ];
        
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            results.push({
              file: filePath.replace(process.cwd(), ''),
              table: tableName
            });
            break;
          }
        }
      }
    }
  }
  
  searchInDirectory(directory);
  return results;
}

// Analisar todas as tabelas
console.log('🔍 Analisando uso de tabelas no código...\n');

const backendDir = path.join(__dirname, 'src');
const frontendDir = path.join(__dirname, '..', 'frontend', 'src');

const usedTables = new Set();
const unusedTables = [];
const tableUsage = {};

for (const table of allTables) {
  const backendRefs = searchTableInCode(table, backendDir);
  const frontendRefs = searchTableInCode(table, frontendDir);
  const allRefs = [...backendRefs, ...frontendRefs];
  
  if (allRefs.length > 0) {
    usedTables.add(table);
    tableUsage[table] = allRefs;
  } else {
    unusedTables.push(table);
  }
}

// Relatório
console.log('═══════════════════════════════════════════════════════════');
console.log('📊 RELATÓRIO DE USO DE TABELAS');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`✅ Tabelas em uso: ${usedTables.size}/${allTables.length}`);
console.log(`❌ Tabelas não utilizadas: ${unusedTables.length}/${allTables.length}\n`);

if (unusedTables.length > 0) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('❌ TABELAS NÃO UTILIZADAS (podem ser removidas):');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  unusedTables.forEach((table, index) => {
    console.log(`${index + 1}. ${table}`);
  });
  
  console.log('\n');
}

// Salvar relatório em arquivo
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: allTables.length,
    used: usedTables.size,
    unused: unusedTables.length
  },
  unusedTables: unusedTables,
  usedTables: Array.from(usedTables).map(table => ({
    name: table,
    references: tableUsage[table].length,
    files: tableUsage[table].map(ref => ref.file)
  }))
};

fs.writeFileSync(
  path.join(__dirname, 'table-usage-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Relatório completo salvo em: backend/table-usage-report.json\n');

// Gerar SQL para remover tabelas não utilizadas
if (unusedTables.length > 0) {
  const dropSQL = unusedTables.map(table => 
    `-- DROP TABLE IF EXISTS ${table} CASCADE;`
  ).join('\n');
  
  fs.writeFileSync(
    path.join(__dirname, 'drop-unused-tables.sql'),
    `-- Script para remover tabelas não utilizadas
-- Gerado em: ${new Date().toISOString()}
-- ATENÇÃO: Revise cuidadosamente antes de executar!

${dropSQL}
`
  );
  
  console.log('📄 Script SQL gerado em: backend/drop-unused-tables.sql\n');
}

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Análise concluída!');
console.log('═══════════════════════════════════════════════════════════');
