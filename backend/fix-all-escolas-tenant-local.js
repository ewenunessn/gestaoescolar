const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function fixAllEscolas() {
  try {
    await client.connect();
    console.log('✅ Conectado\n');
    
    // Buscar tenant padrão
    const tenant = await client.query('SELECT id, name FROM tenants ORDER BY created_at LIMIT 1');
    const tenantId = tenant.rows[0].id;
    console.log(`Tenant padrão: ${tenant.rows[0].name}\n`);
    
    // Atualizar todas as escolas sem tenant
    const result = await client.query(`
      UPDATE escolas
      SET tenant_id = $1
      WHERE tenant_id IS NULL OR tenant_id != $1
      RETURNING id, nome
    `, [tenantId]);
    
    console.log(`✅ ${result.rowCount} escolas atualizadas:`);
    result.rows.forEach(e => console.log(`  - ${e.id}: ${e.nome}`));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

fixAllEscolas();
