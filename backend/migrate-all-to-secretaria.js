const { Pool } = require('pg');
require('dotenv').config();

// URL do Neon (produção)
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrateAllData() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Migrando todos os dados para Secretaria de Educação - 2026...\n');
    
    // 1. Buscar o tenant de destino
    const targetTenant = await client.query(`
      SELECT id, name, slug 
      FROM tenants 
      WHERE slug = 'secretaria-educacao'
    `);
    
    if (targetTenant.rows.length === 0) {
      console.error('❌ Tenant "secretaria-educacao" não encontrado!');
      return;
    }
    
    const targetTenantId = targetTenant.rows[0].id;
    console.log(`✅ Tenant de destino: ${targetTenant.rows[0].name} (${targetTenantId})\n`);
    
    // 2. Buscar todos os outros tenants
    const otherTenants = await client.query(`
      SELECT id, name, slug 
      FROM tenants 
      WHERE id != $1
      ORDER BY name
    `, [targetTenantId]);
    
    console.log(`📋 Encontrados ${otherTenants.rows.length} outros tenants:\n`);
    otherTenants.rows.forEach(t => {
      console.log(`   - ${t.name} (${t.slug})`);
    });
    
    console.log('\n🔄 Iniciando migração...\n');
    
    // 3. Migrar dados de cada tabela
    const tables = [
      'escolas',
      'produtos', 
      'contratos',
      'fornecedores',
      'modalidades',
      'refeicoes',
      'pedidos',
      'estoque_escolas',
      'estoque_lotes',
      'estoque_escolas_historico'
    ];
    
    for (const table of tables) {
      try {
        const result = await client.query(`
          UPDATE ${table} 
          SET tenant_id = $1 
          WHERE tenant_id != $1
        `, [targetTenantId]);
        
        console.log(`✅ ${table}: ${result.rowCount} registros migrados`);
      } catch (err) {
        console.log(`⚠️  ${table}: tabela não existe ou erro - ${err.message}`);
      }
    }
    
    // 4. Migrar relacionamentos
    try {
      const result = await client.query(`
        UPDATE escola_modalidades 
        SET escola_id = e.id
        FROM escolas e
        WHERE e.tenant_id = $1
        AND escola_modalidades.escola_id IN (
          SELECT id FROM escolas WHERE tenant_id != $1
        )
      `, [targetTenantId]);
      console.log(`✅ escola_modalidades: ${result.rowCount} registros ajustados`);
    } catch (err) {
      console.log(`⚠️  escola_modalidades: ${err.message}`);
    }
    
    try {
      const result = await client.query(`
        UPDATE contrato_produtos 
        SET contrato_id = c.id
        FROM contratos c
        WHERE c.tenant_id = $1
        AND contrato_produtos.contrato_id IN (
          SELECT id FROM contratos WHERE tenant_id != $1
        )
      `, [targetTenantId]);
      console.log(`✅ contrato_produtos: ${result.rowCount} registros ajustados`);
    } catch (err) {
      console.log(`⚠️  contrato_produtos: ${err.message}`);
    }
    
    // 5. Migrar usuários
    try {
      const result = await client.query(`
        UPDATE tenant_users 
        SET tenant_id = $1 
        WHERE tenant_id != $1
      `, [targetTenantId]);
      console.log(`✅ tenant_users: ${result.rowCount} usuários migrados`);
    } catch (err) {
      console.log(`⚠️  tenant_users: ${err.message}`);
    }
    
    console.log('\n✅ Migração concluída!');
    console.log('\n📊 Resumo final:');
    
    // Mostrar contagem final
    for (const table of tables) {
      try {
        const count = await client.query(`
          SELECT COUNT(*) as total 
          FROM ${table} 
          WHERE tenant_id = $1
        `, [targetTenantId]);
        console.log(`   ${table}: ${count.rows[0].total} registros`);
      } catch (err) {
        // Ignorar
      }
    }
    
    console.log('\n💡 Agora você pode deletar os outros tenants vazios!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAllData()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script falhou:', error);
    process.exit(1);
  });
