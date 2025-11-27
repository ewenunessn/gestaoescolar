const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function addTenantColumn() {
  try {
    await client.connect();
    console.log('✅ Conectado ao Neon\n');
    
    // 1. Verificar estrutura atual
    console.log('🔍 Verificando estrutura atual...');
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'demandas_escolas'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas atuais:');
    columns.rows.forEach(c => console.log('  -', c.column_name));
    
    const hasTenantId = columns.rows.some(c => c.column_name === 'tenant_id');
    
    if (hasTenantId) {
      console.log('\n✅ Coluna tenant_id já existe!\n');
    } else {
      console.log('\n❌ Coluna tenant_id não existe. Criando...\n');
      
      // 2. Adicionar coluna tenant_id
      console.log('1️⃣ Adicionando coluna tenant_id...');
      await client.query(`
        ALTER TABLE demandas_escolas 
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
      `);
      console.log('   ✅ Coluna adicionada\n');
      
      // 3. Buscar tenant padrão
      console.log('2️⃣ Buscando tenant padrão...');
      const tenantResult = await client.query(`
        SELECT id, name FROM tenants ORDER BY created_at LIMIT 1
      `);
      
      if (tenantResult.rows.length === 0) {
        console.error('   ❌ Nenhum tenant encontrado!');
        return;
      }
      
      const defaultTenant = tenantResult.rows[0];
      console.log(`   ✅ Tenant padrão: ${defaultTenant.name} (${defaultTenant.id})\n`);
      
      // 4. Atualizar registros existentes
      console.log('3️⃣ Atualizando registros existentes...');
      const updateResult = await client.query(`
        UPDATE demandas_escolas 
        SET tenant_id = $1 
        WHERE tenant_id IS NULL
      `, [defaultTenant.id]);
      
      console.log(`   ✅ ${updateResult.rowCount} registros atualizados\n`);
      
      // 5. Tornar coluna NOT NULL
      console.log('4️⃣ Tornando coluna NOT NULL...');
      await client.query(`
        ALTER TABLE demandas_escolas 
        ALTER COLUMN tenant_id SET NOT NULL
      `);
      console.log('   ✅ Coluna configurada como NOT NULL\n');
    }
    
    // 6. Criar índices
    console.log('5️⃣ Criando índices...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_tenant_id ON demandas_escolas(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_tenant_data ON demandas_escolas(tenant_id, data_solicitacao DESC)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_tenant_created ON demandas_escolas(tenant_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_tenant_status ON demandas_escolas(tenant_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_demandas_escolas_escola_id ON demandas_escolas(tenant_id, escola_id) WHERE escola_id IS NOT NULL'
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
    
    // 7. Desabilitar RLS
    console.log('\n6️⃣ Desabilitando RLS...');
    await client.query('ALTER TABLE demandas_escolas DISABLE ROW LEVEL SECURITY');
    console.log('   ✅ RLS desabilitado');
    
    // 8. Atualizar estatísticas
    console.log('\n7️⃣ Atualizando estatísticas...');
    await client.query('ANALYZE demandas_escolas');
    console.log('   ✅ Estatísticas atualizadas');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

addTenantColumn();
