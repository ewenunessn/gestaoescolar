/**
 * Script para testar isolamento de tenant
 * Execute com: node test-tenant-isolation.js
 */

const db = require('./dist/database');

async function testTenantIsolation() {
  try {
    console.log('🧪 Testando isolamento de tenant...');
    
    // Testar conexão
    const connected = await db.testConnection();
    if (!connected) {
      throw new Error('Falha na conexão com o banco de dados');
    }
    
    // Verificar status do RLS
    console.log('\n📊 Verificando status do RLS...');
    try {
      const rlsCheck = await db.query(`
        SELECT 
          tablename,
          rowsecurity as rls_enabled,
          (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
        FROM pg_tables t
        WHERE schemaname = 'public' 
          AND tablename IN ('escolas', 'produtos', 'usuarios')
        ORDER BY tablename
      `);
      
      rlsCheck.rows.forEach(row => {
        const status = row.rls_enabled ? '✅ Ativo' : '❌ Inativo';
        console.log(`  ${row.tablename}: ${status} (${row.policy_count} políticas)`);
      });
    } catch (error) {
      console.log(`  ⚠️  Erro ao verificar RLS: ${error.message}`);
    }
    
    // Verificar funções de tenant
    console.log('\n🔧 Verificando funções de tenant...');
    try {
      const functionsCheck = await db.query(`
        SELECT proname 
        FROM pg_proc 
        WHERE proname IN ('set_tenant_context', 'get_current_tenant_id', 'clear_tenant_context')
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `);
      
      functionsCheck.rows.forEach(row => {
        console.log(`  ✓ ${row.proname}()`);
      });
    } catch (error) {
      console.log(`  ⚠️  Erro ao verificar funções: ${error.message}`);
    }
    
    // Testar contexto de tenant
    console.log('\n🎯 Testando contexto de tenant...');
    
    try {
      // Verificar contexto atual
      const currentContext = await db.query(`SELECT get_current_tenant_id() as current_tenant`);
      console.log(`  Contexto atual: ${currentContext.rows[0].current_tenant || 'Não definido'}`);
      
      // Definir contexto para tenant padrão
      await db.query(`SELECT set_tenant_context('00000000-0000-0000-0000-000000000000')`);
      console.log(`  ✓ Contexto definido para tenant padrão`);
      
      // Verificar contexto após definição
      const newContext = await db.query(`SELECT get_current_tenant_id() as current_tenant`);
      console.log(`  Novo contexto: ${newContext.rows[0].current_tenant}`);
      
    } catch (error) {
      console.log(`  ⚠️  Erro no teste de contexto: ${error.message}`);
    }
    
    // Testar consultas com RLS
    console.log('\n📋 Testando consultas com RLS...');
    
    try {
      // Testar escolas
      const schoolsResult = await db.query(`SELECT COUNT(*) as total FROM escolas`);
      console.log(`  Escolas visíveis: ${schoolsResult.rows[0].total}`);
      
      // Testar produtos
      const productsResult = await db.query(`SELECT COUNT(*) as total FROM produtos`);
      console.log(`  Produtos visíveis: ${productsResult.rows[0].total}`);
      
      // Testar usuários
      const usersResult = await db.query(`SELECT COUNT(*) as total FROM usuarios`);
      console.log(`  Usuários visíveis: ${usersResult.rows[0].total}`);
      
    } catch (error) {
      console.log(`  ⚠️  Erro nas consultas: ${error.message}`);
    }
    
    // Testar isolamento entre tenants
    console.log('\n🔒 Testando isolamento entre tenants...');
    
    try {
      // Criar um tenant de teste se não existir
      const testTenantResult = await db.query(`
        INSERT INTO tenants (id, slug, name, subdomain, status, settings, limits)
        VALUES (
          '11111111-1111-1111-1111-111111111111',
          'tenant-teste',
          'Tenant de Teste',
          'teste',
          'active',
          '{}',
          '{}'
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `);
      
      if (testTenantResult.rows.length > 0) {
        console.log(`  ✓ Tenant de teste criado`);
      } else {
        console.log(`  ✓ Tenant de teste já existe`);
      }
      
      // Testar mudança de contexto
      await db.query(`SELECT set_tenant_context('11111111-1111-1111-1111-111111111111')`);
      console.log(`  ✓ Contexto alterado para tenant de teste`);
      
      // Verificar dados visíveis no novo contexto
      const schoolsInNewTenant = await db.query(`SELECT COUNT(*) as total FROM escolas`);
      console.log(`  Escolas visíveis no tenant de teste: ${schoolsInNewTenant.rows[0].total}`);
      
      // Voltar para tenant padrão
      await db.query(`SELECT set_tenant_context('00000000-0000-0000-0000-000000000000')`);
      console.log(`  ✓ Contexto voltou para tenant padrão`);
      
      const schoolsInDefaultTenant = await db.query(`SELECT COUNT(*) as total FROM escolas`);
      console.log(`  Escolas visíveis no tenant padrão: ${schoolsInDefaultTenant.rows[0].total}`);
      
    } catch (error) {
      console.log(`  ⚠️  Erro no teste de isolamento: ${error.message}`);
    }
    
    console.log('\n🎉 Teste de isolamento concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    console.error('\nDetalhes do erro:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Fechar conexão
    if (db.pool) {
      await db.pool.end();
    }
    process.exit(0);
  }
}

// Executar teste
testTenantIsolation();