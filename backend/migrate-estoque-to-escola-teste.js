/**
 * Script para migrar dados de estoque sem tenant_id ou do Sistema Principal 
 * para o tenant "Escola de Teste"
 */

const db = require('./dist/database');

const ESCOLA_TESTE_TENANT_ID = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f';
const SISTEMA_PRINCIPAL_TENANT_ID = '00000000-0000-0000-0000-000000000000';

async function migrateEstoqueToEscolaTeste() {
  console.log('🔄 Iniciando migração de dados de estoque para "Escola de Teste"...\n');

  try {
    // 1. Verificar dados sem tenant_id ou no Sistema Principal
    console.log('=== VERIFICANDO DADOS PARA MIGRAÇÃO ===');
    
    const estoqueEscolasSemTenant = await db.query(`
      SELECT COUNT(*) as total 
      FROM estoque_escolas 
      WHERE tenant_id IS NULL OR tenant_id = $1
    `, [SISTEMA_PRINCIPAL_TENANT_ID]);

    const estoqueLotesSemTenant = await db.query(`
      SELECT COUNT(*) as total 
      FROM estoque_lotes 
      WHERE tenant_id IS NULL OR tenant_id = $1
    `, [SISTEMA_PRINCIPAL_TENANT_ID]);

    const historicoSemTenant = await db.query(`
      SELECT COUNT(*) as total 
      FROM estoque_escolas_historico 
      WHERE tenant_id IS NULL OR tenant_id = $1
    `, [SISTEMA_PRINCIPAL_TENANT_ID]);

    console.log(`📊 Dados encontrados para migração:`);
    console.log(`  - estoque_escolas: ${estoqueEscolasSemTenant.rows[0].total} registros`);
    console.log(`  - estoque_lotes: ${estoqueLotesSemTenant.rows[0].total} registros`);
    console.log(`  - estoque_escolas_historico: ${historicoSemTenant.rows[0].total} registros`);

    const totalRegistros = parseInt(estoqueEscolasSemTenant.rows[0].total) + 
                          parseInt(estoqueLotesSemTenant.rows[0].total) + 
                          parseInt(historicoSemTenant.rows[0].total);

    if (totalRegistros === 0) {
      console.log('✅ Nenhum dado encontrado para migração!');
      return;
    }

    console.log(`\n🎯 Total de ${totalRegistros} registros serão migrados para "Escola de Teste"`);
    console.log(`📋 Tenant de destino: ${ESCOLA_TESTE_TENANT_ID}\n`);

    // 2. Verificar se o tenant de destino existe
    const tenantDestino = await db.query('SELECT name FROM tenants WHERE id = $1', [ESCOLA_TESTE_TENANT_ID]);
    if (tenantDestino.rows.length === 0) {
      throw new Error(`Tenant de destino não encontrado: ${ESCOLA_TESTE_TENANT_ID}`);
    }

    console.log(`✅ Tenant de destino confirmado: ${tenantDestino.rows[0].name}\n`);

    // 3. Executar migração em transação
    console.log('🔄 Iniciando migração...');
    
    const result = await db.transaction(async (client) => {
      let migrados = {
        estoque_escolas: 0,
        estoque_lotes: 0,
        estoque_escolas_historico: 0
      };

      // Migrar estoque_escolas
      if (parseInt(estoqueEscolasSemTenant.rows[0].total) > 0) {
        console.log('  📦 Migrando estoque_escolas...');
        const resultEstoque = await client.query(`
          UPDATE estoque_escolas 
          SET tenant_id = $1, updated_at = NOW()
          WHERE tenant_id IS NULL OR tenant_id = $2
          RETURNING id
        `, [ESCOLA_TESTE_TENANT_ID, SISTEMA_PRINCIPAL_TENANT_ID]);
        
        migrados.estoque_escolas = resultEstoque.rows.length;
        console.log(`    ✅ ${migrados.estoque_escolas} registros migrados`);
      }

      // Migrar estoque_lotes
      if (parseInt(estoqueLotesSemTenant.rows[0].total) > 0) {
        console.log('  📦 Migrando estoque_lotes...');
        const resultLotes = await client.query(`
          UPDATE estoque_lotes 
          SET tenant_id = $1, updated_at = NOW()
          WHERE tenant_id IS NULL OR tenant_id = $2
          RETURNING id
        `, [ESCOLA_TESTE_TENANT_ID, SISTEMA_PRINCIPAL_TENANT_ID]);
        
        migrados.estoque_lotes = resultLotes.rows.length;
        console.log(`    ✅ ${migrados.estoque_lotes} registros migrados`);
      }

      // Migrar estoque_escolas_historico
      if (parseInt(historicoSemTenant.rows[0].total) > 0) {
        console.log('  📦 Migrando estoque_escolas_historico...');
        const resultHistorico = await client.query(`
          UPDATE estoque_escolas_historico 
          SET tenant_id = $1
          WHERE tenant_id IS NULL OR tenant_id = $2
          RETURNING id
        `, [ESCOLA_TESTE_TENANT_ID, SISTEMA_PRINCIPAL_TENANT_ID]);
        
        migrados.estoque_escolas_historico = resultHistorico.rows.length;
        console.log(`    ✅ ${migrados.estoque_escolas_historico} registros migrados`);
      }

      return migrados;
    });

    // 4. Verificar resultado da migração
    console.log('\n=== RESULTADO DA MIGRAÇÃO ===');
    console.log(`✅ estoque_escolas: ${result.estoque_escolas} registros migrados`);
    console.log(`✅ estoque_lotes: ${result.estoque_lotes} registros migrados`);
    console.log(`✅ estoque_escolas_historico: ${result.estoque_escolas_historico} registros migrados`);
    
    const totalMigrados = result.estoque_escolas + result.estoque_lotes + result.estoque_escolas_historico;
    console.log(`\n🎉 Total: ${totalMigrados} registros migrados com sucesso!`);

    // 5. Verificar integridade após migração
    console.log('\n=== VERIFICAÇÃO DE INTEGRIDADE ===');
    
    // Verificar se ainda existem registros sem tenant_id
    const verificacaoSemTenant = await db.query(`
      SELECT 
        'estoque_escolas' as tabela,
        COUNT(*) as sem_tenant
      FROM estoque_escolas 
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'estoque_lotes' as tabela,
        COUNT(*) as sem_tenant
      FROM estoque_lotes 
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'estoque_escolas_historico' as tabela,
        COUNT(*) as sem_tenant
      FROM estoque_escolas_historico 
      WHERE tenant_id IS NULL
    `);

    let problemasEncontrados = false;
    verificacaoSemTenant.rows.forEach(row => {
      if (parseInt(row.sem_tenant) > 0) {
        console.log(`⚠️ ${row.tabela}: ainda tem ${row.sem_tenant} registros sem tenant_id`);
        problemasEncontrados = true;
      } else {
        console.log(`✅ ${row.tabela}: todos os registros têm tenant_id`);
      }
    });

    // Verificar distribuição final
    const distribuicaoFinal = await db.query(`
      SELECT 
        t.name as tenant_nome,
        COUNT(DISTINCT ee.id) as estoque_escolas,
        COUNT(DISTINCT el.id) as estoque_lotes,
        COUNT(DISTINCT eeh.id) as historico
      FROM tenants t
      LEFT JOIN estoque_escolas ee ON ee.tenant_id = t.id
      LEFT JOIN estoque_lotes el ON el.tenant_id = t.id
      LEFT JOIN estoque_escolas_historico eeh ON eeh.tenant_id = t.id
      GROUP BY t.id, t.name
      ORDER BY t.name
    `);

    console.log('\n=== DISTRIBUIÇÃO FINAL POR TENANT ===');
    distribuicaoFinal.rows.forEach(row => {
      console.log(`${row.tenant_nome}:`);
      console.log(`  - estoque_escolas: ${row.estoque_escolas}`);
      console.log(`  - estoque_lotes: ${row.estoque_lotes}`);
      console.log(`  - historico: ${row.historico}`);
    });

    if (!problemasEncontrados) {
      console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log('✅ Todos os dados de estoque agora estão no tenant "Escola de Teste"');
      console.log('✅ Integridade dos dados verificada');
    } else {
      console.log('\n⚠️ MIGRAÇÃO CONCLUÍDA COM AVISOS');
      console.log('⚠️ Alguns registros ainda precisam de atenção');
    }

  } catch (error) {
    console.error('\n❌ ERRO DURANTE A MIGRAÇÃO:', error);
    console.error('❌ A migração foi interrompida para preservar a integridade dos dados');
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  migrateEstoqueToEscolaTeste()
    .then(() => {
      console.log('\n✅ Script concluído!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { migrateEstoqueToEscolaTeste };