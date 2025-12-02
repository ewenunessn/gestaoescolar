require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: false
});

async function listTenantsUsuarios() {
  const client = await pool.connect();
  
  try {
    console.log('🏢 Listando tenants e usuários...\n');
    
    // 1. Listar todos os tenants
    const tenantsResult = await client.query(`
      SELECT id, name, slug, status
      FROM tenants
      ORDER BY name
    `);
    
    console.log(`📋 Tenants cadastrados (${tenantsResult.rows.length}):\n`);
    
    for (const tenant of tenantsResult.rows) {
      console.log(`🏢 ${tenant.name} (${tenant.slug})`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Status: ${tenant.status}`);
      
      // Contar usuários deste tenant
      const usuariosCount = await client.query(`
        SELECT COUNT(*) as total
        FROM usuarios
        WHERE tenant_id = $1
      `, [tenant.id]);
      
      // Contar escolas deste tenant
      const escolasCount = await client.query(`
        SELECT COUNT(*) as total
        FROM escolas
        WHERE tenant_id = $1
      `, [tenant.id]);
      
      console.log(`   Usuários: ${usuariosCount.rows[0].total}`);
      console.log(`   Escolas: ${escolasCount.rows[0].total}`);
      
      // Listar alguns usuários
      const usuarios = await client.query(`
        SELECT id, nome, email, tipo
        FROM usuarios
        WHERE tenant_id = $1
        ORDER BY id
        LIMIT 3
      `, [tenant.id]);
      
      if (usuarios.rows.length > 0) {
        console.log(`   Usuários:`);
        usuarios.rows.forEach(u => {
          console.log(`     - ID ${u.id}: ${u.nome} (${u.email}) - ${u.tipo}`);
        });
      }
      
      console.log('');
    }
    
    // 2. Verificar qual tenant tem a escola 181
    const escolaResult = await client.query(`
      SELECT e.id, e.nome, e.tenant_id, t.name as tenant_name
      FROM escolas e
      LEFT JOIN tenants t ON t.id = e.tenant_id
      WHERE e.id = 181
    `);
    
    if (escolaResult.rows.length > 0) {
      const escola = escolaResult.rows[0];
      console.log('🏫 Escola 181:');
      console.log(`   Nome: ${escola.nome}`);
      console.log(`   Tenant: ${escola.tenant_name} (${escola.tenant_id})`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

listTenantsUsuarios();
