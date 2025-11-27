/**
 * Script para analisar a distribuição de dados entre tenants
 * e sugerir a melhor estratégia
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

async function analyzeTenantDistribution() {
  try {
    console.log('📊 Analisando distribuição de dados entre tenants...\n');

    // 1. Listar todos os tenants
    const tenants = await db.query(`
      SELECT id, name, slug, status, created_at
      FROM tenants
      ORDER BY created_at ASC
    `);

    console.log(`🏢 Tenants encontrados: ${tenants.rows.length}\n`);

    for (const tenant of tenants.rows) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📍 Tenant: ${tenant.name} (${tenant.slug})`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Criado em: ${new Date(tenant.created_at).toLocaleDateString('pt-BR')}`);
      console.log(`${'='.repeat(80)}`);

      // Contar usuários
      const usuarios = await db.query(`
        SELECT COUNT(*) as total, 
               COUNT(CASE WHEN ativo = true THEN 1 END) as ativos
        FROM usuarios
        WHERE tenant_id = $1
      `, [tenant.id]);

      console.log(`\n👥 Usuários: ${usuarios.rows[0].total} (${usuarios.rows[0].ativos} ativos)`);

      if (parseInt(usuarios.rows[0].total) > 0) {
        const usuariosList = await db.query(`
          SELECT id, nome, email, tipo, ativo
          FROM usuarios
          WHERE tenant_id = $1
          ORDER BY id
        `, [tenant.id]);

        usuariosList.rows.forEach(u => {
          console.log(`   - ${u.nome} (${u.email}) - ${u.tipo} ${u.ativo ? '✅' : '❌'}`);
        });
      }

      // Contar escolas
      const escolas = await db.query(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN ativo = true THEN 1 END) as ativos
        FROM escolas
        WHERE tenant_id = $1
      `, [tenant.id]);

      console.log(`\n🏫 Escolas: ${escolas.rows[0].total} (${escolas.rows[0].ativos} ativas)`);

      // Contar produtos
      const produtos = await db.query(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN ativo = true THEN 1 END) as ativos
        FROM produtos
        WHERE tenant_id = $1
      `, [tenant.id]);

      console.log(`📦 Produtos: ${produtos.rows[0].total} (${produtos.rows[0].ativos} ativos)`);

      // Contar fornecedores
      const fornecedores = await db.query(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN ativo = true THEN 1 END) as ativos
        FROM fornecedores
        WHERE tenant_id = $1
      `, [tenant.id]);

      console.log(`🏭 Fornecedores: ${fornecedores.rows[0].total} (${fornecedores.rows[0].ativos} ativos)`);

      // Contar contratos
      const contratos = await db.query(`
        SELECT COUNT(*) as total
        FROM contratos
        WHERE tenant_id = $1
      `, [tenant.id]);

      console.log(`📄 Contratos: ${contratos.rows[0].total}`);

      // Contar demandas
      const demandas = await db.query(`
        SELECT COUNT(*) as total
        FROM demandas
        WHERE tenant_id = $1
      `, [tenant.id]);

      console.log(`📋 Demandas: ${demandas.rows[0].total}`);

      // Contar guias
      const guias = await db.query(`
        SELECT COUNT(*) as total
        FROM guias
        WHERE tenant_id = $1
      `, [tenant.id]);

      console.log(`📑 Guias: ${guias.rows[0].total}`);
    }

    // 2. Análise e recomendação
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('📊 ANÁLISE E RECOMENDAÇÃO');
    console.log(`${'='.repeat(80)}\n`);

    // Encontrar tenant com mais dados
    const tenantStats = [];
    for (const tenant of tenants.rows) {
      const usuarios = await db.query(`SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = $1`, [tenant.id]);
      const escolas = await db.query(`SELECT COUNT(*) as total FROM escolas WHERE tenant_id = $1`, [tenant.id]);
      const produtos = await db.query(`SELECT COUNT(*) as total FROM produtos WHERE tenant_id = $1`, [tenant.id]);
      
      tenantStats.push({
        tenant: tenant,
        usuarios: parseInt(usuarios.rows[0].total),
        escolas: parseInt(escolas.rows[0].total),
        produtos: parseInt(produtos.rows[0].total),
        total: parseInt(usuarios.rows[0].total) + parseInt(escolas.rows[0].total) + parseInt(produtos.rows[0].total)
      });
    }

    tenantStats.sort((a, b) => b.total - a.total);

    console.log('Distribuição de dados por tenant:\n');
    tenantStats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.tenant.name}`);
      console.log(`   Usuários: ${stat.usuarios}, Escolas: ${stat.escolas}, Produtos: ${stat.produtos}`);
      console.log(`   Total: ${stat.total} registros\n`);
    });

    const tenantPrincipal = tenantStats[0];
    console.log(`💡 RECOMENDAÇÃO:`);
    console.log(`   O tenant "${tenantPrincipal.tenant.name}" tem a maior quantidade de dados.`);
    console.log(`   Considere usar este como tenant principal para todos os dados.\n`);

    // Verificar se há dados órfãos
    const escolasSemTenant = await db.query(`SELECT COUNT(*) as total FROM escolas WHERE tenant_id IS NULL`);
    const produtosSemTenant = await db.query(`SELECT COUNT(*) as total FROM produtos WHERE tenant_id IS NULL`);
    const usuariosSemTenant = await db.query(`SELECT COUNT(*) as total FROM usuarios WHERE tenant_id IS NULL`);

    if (parseInt(escolasSemTenant.rows[0].total) > 0 || 
        parseInt(produtosSemTenant.rows[0].total) > 0 || 
        parseInt(usuariosSemTenant.rows[0].total) > 0) {
      console.log(`\n⚠️  DADOS ÓRFÃOS (sem tenant):`);
      console.log(`   Escolas: ${escolasSemTenant.rows[0].total}`);
      console.log(`   Produtos: ${produtosSemTenant.rows[0].total}`);
      console.log(`   Usuários: ${usuariosSemTenant.rows[0].total}`);
    }

    console.log(`\n📝 OPÇÕES:`);
    console.log(`   1. Manter tudo no "Sistema Principal" (situação atual)`);
    console.log(`   2. Criar tenants separados por município/secretaria`);
    console.log(`   3. Mover dados para um tenant específico`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

analyzeTenantDistribution();
