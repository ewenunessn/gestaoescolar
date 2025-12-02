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

async function checkUsuario() {
  const client = await pool.connect();
  
  try {
    const tenantId = 'f830d523-25c9-4162-b241-6599df73171b';
    
    console.log('🔍 Verificando usuários do tenant...\n');
    
    // 1. Listar usuários do tenant
    const usuariosResult = await client.query(`
      SELECT id, nome, email, tipo, tenant_id, ativo
      FROM usuarios
      WHERE tenant_id = $1
      ORDER BY id
    `, [tenantId]);
    
    console.log(`👥 Usuários do tenant (${usuariosResult.rows.length} encontrados):`);
    usuariosResult.rows.forEach(u => {
      console.log(`  - ID: ${u.id}, Nome: ${u.nome}, Email: ${u.email}`);
      console.log(`    Tipo: ${u.tipo}, Ativo: ${u.ativo}`);
    });
    console.log('');
    
    // 2. Verificar se há usuários com tenant_id NULL
    const usuariosNullResult = await client.query(`
      SELECT id, nome, email, tipo, tenant_id, ativo
      FROM usuarios
      WHERE tenant_id IS NULL
      ORDER BY id
      LIMIT 5
    `);
    
    if (usuariosNullResult.rows.length > 0) {
      console.log(`⚠️  Usuários com tenant_id NULL (${usuariosNullResult.rows.length} encontrados):`);
      usuariosNullResult.rows.forEach(u => {
        console.log(`  - ID: ${u.id}, Nome: ${u.nome}, Email: ${u.email}`);
      });
      console.log('');
    }
    
    // 3. Verificar se o usuário ID 1 (usado no frontend) existe e seu tenant
    const usuario1Result = await client.query(`
      SELECT id, nome, email, tipo, tenant_id, ativo
      FROM usuarios
      WHERE id = 1
    `);
    
    if (usuario1Result.rows.length > 0) {
      const u = usuario1Result.rows[0];
      console.log('👤 Usuário ID 1 (usado no frontend):');
      console.log(`  Nome: ${u.nome}`);
      console.log(`  Email: ${u.email}`);
      console.log(`  Tenant: ${u.tenant_id}`);
      console.log(`  Ativo: ${u.ativo}`);
      console.log(`  Tenant Match: ${u.tenant_id === tenantId ? '✅' : '❌'}`);
      
      if (u.tenant_id !== tenantId) {
        console.log('\n⚠️  PROBLEMA: O usuário ID 1 tem tenant diferente da escola 181!');
        console.log(`   Usuário tenant: ${u.tenant_id}`);
        console.log(`   Escola tenant: ${tenantId}`);
      }
    } else {
      console.log('❌ Usuário ID 1 não encontrado!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsuario();
