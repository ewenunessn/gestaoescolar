const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function fixDemandasEscolas() {
  try {
    await client.connect();
    console.log('✅ Conectado ao Neon\n');
    console.log('🔄 Aplicando correções na tabela demandas_escolas...\n');
    
    // 1. Desabilitar RLS
    console.log('1️⃣ Desabilitando RLS...');
    await client.query('ALTER TABLE demandas_escolas DISABLE ROW LEVEL SECURITY');
    console.log('   ✅ RLS desabilitado\n');
    
    // 2. Remover políticas
    console.log('2️⃣ Removendo políticas RLS...');
    await client.query('DROP POLICY IF EXISTS demandas_escolas_tenant_isolation ON demandas_escolas');
    await client.query('DROP POLICY IF EXISTS tenant_isolation_demandas_escolas ON demandas_escolas');
    console.log('   ✅ Políticas removidas\n');
    
    // 3. Criar índices
    console.log('3️⃣ Criando índices...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_tenant_id ON demandas_escolas(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_tenant_data ON demandas_escolas(tenant_id, data_solicitacao DESC)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_tenant_created ON demandas_escolas(tenant_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_tenant_status ON demandas_escolas(tenant_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_escola_id ON demandas_escolas(tenant_id, escola_id) WHERE escola_id IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_data ON demandas_escolas(data_solicitacao)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_escola_nome ON demandas_escolas(escola_nome) WHERE escola_nome IS NOT NULL'
    ];
    
    for (const sql of indexes) {
      const name = sql.match(/idx_\w+/)[0];
      try {
        await client.query(sql);
        console.log(`   ✅ ${name}`);
      } catch (e) {
        console.log(`   ⚠️  ${name} - ${e.message}`);
      }
    }
    console.log('');
    
    // 4. Atualizar estatísticas
    console.log('4️⃣ Atualizando estatísticas...');
    await client.query('ANALYZE demandas_escolas');
    await client.query('ANALYZE escolas');
    await client.query('ANALYZE usuarios');
    console.log('   ✅ Estatísticas atualizadas\n');
    
    // 5. Verificar
    console.log('5️⃣ Verificando resultado...\n');
    
    const rls = await client.query(`
      SELECT rowsecurity FROM pg_tables WHERE tablename = 'demandas_escolas'
    `);
    console.log(`   RLS: ${rls.rows[0].rowsecurity ? '❌ HABILITADO' : '✅ DESABILITADO'}`);
    
    const idxCount = await client.query(`
      SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'demandas_escolas'
    `);
    console.log(`   Índices: ${idxCount.rows[0].count} criados`);
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT tenant_id) as tenants,
        COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sem_tenant
      FROM demandas_escolas
    `);
    
    console.log(`   Demandas: ${stats.rows[0].total} total`);
    console.log(`   Tenants: ${stats.rows[0].tenants} diferentes`);
    console.log(`   Sem tenant_id: ${stats.rows[0].sem_tenant}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CORREÇÕES APLICADAS COM SUCESSO!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

fixDemandasEscolas();
