/**
 * Script para verificar incompatibilidade de tenant entre usuário e escola
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const db = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end()
};

async function checkUserTenantMismatch() {
  try {
    console.log('🔍 Verificando incompatibilidade de tenant entre usuários e escolas...\n');

    const escolaId = 84;

    // 1. Buscar a escola e seu tenant
    const escola = await db.query(`
      SELECT id, nome, tenant_id
      FROM escolas
      WHERE id = $1
    `, [escolaId]);

    if (escola.rows.length === 0) {
      console.log(`❌ Escola ${escolaId} não encontrada!`);
      return;
    }

    const escolaData = escola.rows[0];
    console.log('📍 Escola:', escolaData.nome);
    console.log('   Tenant ID:', escolaData.tenant_id);

    // 2. Buscar tenant da escola
    const tenantEscola = await db.query(`
      SELECT id, name, slug
      FROM tenants
      WHERE id = $1
    `, [escolaData.tenant_id]);

    if (tenantEscola.rows.length > 0) {
      console.log('   Tenant:', tenantEscola.rows[0].name, `(${tenantEscola.rows[0].slug})`);
    }

    // 3. Listar todos os usuários ativos
    const usuarios = await db.query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.tenant_id,
        u.tipo,
        t.name as tenant_name,
        t.slug as tenant_slug
      FROM usuarios u
      LEFT JOIN tenants t ON t.id = u.tenant_id
      WHERE u.ativo = true
      ORDER BY u.id
    `);

    console.log(`\n👥 Usuários ativos (${usuarios.rows.length}):`);
    usuarios.rows.forEach(u => {
      const tenantMatch = u.tenant_id === escolaData.tenant_id;
      const icon = tenantMatch ? '✅' : '❌';
      console.log(`\n   ${icon} ${u.nome} (${u.email})`);
      console.log(`      ID: ${u.id}, Tipo: ${u.tipo}`);
      console.log(`      Tenant: ${u.tenant_name || 'N/A'} (${u.tenant_slug || 'N/A'})`);
      console.log(`      Tenant ID: ${u.tenant_id || 'NULL'}`);
      if (!tenantMatch) {
        console.log(`      ⚠️  Não pode acessar a escola ${escolaData.nome}`);
      }
    });

    // 4. Verificar se há usuários que podem acessar a escola
    const usuariosCompativeis = usuarios.rows.filter(u => u.tenant_id === escolaData.tenant_id);

    console.log('\n📊 Resumo:');
    console.log(`   Total de usuários: ${usuarios.rows.length}`);
    console.log(`   Usuários compatíveis com a escola: ${usuariosCompativeis.length}`);
    console.log(`   Usuários incompatíveis: ${usuarios.rows.length - usuariosCompativeis.length}`);

    if (usuariosCompativeis.length === 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO:');
      console.log('   Nenhum usuário tem acesso à escola porque não há usuários no tenant da escola!');
      console.log('\n💡 SOLUÇÃO:');
      console.log('   Opção 1: Atualizar o tenant_id dos usuários para o tenant da escola');
      console.log(`   Opção 2: Atualizar o tenant_id da escola para o tenant dos usuários`);
      console.log(`   Opção 3: Criar novos usuários no tenant da escola`);
      
      // Sugerir qual opção é melhor
      const tenantMaisComum = usuarios.rows.reduce((acc, u) => {
        acc[u.tenant_id] = (acc[u.tenant_id] || 0) + 1;
        return acc;
      }, {});
      
      const tenantComMaisUsuarios = Object.entries(tenantMaisComum)
        .sort((a, b) => b[1] - a[1])[0];
      
      if (tenantComMaisUsuarios) {
        const tenantInfo = await db.query(`
          SELECT name, slug FROM tenants WHERE id = $1
        `, [tenantComMaisUsuarios[0]]);
        
        if (tenantInfo.rows.length > 0) {
          console.log(`\n💡 RECOMENDAÇÃO:`);
          console.log(`   A maioria dos usuários (${tenantComMaisUsuarios[1]}) está no tenant: ${tenantInfo.rows[0].name}`);
          console.log(`   Considere atualizar a escola para este tenant.`);
          console.log(`\n   Execute:`);
          console.log(`   UPDATE escolas SET tenant_id = '${tenantComMaisUsuarios[0]}' WHERE id = ${escolaId};`);
        }
      }
    } else {
      console.log('\n✅ Há usuários que podem acessar a escola');
      console.log('   Usuários compatíveis:');
      usuariosCompativeis.forEach(u => {
        console.log(`   - ${u.nome} (${u.email})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

checkUserTenantMismatch();
