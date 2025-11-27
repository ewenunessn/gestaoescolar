const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Conexão com Neon (produção)
const neonConnectionString = process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;

if (!neonConnectionString) {
  console.error('❌ Variável POSTGRES_URL ou NEON_DATABASE_URL não definida!');
  console.log('\nPara obter a connection string:');
  console.log('1. Acesse https://console.neon.tech');
  console.log('2. Selecione seu projeto');
  console.log('3. Copie a connection string');
  console.log('\nDepois execute:');
  console.log('  set POSTGRES_URL=postgresql://...');
  console.log('  node backend/apply-demandas-fix-neon.js');
  process.exit(1);
}

const client = new Client({
  connectionString: neonConnectionString,
  ssl: { rejectUnauthorized: false }
});

async function applyFixes() {
  try {
    await client.connect();
    console.log('✅ Conectado ao Neon\n');
    
    console.log('🔄 Aplicando correções...\n');
    
    // 1. Desabilitar RLS
    console.log('1️⃣ Desabilitando RLS...');
    await client.query('ALTER TABLE demandas DISABLE ROW LEVEL SECURITY');
    console.log('   ✅ RLS desabilitado\n');
    
    // 2. Remover políticas duplicadas
    console.log('2️⃣ Removendo políticas RLS duplicadas...');
    await client.query('DROP POLICY IF EXISTS demandas_tenant_isolation ON demandas');
    await client.query('DROP POLICY IF EXISTS tenant_isolation_demandas ON demandas');
    console.log('   ✅ Políticas removidas\n');
    
    // 3. Criar índices
    console.log('3️⃣ Criando índices de otimização...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_demandas_tenant_id ON demandas(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_tenant_data_solicitacao ON demandas(tenant_id, data_solicitacao DESC)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_tenant_created_at ON demandas(tenant_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_tenant_status ON demandas(tenant_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_tenant_escola_id ON demandas(tenant_id, escola_id) WHERE escola_id IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_demandas_data_solicitacao ON demandas(data_solicitacao)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escola_nome ON demandas(escola_nome) WHERE escola_nome IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_escolas_id_tenant ON escolas(id, tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_usuarios_id ON usuarios(id)'
    ];
    
    for (const indexSql of indexes) {
      const indexName = indexSql.match(/idx_\w+/)[0];
      try {
        await client.query(indexSql);
        console.log(`   ✅ ${indexName}`);
      } catch (error) {
        console.log(`   ⚠️  ${indexName} - ${error.message}`);
      }
    }
    console.log('');
    
    // 4. Atualizar estatísticas
    console.log('4️⃣ Atualizando estatísticas...');
    await client.query('ANALYZE demandas');
    await client.query('ANALYZE escolas');
    await client.query('ANALYZE usuarios');
    console.log('   ✅ Estatísticas atualizadas\n');
    
    // 5. Verificar resultado
    console.log('5️⃣ Verificando resultado...\n');
    
    const rlsCheck = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE tablename = 'demandas'
    `);
    console.log(`   RLS: ${rlsCheck.rows[0].rowsecurity ? '❌ HABILITADO' : '✅ DESABILITADO'}`);
    
    const indexCount = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes
      WHERE tablename = 'demandas'
    `);
    console.log(`   Índices: ${indexCount.rows[0].total} criados`);
    
    const policyCount = await client.query(`
      SELECT COUNT(*) as total
      FROM pg_policies
      WHERE tablename = 'demandas'
    `);
    console.log(`   Políticas RLS: ${policyCount.rows[0].total}`);
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_demandas,
        COUNT(DISTINCT tenant_id) as total_tenants,
        COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sem_tenant
      FROM demandas
    `);
    
    console.log(`   Demandas: ${stats.rows[0].total_demandas} total`);
    console.log(`   Tenants: ${stats.rows[0].total_tenants} diferentes`);
    console.log(`   Sem tenant_id: ${stats.rows[0].sem_tenant}`);
    
    if (parseInt(stats.rows[0].sem_tenant) > 0) {
      console.log('\n⚠️  ATENÇÃO: Há demandas sem tenant_id!');
      console.log('Execute o script de migração para atribuir tenant_id');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CORREÇÕES APLICADAS COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\nO banco Neon agora está otimizado e consistente.');
    console.log('As queries de demandas devem executar em < 200ms.');
    
  } catch (error) {
    console.error('\n❌ Erro ao aplicar correções:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyFixes();
