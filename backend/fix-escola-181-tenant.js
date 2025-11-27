const { Pool } = require('pg');

const localPool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function fixEscola181() {
  try {
    console.log('🔍 Verificando escola 181...\n');
    
    // LOCAL
    console.log('LOCAL:');
    const localEscola = await localPool.query(`
      SELECT id, nome, tenant_id, ativo
      FROM escolas
      WHERE id = 181
    `);
    
    if (localEscola.rows.length > 0) {
      const escola = localEscola.rows[0];
      console.log(`  ID: ${escola.id}`);
      console.log(`  Nome: ${escola.nome}`);
      console.log(`  Tenant ID: ${escola.tenant_id || 'NULL'}`);
      console.log(`  Ativo: ${escola.ativo}`);
      
      if (!escola.tenant_id) {
        console.log('\n  ⚠️  Escola sem tenant_id!');
        
        // Buscar tenant padrão
        const tenant = await localPool.query(`
          SELECT id, name FROM tenants ORDER BY created_at LIMIT 1
        `);
        
        if (tenant.rows.length > 0) {
          const tenantId = tenant.rows[0].id;
          console.log(`  🔄 Atribuindo tenant: ${tenant.rows[0].name} (${tenantId})`);
          
          await localPool.query(`
            UPDATE escolas
            SET tenant_id = $1
            WHERE id = 181
          `, [tenantId]);
          
          console.log('  ✅ Tenant atribuído no LOCAL');
        }
      } else {
        console.log('  ✅ Escola já tem tenant_id');
      }
    } else {
      console.log('  ❌ Escola 181 não encontrada no LOCAL');
    }
    
    console.log('\n' + '-'.repeat(60) + '\n');
    
    // NEON
    console.log('NEON:');
    const neonEscola = await neonPool.query(`
      SELECT id, nome, tenant_id, ativo
      FROM escolas
      WHERE id = 181
    `);
    
    if (neonEscola.rows.length > 0) {
      const escola = neonEscola.rows[0];
      console.log(`  ID: ${escola.id}`);
      console.log(`  Nome: ${escola.nome}`);
      console.log(`  Tenant ID: ${escola.tenant_id || 'NULL'}`);
      console.log(`  Ativo: ${escola.ativo}`);
      
      if (!escola.tenant_id) {
        console.log('\n  ⚠️  Escola sem tenant_id!');
        
        // Buscar tenant padrão
        const tenant = await neonPool.query(`
          SELECT id, name FROM tenants ORDER BY created_at LIMIT 1
        `);
        
        if (tenant.rows.length > 0) {
          const tenantId = tenant.rows[0].id;
          console.log(`  🔄 Atribuindo tenant: ${tenant.rows[0].name} (${tenantId})`);
          
          await neonPool.query(`
            UPDATE escolas
            SET tenant_id = $1
            WHERE id = 181
          `, [tenantId]);
          
          console.log('  ✅ Tenant atribuído no NEON');
        }
      } else {
        console.log('  ✅ Escola já tem tenant_id');
      }
    } else {
      console.log('  ❌ Escola 181 não encontrada no NEON');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ CORREÇÃO CONCLUÍDA!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

fixEscola181();
