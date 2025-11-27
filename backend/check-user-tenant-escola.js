const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

async function checkUserTenantEscola() {
  try {
    await pool.connect();
    console.log('✅ Conectado ao banco LOCAL\n');
    
    // Verificar usuário Ewerton
    console.log('🔍 Verificando usuário Ewerton...');
    const user = await pool.query(`
      SELECT id, nome, email, tipo, tenant_id
      FROM usuarios
      WHERE email = 'ewerton@gmail.com'
    `);
    
    if (user.rows.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    const usuario = user.rows[0];
    console.log(`  ID: ${usuario.id}`);
    console.log(`  Nome: ${usuario.nome}`);
    console.log(`  Email: ${usuario.email}`);
    console.log(`  Tipo: ${usuario.tipo}`);
    console.log(`  Tenant ID: ${usuario.tenant_id || 'NULL'}\n`);
    
    if (!usuario.tenant_id) {
      console.log('⚠️  Usuário sem tenant_id!');
      return;
    }
    
    // Verificar tenant do usuário
    console.log('🔍 Verificando tenant do usuário...');
    const tenant = await pool.query(`
      SELECT id, name, slug
      FROM tenants
      WHERE id = $1
    `, [usuario.tenant_id]);
    
    if (tenant.rows.length > 0) {
      console.log(`  ✅ Tenant: ${tenant.rows[0].name} (${tenant.rows[0].id})\n`);
    }
    
    // Verificar escola 181
    console.log('🔍 Verificando escola 181...');
    const escola = await pool.query(`
      SELECT id, nome, tenant_id, ativo
      FROM escolas
      WHERE id = 181
    `);
    
    if (escola.rows.length === 0) {
      console.log('  ❌ Escola 181 não encontrada\n');
      return;
    }
    
    const esc = escola.rows[0];
    console.log(`  ID: ${esc.id}`);
    console.log(`  Nome: ${esc.nome}`);
    console.log(`  Tenant ID: ${esc.tenant_id}`);
    console.log(`  Ativo: ${esc.ativo}\n`);
    
    // Comparar tenants
    if (usuario.tenant_id === esc.tenant_id) {
      console.log('✅ Usuário e escola pertencem ao MESMO tenant!');
    } else {
      console.log('❌ PROBLEMA: Usuário e escola pertencem a tenants DIFERENTES!');
      console.log(`   Usuário tenant: ${usuario.tenant_id}`);
      console.log(`   Escola tenant: ${esc.tenant_id}\n`);
      
      console.log('🔄 Corrigindo: atribuindo escola ao tenant do usuário...');
      await pool.query(`
        UPDATE escolas
        SET tenant_id = $1
        WHERE id = 181
      `, [usuario.tenant_id]);
      
      console.log('✅ Escola atualizada!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkUserTenantEscola();
