const { Client } = require('pg');

// Conexão com Neon (produção)
// Use a variável POSTGRES_URL do Vercel ou defina aqui
const neonConnectionString = process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;

if (!neonConnectionString) {
  console.error('❌ Variável POSTGRES_URL ou NEON_DATABASE_URL não definida!');
  console.log('\nDefina uma das variáveis de ambiente:');
  console.log('  export POSTGRES_URL="postgresql://..."');
  console.log('  ou');
  console.log('  export NEON_DATABASE_URL="postgresql://..."');
  process.exit(1);
}

const neonClient = new Client({
  connectionString: neonConnectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkNeonDatabase() {
  try {
    await neonClient.connect();
    console.log('✅ Conectado ao Neon\n');
    
    // 1. Verificar se a tabela demandas existe
    console.log('🔍 Verificando tabela demandas...');
    const tableCheck = await neonClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'demandas'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ Tabela demandas não existe no Neon!');
      return;
    }
    console.log('✅ Tabela demandas existe\n');
    
    // 2. Verificar estrutura da tabela
    console.log('🔍 Verificando estrutura da tabela...');
    const columns = await neonClient.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'demandas'
      ORDER BY ordinal_position;
    `);
    
    console.log('Colunas encontradas:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Verificar se tenant_id existe
    const hasTenantId = columns.rows.some(col => col.column_name === 'tenant_id');
    if (!hasTenantId) {
      console.error('\n❌ Coluna tenant_id não existe! Precisa executar migration 017');
      return;
    }
    console.log('\n✅ Coluna tenant_id existe');
    
    // 3. Verificar índices
    console.log('\n🔍 Verificando índices...');
    const indexes = await neonClient.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'demandas'
      ORDER BY indexname;
    `);
    
    console.log(`Índices encontrados (${indexes.rows.length}):`);
    indexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });
    
    // Verificar índices importantes
    const requiredIndexes = [
      'idx_demandas_tenant_id',
      'idx_demandas_tenant_data_solicitacao',
      'idx_demandas_tenant_created_at'
    ];
    
    const missingIndexes = requiredIndexes.filter(
      reqIdx => !indexes.rows.some(idx => idx.indexname === reqIdx)
    );
    
    if (missingIndexes.length > 0) {
      console.warn('\n⚠️  Índices faltando:', missingIndexes);
      console.warn('Execute a migration 023_optimize_demandas_performance.sql');
    } else {
      console.log('\n✅ Todos os índices importantes estão presentes');
    }
    
    // 4. Verificar RLS
    console.log('\n🔍 Verificando RLS...');
    const rls = await neonClient.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE tablename = 'demandas';
    `);
    
    if (rls.rows[0].rowsecurity) {
      console.warn('⚠️  RLS está HABILITADO - pode causar problemas de performance');
      console.warn('Execute: ALTER TABLE demandas DISABLE ROW LEVEL SECURITY;');
    } else {
      console.log('✅ RLS está desabilitado');
    }
    
    // 5. Verificar políticas RLS
    console.log('\n🔍 Verificando políticas RLS...');
    const policies = await neonClient.query(`
      SELECT policyname, cmd
      FROM pg_policies
      WHERE tablename = 'demandas';
    `);
    
    if (policies.rows.length > 0) {
      console.warn(`⚠️  ${policies.rows.length} políticas RLS encontradas:`);
      policies.rows.forEach(p => {
        console.warn(`  - ${p.policyname} (${p.cmd})`);
      });
      console.warn('Considere remover as políticas duplicadas');
    } else {
      console.log('✅ Nenhuma política RLS ativa');
    }
    
    // 6. Contar registros
    console.log('\n🔍 Verificando dados...');
    const count = await neonClient.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT tenant_id) as tenants
      FROM demandas;
    `);
    
    console.log(`Total de demandas: ${count.rows[0].total}`);
    console.log(`Tenants diferentes: ${count.rows[0].tenants}`);
    
    // 7. Verificar se há demandas sem tenant_id
    const nullTenants = await neonClient.query(`
      SELECT COUNT(*) as total
      FROM demandas
      WHERE tenant_id IS NULL;
    `);
    
    if (parseInt(nullTenants.rows[0].total) > 0) {
      console.error(`\n❌ ${nullTenants.rows[0].total} demandas sem tenant_id!`);
      console.error('Execute script de migração para corrigir');
    } else {
      console.log('\n✅ Todas as demandas têm tenant_id');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('RESUMO DA VERIFICAÇÃO');
    console.log('='.repeat(60));
    
    const issues = [];
    if (!hasTenantId) issues.push('❌ Falta coluna tenant_id');
    if (missingIndexes.length > 0) issues.push(`⚠️  Faltam ${missingIndexes.length} índices`);
    if (rls.rows[0].rowsecurity) issues.push('⚠️  RLS habilitado');
    if (policies.rows.length > 0) issues.push(`⚠️  ${policies.rows.length} políticas RLS`);
    if (parseInt(nullTenants.rows[0].total) > 0) issues.push('❌ Demandas sem tenant_id');
    
    if (issues.length === 0) {
      console.log('✅ Banco Neon está consistente!');
    } else {
      console.log('Problemas encontrados:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await neonClient.end();
  }
}

checkNeonDatabase();
