const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function debug() {
  try {
    await client.connect();
    console.log('✅ Conectado\n');
    
    // 1. Listar todos os tenants
    console.log('📋 TENANTS DISPONÍVEIS:');
    const tenants = await client.query('SELECT id, name FROM tenants ORDER BY name');
    tenants.rows.forEach(t => {
      console.log(`  ${t.id} - ${t.name}`);
    });
    console.log('');
    
    // 2. Verificar escola 181
    console.log('🏫 ESCOLA 181:');
    const escola = await client.query(`
      SELECT e.id, e.nome, e.tenant_id, t.name as tenant_name
      FROM escolas e
      LEFT JOIN tenants t ON e.tenant_id = t.id
      WHERE e.id = 181
    `);
    
    if (escola.rows.length > 0) {
      const e = escola.rows[0];
      console.log(`  ID: ${e.id}`);
      console.log(`  Nome: ${e.nome}`);
      console.log(`  Tenant ID: ${e.tenant_id}`);
      console.log(`  Tenant Nome: ${e.tenant_name || 'NULL'}`);
    } else {
      console.log('  ❌ Escola não encontrada');
    }
    console.log('');
    
    // 3. Verificar quantas escolas cada tenant tem
    console.log('📊 ESCOLAS POR TENANT:');
    const escolasPorTenant = await client.query(`
      SELECT t.name, t.id, COUNT(e.id) as total_escolas
      FROM tenants t
      LEFT JOIN escolas e ON e.tenant_id = t.id
      GROUP BY t.id, t.name
      ORDER BY t.name
    `);
    
    escolasPorTenant.rows.forEach(r => {
      console.log(`  ${r.name}: ${r.total_escolas} escolas`);
    });
    console.log('');
    
    // 4. Sugestão de correção
    console.log('💡 SOLUÇÃO:');
    console.log('Se você está usando o tenant "Brenda Nunes" no frontend,');
    console.log('mas a escola 181 pertence a outro tenant, você tem 2 opções:\n');
    console.log('1. Mudar a escola 181 para o tenant "Brenda Nunes":');
    console.log('   UPDATE escolas SET tenant_id = \'f830d523-25c9-4162-b241-6599df73171b\' WHERE id = 181;\n');
    console.log('2. Ou trocar no frontend para o tenant que a escola 181 pertence');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

debug();
