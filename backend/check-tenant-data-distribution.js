/**
 * Script para verificar a distribuição atual dos dados por tenant
 * Identifica onde estão os dados existentes e possíveis inconsistências
 */

const db = require('./dist/database');

async function checkTenantDataDistribution() {
  console.log('🔍 Verificando distribuição de dados por tenant...\n');

  try {
    // 1. Verificar tenants existentes
    console.log('=== TENANTS EXISTENTES ===');
    const tenants = await db.query(`
      SELECT id, name, slug, status, created_at 
      FROM tenants 
      ORDER BY created_at ASC
    `);
    
    console.log(`Total de tenants: ${tenants.rows.length}`);
    tenants.rows.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name} (${tenant.id}) - ${tenant.status || 'N/A'}`);
    });

    if (tenants.rows.length === 0) {
      console.log('❌ Nenhum tenant encontrado!');
      return;
    }

    // 2. Verificar distribuição de escolas
    console.log('\n=== DISTRIBUIÇÃO DE ESCOLAS ===');
    const escolasDistribution = await db.query(`
      SELECT 
        COALESCE(tenant_id::text, 'NULL') as tenant_id,
        t.name as tenant_nome,
        COUNT(*) as total_escolas,
        COUNT(*) FILTER (WHERE ativo = true) as escolas_ativas
      FROM escolas e
      LEFT JOIN tenants t ON t.id = e.tenant_id
      GROUP BY e.tenant_id, t.name
      ORDER BY total_escolas DESC
    `);

    escolasDistribution.rows.forEach(row => {
      const tenantInfo = row.tenant_nome || `ID: ${row.tenant_id}`;
      console.log(`${tenantInfo}: ${row.total_escolas} escolas (${row.escolas_ativas} ativas)`);
    });

    // 3. Verificar distribuição de produtos
    console.log('\n=== DISTRIBUIÇÃO DE PRODUTOS ===');
    const produtosDistribution = await db.query(`
      SELECT 
        COALESCE(tenant_id::text, 'NULL') as tenant_id,
        t.name as tenant_nome,
        COUNT(*) as total_produtos,
        COUNT(*) FILTER (WHERE ativo = true) as produtos_ativos
      FROM produtos p
      LEFT JOIN tenants t ON t.id = p.tenant_id
      GROUP BY p.tenant_id, t.name
      ORDER BY total_produtos DESC
    `);

    produtosDistribution.rows.forEach(row => {
      const tenantInfo = row.tenant_nome || `ID: ${row.tenant_id}`;
      console.log(`${tenantInfo}: ${row.total_produtos} produtos (${row.produtos_ativos} ativos)`);
    });

    // 4. Verificar distribuição de estoque_escolas
    console.log('\n=== DISTRIBUIÇÃO DE ESTOQUE ESCOLAS ===');
    const estoqueEscolasDistribution = await db.query(`
      SELECT 
        COALESCE(ee.tenant_id::text, 'NULL') as tenant_id,
        t.name as tenant_nome,
        COUNT(*) as total_registros,
        COUNT(*) FILTER (WHERE ee.quantidade_atual > 0) as com_estoque,
        SUM(ee.quantidade_atual) as quantidade_total
      FROM estoque_escolas ee
      LEFT JOIN tenants t ON t.id = ee.tenant_id
      GROUP BY ee.tenant_id, t.name
      ORDER BY total_registros DESC
    `);

    estoqueEscolasDistribution.rows.forEach(row => {
      const tenantInfo = row.tenant_nome || `ID: ${row.tenant_id}`;
      console.log(`${tenantInfo}: ${row.total_registros} registros (${row.com_estoque} com estoque, total: ${row.quantidade_total || 0})`);
    });

    // 5. Verificar distribuição de estoque_lotes
    console.log('\n=== DISTRIBUIÇÃO DE ESTOQUE LOTES ===');
    const estoqueLotesDistribution = await db.query(`
      SELECT 
        COALESCE(el.tenant_id::text, 'NULL') as tenant_id,
        t.name as tenant_nome,
        COUNT(*) as total_lotes,
        COUNT(*) FILTER (WHERE el.status = 'ativo') as lotes_ativos,
        SUM(el.quantidade_atual) FILTER (WHERE el.status = 'ativo') as quantidade_total_ativa
      FROM estoque_lotes el
      LEFT JOIN tenants t ON t.id = el.tenant_id
      GROUP BY el.tenant_id, t.name
      ORDER BY total_lotes DESC
    `);

    estoqueLotesDistribution.rows.forEach(row => {
      const tenantInfo = row.tenant_nome || `ID: ${row.tenant_id}`;
      console.log(`${tenantInfo}: ${row.total_lotes} lotes (${row.lotes_ativos || 0} ativos, quantidade: ${row.quantidade_total_ativa || 0})`);
    });

    // 6. Verificar distribuição de histórico
    console.log('\n=== DISTRIBUIÇÃO DE HISTÓRICO ===');
    const historicoDistribution = await db.query(`
      SELECT 
        COALESCE(eeh.tenant_id::text, 'NULL') as tenant_id,
        t.name as tenant_nome,
        COUNT(*) as total_movimentacoes,
        MAX(eeh.data_movimentacao) as ultima_movimentacao
      FROM estoque_escolas_historico eeh
      LEFT JOIN tenants t ON t.id = eeh.tenant_id
      GROUP BY eeh.tenant_id, t.name
      ORDER BY total_movimentacoes DESC
    `);

    historicoDistribution.rows.forEach(row => {
      const tenantInfo = row.tenant_nome || `ID: ${row.tenant_id}`;
      console.log(`${tenantInfo}: ${row.total_movimentacoes} movimentações (última: ${row.ultima_movimentacao || 'N/A'})`);
    });

    // 7. Verificar inconsistências entre tabelas
    console.log('\n=== VERIFICAÇÃO DE INCONSISTÊNCIAS ===');
    
    // Produtos em tenants diferentes das escolas que os usam
    const inconsistenciaProdutoEscola = await db.query(`
      SELECT DISTINCT
        p.tenant_id as produto_tenant,
        e.tenant_id as escola_tenant,
        COUNT(*) as registros_afetados
      FROM estoque_escolas ee
      JOIN produtos p ON p.id = ee.produto_id
      JOIN escolas e ON e.id = ee.escola_id
      WHERE p.tenant_id != e.tenant_id
        OR p.tenant_id IS NULL 
        OR e.tenant_id IS NULL
      GROUP BY p.tenant_id, e.tenant_id
      ORDER BY registros_afetados DESC
    `);

    if (inconsistenciaProdutoEscola.rows.length > 0) {
      console.log('⚠️ INCONSISTÊNCIAS ENCONTRADAS:');
      inconsistenciaProdutoEscola.rows.forEach(row => {
        console.log(`  Produto tenant ${row.produto_tenant || 'NULL'} ↔ Escola tenant ${row.escola_tenant || 'NULL'}: ${row.registros_afetados} registros`);
      });
    } else {
      console.log('✅ Nenhuma inconsistência encontrada entre produtos e escolas');
    }

    // Estoque sem tenant_id
    const estoqueSemTenant = await db.query(`
      SELECT 
        'estoque_escolas' as tabela,
        COUNT(*) as registros_sem_tenant
      FROM estoque_escolas 
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'estoque_lotes' as tabela,
        COUNT(*) as registros_sem_tenant
      FROM estoque_lotes 
      WHERE tenant_id IS NULL
      UNION ALL
      SELECT 
        'estoque_escolas_historico' as tabela,
        COUNT(*) as registros_sem_tenant
      FROM estoque_escolas_historico 
      WHERE tenant_id IS NULL
    `);

    console.log('\n=== REGISTROS SEM TENANT_ID ===');
    estoqueSemTenant.rows.forEach(row => {
      if (row.registros_sem_tenant > 0) {
        console.log(`⚠️ ${row.tabela}: ${row.registros_sem_tenant} registros sem tenant_id`);
      } else {
        console.log(`✅ ${row.tabela}: todos os registros têm tenant_id`);
      }
    });

    // 8. Análise detalhada por tenant principal
    console.log('\n=== ANÁLISE DETALHADA POR TENANT ===');
    
    for (const tenant of tenants.rows) {
      console.log(`\n--- TENANT: ${tenant.name} (${tenant.id}) ---`);
      
      // Contar dados por tabela
      const detalhes = await db.query(`
        SELECT 
          'escolas' as tabela,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE ativo = true) as ativos
        FROM escolas 
        WHERE tenant_id = $1
        UNION ALL
        SELECT 
          'produtos' as tabela,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE ativo = true) as ativos
        FROM produtos 
        WHERE tenant_id = $1
        UNION ALL
        SELECT 
          'estoque_escolas' as tabela,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE quantidade_atual > 0) as ativos
        FROM estoque_escolas 
        WHERE tenant_id = $1
        UNION ALL
        SELECT 
          'estoque_lotes' as tabela,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'ativo') as ativos
        FROM estoque_lotes 
        WHERE tenant_id = $1
        UNION ALL
        SELECT 
          'historico' as tabela,
          COUNT(*) as total,
          COUNT(*) as ativos
        FROM estoque_escolas_historico 
        WHERE tenant_id = $1
      `, [tenant.id]);

      detalhes.rows.forEach(row => {
        console.log(`  ${row.tabela}: ${row.total} total (${row.ativos} ativos/com dados)`);
      });
    }

    // 9. Recomendações
    console.log('\n=== RECOMENDAÇÕES ===');
    
    const totalEscolasSemTenant = escolasDistribution.rows.find(r => r.tenant_id === 'NULL')?.total_escolas || 0;
    const totalProdutosSemTenant = produtosDistribution.rows.find(r => r.tenant_id === 'NULL')?.total_produtos || 0;
    const totalEstoqueSemTenant = estoqueEscolasDistribution.rows.find(r => r.tenant_id === 'NULL')?.total_registros || 0;

    if (totalEscolasSemTenant > 0 || totalProdutosSemTenant > 0 || totalEstoqueSemTenant > 0) {
      console.log('⚠️ AÇÃO NECESSÁRIA:');
      
      if (totalEscolasSemTenant > 0) {
        console.log(`  - ${totalEscolasSemTenant} escolas precisam ser atribuídas a um tenant`);
      }
      
      if (totalProdutosSemTenant > 0) {
        console.log(`  - ${totalProdutosSemTenant} produtos precisam ser atribuídos a um tenant`);
      }
      
      if (totalEstoqueSemTenant > 0) {
        console.log(`  - ${totalEstoqueSemTenant} registros de estoque precisam ser atribuídos a um tenant`);
      }
      
      console.log('\n📋 PRÓXIMOS PASSOS:');
      console.log('1. Execute o script de migração de dados para atribuir tenant_id');
      console.log('2. Verifique se há um tenant principal que deve receber os dados órfãos');
      console.log('3. Execute novamente este script para verificar se as inconsistências foram resolvidas');
      
    } else {
      console.log('✅ Todos os dados estão corretamente atribuídos a tenants');
    }

    // 10. Identificar tenant principal (com mais dados)
    console.log('\n=== TENANT PRINCIPAL IDENTIFICADO ===');
    
    const tenantPrincipal = await db.query(`
      SELECT 
        t.id,
        t.name,
        COALESCE(e_count.total, 0) as escolas,
        COALESCE(p_count.total, 0) as produtos,
        COALESCE(ee_count.total, 0) as estoque_registros
      FROM tenants t
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) as total 
        FROM escolas 
        WHERE tenant_id IS NOT NULL 
        GROUP BY tenant_id
      ) e_count ON e_count.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) as total 
        FROM produtos 
        WHERE tenant_id IS NOT NULL 
        GROUP BY tenant_id
      ) p_count ON p_count.tenant_id = t.id
      LEFT JOIN (
        SELECT tenant_id, COUNT(*) as total 
        FROM estoque_escolas 
        WHERE tenant_id IS NOT NULL 
        GROUP BY tenant_id
      ) ee_count ON ee_count.tenant_id = t.id
      ORDER BY (COALESCE(e_count.total, 0) + COALESCE(p_count.total, 0) + COALESCE(ee_count.total, 0)) DESC
      LIMIT 1
    `);

    if (tenantPrincipal.rows.length > 0) {
      const principal = tenantPrincipal.rows[0];
      console.log(`🏆 Tenant com mais dados: ${principal.name} (${principal.id})`);
      console.log(`   - ${principal.escolas} escolas`);
      console.log(`   - ${principal.produtos} produtos`);
      console.log(`   - ${principal.estoque_registros} registros de estoque`);
      
      console.log(`\n💡 SUGESTÃO: Use este tenant (${principal.id}) para atribuir dados órfãos`);
    }

  } catch (error) {
    console.error('❌ Erro ao verificar distribuição de dados:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkTenantDataDistribution()
    .then(() => {
      console.log('\n✅ Verificação concluída!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { checkTenantDataDistribution };