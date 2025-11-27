/**
 * Script para reorganizar dados em tenants reais
 * Remove o tenant padrão "Sistema Principal" e distribui dados corretamente
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

async function reorganizeTenants() {
  try {
    console.log('🔄 Reorganizando dados em tenants reais...\n');

    const tenantPadrao = '00000000-0000-0000-0000-000000000000';

    // 1. Verificar dados no tenant padrão
    const usuarios = await db.query(`
      SELECT id, nome, email, tipo FROM usuarios WHERE tenant_id = $1
    `, [tenantPadrao]);

    const escolas = await db.query(`
      SELECT id, nome FROM escolas WHERE tenant_id = $1
    `, [tenantPadrao]);

    const produtos = await db.query(`
      SELECT id, nome FROM produtos WHERE tenant_id = $1
    `, [tenantPadrao]);

    console.log('📊 Dados no tenant padrão "Sistema Principal":');
    console.log(`   Usuários: ${usuarios.rows.length}`);
    console.log(`   Escolas: ${escolas.rows.length}`);
    console.log(`   Produtos: ${produtos.rows.length}\n`);

    if (usuarios.rows.length === 0 && escolas.rows.length === 0 && produtos.rows.length === 0) {
      console.log('✅ Tenant padrão já está vazio!');
      
      if (!process.argv.includes('--delete-tenant')) {
        console.log('\n💡 Para deletar o tenant padrão, execute com --delete-tenant');
        return;
      }

      // Deletar tenant padrão
      await db.query(`DELETE FROM tenants WHERE id = $1`, [tenantPadrao]);
      console.log('✅ Tenant padrão deletado!');
      return;
    }

    // 2. Listar tenants disponíveis (exceto o padrão)
    const tenantsDisponiveis = await db.query(`
      SELECT id, name, slug FROM tenants 
      WHERE id != $1 AND status = 'active'
      ORDER BY created_at ASC
    `, [tenantPadrao]);

    console.log(`🏢 Tenants disponíveis para migração: ${tenantsDisponiveis.rows.length}\n`);
    tenantsDisponiveis.rows.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name} (${t.slug}) - ID: ${t.id}`);
    });

    if (tenantsDisponiveis.rows.length === 0) {
      console.log('\n❌ Nenhum tenant disponível para migração!');
      console.log('💡 Crie tenants primeiro antes de reorganizar os dados.');
      return;
    }

    // 3. Estratégia de migração
    console.log('\n📋 ESTRATÉGIA DE MIGRAÇÃO:\n');
    console.log('Opção 1: Migrar TUDO para um tenant específico');
    console.log('Opção 2: Distribuir dados entre múltiplos tenants');
    console.log('Opção 3: Criar novo tenant e migrar tudo para lá\n');

    if (!process.argv.includes('--fix')) {
      console.log('⚠️  ATENÇÃO: Este script irá reorganizar todos os dados!');
      console.log('   Para confirmar, execute com --fix e escolha uma opção:\n');
      console.log('   --option=1 --tenant-id=<ID>  : Migrar tudo para um tenant específico');
      console.log('   --option=2                    : Distribuir (requer configuração manual)');
      console.log('   --option=3 --tenant-name=<NOME> : Criar novo tenant e migrar\n');
      console.log('📋 Modo de visualização apenas.');
      return;
    }

    // 4. Executar migração baseada na opção escolhida
    const option = process.argv.find(arg => arg.startsWith('--option='))?.split('=')[1];

    if (option === '1') {
      // Migrar tudo para um tenant específico
      const tenantId = process.argv.find(arg => arg.startsWith('--tenant-id='))?.split('=')[1];
      
      if (!tenantId) {
        console.log('❌ Erro: --tenant-id é obrigatório para opção 1');
        return;
      }

      // Verificar se o tenant existe
      const tenantCheck = await db.query(`SELECT name FROM tenants WHERE id = $1`, [tenantId]);
      if (tenantCheck.rows.length === 0) {
        console.log(`❌ Erro: Tenant ${tenantId} não encontrado`);
        return;
      }

      console.log(`\n🔧 Migrando todos os dados para: ${tenantCheck.rows[0].name}\n`);

      // Migrar usuários
      const updateUsuarios = await db.query(`
        UPDATE usuarios SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id, nome
      `, [tenantId, tenantPadrao]);
      console.log(`✅ ${updateUsuarios.rows.length} usuários migrados`);

      // Migrar escolas
      const updateEscolas = await db.query(`
        UPDATE escolas SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id, nome
      `, [tenantId, tenantPadrao]);
      console.log(`✅ ${updateEscolas.rows.length} escolas migradas`);

      // Migrar produtos
      const updateProdutos = await db.query(`
        UPDATE produtos SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id, nome
      `, [tenantId, tenantPadrao]);
      console.log(`✅ ${updateProdutos.rows.length} produtos migrados`);

      // Migrar fornecedores
      const updateFornecedores = await db.query(`
        UPDATE fornecedores SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id, nome
      `, [tenantId, tenantPadrao]);
      console.log(`✅ ${updateFornecedores.rows.length} fornecedores migrados`);

      // Migrar contratos
      const updateContratos = await db.query(`
        UPDATE contratos SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id
      `, [tenantId, tenantPadrao]);
      console.log(`✅ ${updateContratos.rows.length} contratos migrados`);

      // Migrar demandas
      const updateDemandas = await db.query(`
        UPDATE demandas SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id
      `, [tenantId, tenantPadrao]);
      console.log(`✅ ${updateDemandas.rows.length} demandas migradas`);

      // Migrar guias
      const updateGuias = await db.query(`
        UPDATE guias SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id
      `, [tenantId, tenantPadrao]);
      console.log(`✅ ${updateGuias.rows.length} guias migradas`);

      console.log('\n✅ Migração concluída!');
      console.log(`\n💡 Agora você pode deletar o tenant padrão executando:`);
      console.log(`   node backend/reorganize-tenants-properly.js --fix --delete-tenant`);

    } else if (option === '3') {
      // Criar novo tenant e migrar
      const tenantName = process.argv.find(arg => arg.startsWith('--tenant-name='))?.split('=')[1];
      
      if (!tenantName) {
        console.log('❌ Erro: --tenant-name é obrigatório para opção 3');
        return;
      }

      const tenantSlug = tenantName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      console.log(`\n🔧 Criando novo tenant: ${tenantName} (${tenantSlug})\n`);

      // Criar tenant
      const novoTenant = await db.query(`
        INSERT INTO tenants (name, slug, status, settings, limits)
        VALUES ($1, $2, 'active', '{}', '{
          "maxUsers": 100,
          "maxSchools": 50,
          "maxProducts": 1000,
          "storageLimit": 1024,
          "apiRateLimit": 100,
          "maxContracts": 50,
          "maxOrders": 1000
        }')
        RETURNING id, name
      `, [tenantName, tenantSlug]);

      const novoTenantId = novoTenant.rows[0].id;
      console.log(`✅ Tenant criado: ${novoTenant.rows[0].name} (${novoTenantId})\n`);

      // Migrar todos os dados para o novo tenant
      const updateUsuarios = await db.query(`
        UPDATE usuarios SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id, nome
      `, [novoTenantId, tenantPadrao]);
      console.log(`✅ ${updateUsuarios.rows.length} usuários migrados`);

      const updateEscolas = await db.query(`
        UPDATE escolas SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id, nome
      `, [novoTenantId, tenantPadrao]);
      console.log(`✅ ${updateEscolas.rows.length} escolas migradas`);

      const updateProdutos = await db.query(`
        UPDATE produtos SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id, nome
      `, [novoTenantId, tenantPadrao]);
      console.log(`✅ ${updateProdutos.rows.length} produtos migrados`);

      const updateFornecedores = await db.query(`
        UPDATE fornecedores SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id, nome
      `, [novoTenantId, tenantPadrao]);
      console.log(`✅ ${updateFornecedores.rows.length} fornecedores migrados`);

      const updateContratos = await db.query(`
        UPDATE contratos SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id
      `, [novoTenantId, tenantPadrao]);
      console.log(`✅ ${updateContratos.rows.length} contratos migrados`);

      const updateDemandas = await db.query(`
        UPDATE demandas SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id
      `, [novoTenantId, tenantPadrao]);
      console.log(`✅ ${updateDemandas.rows.length} demandas migradas`);

      const updateGuias = await db.query(`
        UPDATE guias SET tenant_id = $1 WHERE tenant_id = $2
        RETURNING id
      `, [novoTenantId, tenantPadrao]);
      console.log(`✅ ${updateGuias.rows.length} guias migradas`);

      console.log('\n✅ Migração concluída!');
      console.log(`\n💡 Agora você pode deletar o tenant padrão executando:`);
      console.log(`   node backend/reorganize-tenants-properly.js --fix --delete-tenant`);

    } else {
      console.log('❌ Opção inválida ou não especificada');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

reorganizeTenants();
