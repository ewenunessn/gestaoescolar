const db = require('./src/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     REMOÇÃO DE TABELAS NÃO UTILIZADAS                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    // 1. Verificar conexão
    console.log('🔌 Verificando conexão com banco de dados...');
    const connTest = await db.query('SELECT NOW()');
    console.log('✅ Conectado ao banco de dados\n');
    
    // 2. Contar tabelas antes
    console.log('📊 Contando tabelas antes da remoção...');
    const beforeCount = await db.query(`
      SELECT COUNT(*) as total
      FROM pg_tables
      WHERE schemaname = 'public'
    `);
    console.log(`   Total de tabelas: ${beforeCount.rows[0].total}\n`);
    
    // 3. Listar tabelas que serão removidas
    console.log('📋 Tabelas que serão removidas:');
    const tablesToRemove = [
      'aditivos_contratos_itens',
      'aditivos_contratos',
      'agrupamentos_faturamentos',
      'agrupamentos_pedidos',
      'agrupamentos_mensais',
      'alertas',
      'estoque_alertas',
      'analises_qualidade',
      'controle_qualidade',
      'backup_movimentacoes_estoque',
      'backup_estoque_escolas',
      'calculos_resultados',
      'calculos_entrega',
      'carrinho_itens',
      'configuracao_entregas',
      'gas_movimentacoes',
      'gas_estoque',
      'gas_controle',
      'gestor_escola',
      'historico_saldos',
      'itens_pedido',
      'logs_sistema',
      'movimentacoes_estoque_escolas',
      'movimentacoes_estoque',
      'estoque_escolar_movimentacoes',
      'planejamento_compras_itens',
      'planejamento_compras',
      'preparacao_itens',
      'preparacao_cardapios',
      'produtos_unidades',
      'produtos_categorias',
      'recebimentos_itens',
      'relatorios_agendados',
      'romaneios_itens',
      'romaneios',
      'rotas_escolas',
      'saldo_contratos_modalidades',
      'sessoes',
      'faturamento_itens_modalidades'
    ];
    
    // Verificar quais tabelas existem
    const existingTables = [];
    for (const table of tablesToRemove) {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        existingTables.push(table);
        console.log(`   ✓ ${table}`);
      }
    }
    
    console.log(`\n   Total: ${existingTables.length} tabelas encontradas\n`);
    
    if (existingTables.length === 0) {
      console.log('ℹ️  Nenhuma tabela para remover. Todas já foram removidas.\n');
      return;
    }
    
    // 4. Confirmação
    console.log('⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!\n');
    console.log('   Certifique-se de ter um backup do banco de dados.\n');
    
    // 5. Ler e executar SQL
    console.log('🔄 Executando script de remoção...\n');
    const sqlPath = path.join(__dirname, 'migrations', 'remove-unused-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await db.query(sql);
    
    console.log('✅ Script executado com sucesso!\n');
    
    // 6. Contar tabelas depois
    console.log('📊 Contando tabelas após remoção...');
    const afterCount = await db.query(`
      SELECT COUNT(*) as total
      FROM pg_tables
      WHERE schemaname = 'public'
    `);
    console.log(`   Total de tabelas: ${afterCount.rows[0].total}\n`);
    
    const removed = parseInt(beforeCount.rows[0].total) - parseInt(afterCount.rows[0].total);
    console.log(`✅ ${removed} tabelas removidas com sucesso!\n`);
    
    // 7. Listar tabelas restantes
    console.log('📋 Tabelas restantes no banco:');
    const remainingTables = await db.query(`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    remainingTables.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.tablename} (${row.size})`);
    });
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ MIGRAÇÃO CONCLUÍDA!                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    // 8. Salvar relatório
    const report = {
      timestamp: new Date().toISOString(),
      before: parseInt(beforeCount.rows[0].total),
      after: parseInt(afterCount.rows[0].total),
      removed: removed,
      tablesRemoved: existingTables,
      tablesRemaining: remainingTables.rows.map(r => r.tablename)
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'migration-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('📄 Relatório salvo em: backend/migration-report.json\n');
    
  } catch (error) {
    console.error('\n❌ ERRO durante a migração:', error.message);
    console.error('\nDetalhes:', error);
    console.error('\n⚠️  A transação foi revertida. Nenhuma alteração foi feita.\n');
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Executar migração
runMigration().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
