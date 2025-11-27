const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testDemandasTenant() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testando adaptação de Demandas para Multi-Tenant\n');

    // 1. Verificar se a coluna tenant_id existe
    console.log('1️⃣ Verificando estrutura da tabela demandas...');
    const structureResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'demandas'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas da tabela demandas:');
    structureResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
    });

    const hasTenantId = structureResult.rows.some(col => col.column_name === 'tenant_id');
    if (hasTenantId) {
      console.log('✅ Coluna tenant_id encontrada\n');
    } else {
      console.log('❌ Coluna tenant_id NÃO encontrada\n');
      console.log('Execute a migration: node backend/migrations/017_add_tenant_to_demandas.sql\n');
      return;
    }

    // 2. Verificar índices
    console.log('2️⃣ Verificando índices...');
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'demandas'
      AND indexname LIKE '%tenant%'
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('Índices de tenant encontrados:');
      indexResult.rows.forEach(idx => {
        console.log(`  ✅ ${idx.indexname}`);
      });
    } else {
      console.log('⚠️  Nenhum índice de tenant encontrado');
    }
    console.log('');

    // 3. Verificar RLS policies
    console.log('3️⃣ Verificando RLS policies...');
    const rlsResult = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
      FROM pg_policies
      WHERE tablename = 'demandas'
    `);
    
    if (rlsResult.rows.length > 0) {
      console.log('Policies encontradas:');
      rlsResult.rows.forEach(policy => {
        console.log(`  ✅ ${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('⚠️  Nenhuma policy RLS encontrada');
    }
    console.log('');

    // 4. Verificar dados existentes
    console.log('4️⃣ Verificando dados existentes...');
    const countResult = await client.query('SELECT COUNT(*) as total FROM demandas');
    const totalDemandas = parseInt(countResult.rows[0].total);
    console.log(`Total de demandas: ${totalDemandas}`);

    if (totalDemandas > 0) {
      const withTenantResult = await client.query(`
        SELECT COUNT(*) as total 
        FROM demandas 
        WHERE tenant_id IS NOT NULL
      `);
      const withTenant = parseInt(withTenantResult.rows[0].total);
      console.log(`Demandas com tenant_id: ${withTenant}`);
      console.log(`Demandas sem tenant_id: ${totalDemandas - withTenant}`);

      if (withTenant < totalDemandas) {
        console.log('⚠️  Existem demandas sem tenant_id - execute a migration para corrigir');
      } else {
        console.log('✅ Todas as demandas têm tenant_id');
      }
    }
    console.log('');

    // 5. Verificar distribuição por tenant
    if (totalDemandas > 0) {
      console.log('5️⃣ Distribuição de demandas por tenant:');
      const distributionResult = await client.query(`
        SELECT 
          t.nome as tenant_nome,
          COUNT(d.id) as total_demandas
        FROM tenants t
        LEFT JOIN demandas d ON d.tenant_id = t.id
        GROUP BY t.id, t.nome
        ORDER BY total_demandas DESC
      `);
      
      distributionResult.rows.forEach(row => {
        console.log(`  ${row.tenant_nome}: ${row.total_demandas} demandas`);
      });
      console.log('');
    }

    // 6. Testar isolamento de tenant
    console.log('6️⃣ Testando isolamento de tenant...');
    const tenantsResult = await client.query('SELECT id, nome FROM tenants LIMIT 2');
    
    if (tenantsResult.rows.length >= 1) {
      const tenant1 = tenantsResult.rows[0];
      
      // Configurar contexto do tenant
      await client.query(`SET app.current_tenant_id = '${tenant1.id}'`);
      
      const tenant1Demandas = await client.query(`
        SELECT COUNT(*) as total 
        FROM demandas 
        WHERE tenant_id = $1
      `, [tenant1.id]);
      
      console.log(`Tenant "${tenant1.nome}": ${tenant1Demandas.rows[0].total} demandas`);
      
      // Testar query com RLS
      const rlsQuery = await client.query(`
        SELECT COUNT(*) as total 
        FROM demandas 
        WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
      `);
      
      console.log(`Query com RLS context: ${rlsQuery.rows[0].total} demandas`);
      
      if (tenant1Demandas.rows[0].total === rlsQuery.rows[0].total) {
        console.log('✅ Isolamento de tenant funcionando corretamente');
      } else {
        console.log('⚠️  Possível problema no isolamento de tenant');
      }
    }
    console.log('');

    console.log('✅ Teste concluído!\n');
    console.log('📋 Resumo:');
    console.log(`  - Estrutura: ${hasTenantId ? '✅' : '❌'}`);
    console.log(`  - Índices: ${indexResult.rows.length > 0 ? '✅' : '⚠️'}`);
    console.log(`  - RLS Policies: ${rlsResult.rows.length > 0 ? '✅' : '⚠️'}`);
    console.log(`  - Dados migrados: ${totalDemandas === 0 || (totalDemandas > 0 && withTenant === totalDemandas) ? '✅' : '⚠️'}`);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

testDemandasTenant();
