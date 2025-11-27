const { Pool } = require('pg');

const connectionString = 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';

const pool = new Pool({
  connectionString,
  ssl: false
});

async function updateLimits() {
  const client = await pool.connect();
  
  try {
    const institutionId = '6a10d4a5-2a32-40f2-bdd8-96a99e6188a4';
    
    console.log('🔍 Verificando instituição...\n');
    
    // Buscar instituição
    const inst = await client.query(
      'SELECT id, name, limits FROM institutions WHERE id = $1',
      [institutionId]
    );
    
    if (inst.rows.length === 0) {
      console.log('❌ Instituição não encontrada!');
      return;
    }
    
    const institution = inst.rows[0];
    console.log(`📋 Instituição: ${institution.name}`);
    console.log(`📋 Limites atuais:`, institution.limits);
    
    // Contar tenants atuais
    const tenantCount = await client.query(
      'SELECT COUNT(*) as count FROM tenants WHERE institution_id = $1',
      [institutionId]
    );
    
    console.log(`\n📊 Tenants atuais: ${tenantCount.rows[0].count}`);
    
    // Atualizar limites
    const newLimits = {
      ...institution.limits,
      max_tenants: 10,  // Aumentar para 10
      max_users: 100,
      max_schools: 50
    };
    
    console.log(`\n🔧 Atualizando limites para:`, newLimits);
    
    await client.query(
      'UPDATE institutions SET limits = $1 WHERE id = $2',
      [JSON.stringify(newLimits), institutionId]
    );
    
    console.log('✅ Limites atualizados com sucesso!');
    
    // Verificar
    const updated = await client.query(
      'SELECT limits FROM institutions WHERE id = $1',
      [institutionId]
    );
    
    console.log('\n📋 Novos limites:', updated.rows[0].limits);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

updateLimits();
