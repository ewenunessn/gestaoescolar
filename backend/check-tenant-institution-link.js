/**
 * Script para verificar a relação entre tenants e institutions
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

async function checkTenantInstitutionLink() {
  try {
    console.log('🔍 Verificando relação entre Tenants e Institutions...\n');

    // 1. Verificar se a tabela institutions existe
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'institutions'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Tabela "institutions" não existe!');
      console.log('💡 Você está usando apenas tenants, sem a hierarquia de institutions.\n');
      
      // Listar apenas tenants
      const tenants = await db.query(`
        SELECT id, name, slug, status, created_at
        FROM tenants
        ORDER BY created_at ASC
      `);

      console.log(`🏢 Tenants disponíveis: ${tenants.rows.length}\n`);
      tenants.rows.forEach((t, i) => {
        console.log(`${i + 1}. ${t.name} (${t.slug})`);
        console.log(`   ID: ${t.id}`);
        console.log(`   Status: ${t.status}`);
        console.log(`   Criado: ${new Date(t.created_at).toLocaleDateString('pt-BR')}\n`);
      });

      return;
    }

    // 2. Verificar estrutura da tabela institutions
    const columns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'institutions'
      ORDER BY ordinal_position
    `);

    console.log('📋 Estrutura da tabela institutions:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // 3. Verificar se há coluna tenant_id em institutions
    const hasTenantId = columns.rows.some(col => col.column_name === 'tenant_id');

    console.log(`\n🔗 Institutions tem tenant_id? ${hasTenantId ? 'Sim' : 'Não'}\n`);

    // 4. Listar institutions
    const institutions = await db.query(`
      SELECT * FROM institutions ORDER BY created_at ASC
    `);

    console.log(`🏛️  Institutions cadastradas: ${institutions.rows.length}\n`);
    
    if (institutions.rows.length > 0) {
      institutions.rows.forEach((inst, i) => {
        console.log(`${i + 1}. ${inst.name}`);
        console.log(`   ID: ${inst.id}`);
        console.log(`   Slug: ${inst.slug}`);
        if (inst.tenant_id) {
          console.log(`   Tenant ID: ${inst.tenant_id}`);
        }
        console.log(`   Status: ${inst.status}`);
        console.log(`   Tipo: ${inst.type || 'N/A'}`);
        console.log(`   Criado: ${new Date(inst.created_at).toLocaleDateString('pt-BR')}\n`);
      });
    }

    // 5. Listar tenants e verificar se estão linkados a institutions
    const tenants = await db.query(`
      SELECT id, name, slug, status, created_at
      FROM tenants
      ORDER BY created_at ASC
    `);

    console.log(`🏢 Tenants cadastrados: ${tenants.rows.length}\n`);

    for (const tenant of tenants.rows) {
      console.log(`📍 ${tenant.name} (${tenant.slug})`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Status: ${tenant.status}`);

      // Verificar se há institution linkada
      if (hasTenantId) {
        const linkedInst = await db.query(`
          SELECT id, name, slug FROM institutions WHERE tenant_id = $1
        `, [tenant.id]);

        if (linkedInst.rows.length > 0) {
          console.log(`   ✅ Linkado à institution: ${linkedInst.rows[0].name}`);
        } else {
          console.log(`   ⚠️  Não linkado a nenhuma institution`);
        }
      }

      // Contar dados do tenant
      const usuarios = await db.query(`SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = $1`, [tenant.id]);
      const escolas = await db.query(`SELECT COUNT(*) as total FROM escolas WHERE tenant_id = $1`, [tenant.id]);
      const produtos = await db.query(`SELECT COUNT(*) as total FROM produtos WHERE tenant_id = $1`, [tenant.id]);

      console.log(`   Dados: ${usuarios.rows[0].total} usuários, ${escolas.rows[0].total} escolas, ${produtos.rows[0].total} produtos\n`);
    }

    // 6. Verificar tenant específico "Secretaria de Benevides"
    const benevidesTenant = tenants.rows.find(t => t.slug === 'secretaria-de-benevides');
    
    if (benevidesTenant) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🎯 TENANT: Secretaria de Benevides`);
      console.log(`${'='.repeat(80)}\n`);
      console.log(`ID: ${benevidesTenant.id}`);
      console.log(`Status: ${benevidesTenant.status}`);
      
      if (hasTenantId) {
        const linkedInst = await db.query(`
          SELECT * FROM institutions WHERE tenant_id = $1
        `, [benevidesTenant.id]);

        if (linkedInst.rows.length > 0) {
          console.log(`\n✅ Linkado à Institution:`);
          console.log(`   Nome: ${linkedInst.rows[0].name}`);
          console.log(`   ID: ${linkedInst.rows[0].id}`);
          console.log(`   Slug: ${linkedInst.rows[0].slug}`);
        } else {
          console.log(`\n⚠️  NÃO está linkado a nenhuma institution`);
          console.log(`\n💡 Para criar uma institution e linkar:`);
          console.log(`   1. Acesse o admin panel`);
          console.log(`   2. Crie uma nova institution`);
          console.log(`   3. Associe o tenant_id: ${benevidesTenant.id}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

checkTenantInstitutionLink();
