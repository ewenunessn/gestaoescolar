/**
 * Script para forçar deleção do tenant padrão com todas as dependências
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

async function forceDeleteTenantPadrao() {
  try {
    console.log('🗑️  Forçando deleção do tenant padrão...\n');

    const tenantPadrao = '00000000-0000-0000-0000-000000000000';

    if (!process.argv.includes('--force')) {
      console.log('⚠️  ATENÇÃO: Este script irá deletar PERMANENTEMENTE:');
      console.log('   - O tenant "Sistema Principal"');
      console.log('   - Todos os dados relacionados (contratos, movimentações, etc.)');
      console.log('\n   Para confirmar, execute com --force\n');
      return;
    }

    console.log('🔧 Deletando dados relacionados ao tenant...\n');

    // Deletar em ordem de dependências (do mais dependente para o menos)
    
    // 1. Movimentações de consumo de contrato
    try {
      const result = await db.query(`
        DELETE FROM movimentacoes_consumo_contrato 
        WHERE contrato_produto_id IN (
          SELECT id FROM contrato_produtos WHERE tenant_id = $1
        )
      `, [tenantPadrao]);
      console.log(`✅ ${result.rowCount} movimentações de consumo deletadas`);
    } catch (error) {
      console.log('⚠️  Erro ao deletar movimentações:', error.message);
    }

    // 2. Contrato produtos
    try {
      const result = await db.query(`DELETE FROM contrato_produtos WHERE tenant_id = $1`, [tenantPadrao]);
      console.log(`✅ ${result.rowCount} contrato_produtos deletados`);
    } catch (error) {
      console.log('⚠️  Erro ao deletar contrato_produtos:', error.message);
    }

    // 3. Contratos
    try {
      const result = await db.query(`DELETE FROM contratos WHERE tenant_id = $1`, [tenantPadrao]);
      console.log(`✅ ${result.rowCount} contratos deletados`);
    } catch (error) {
      console.log('⚠️  Erro ao deletar contratos:', error.message);
    }

    // 4. Tenant alerts
    try {
      const result = await db.query(`DELETE FROM tenant_alerts WHERE tenant_id = $1`, [tenantPadrao]);
      console.log(`✅ ${result.rowCount} alertas deletados`);
    } catch (error) {
      console.log('⚠️  Tabela tenant_alerts não existe');
    }

    // 5. Tenant users
    try {
      const result = await db.query(`DELETE FROM tenant_users WHERE tenant_id = $1`, [tenantPadrao]);
      console.log(`✅ ${result.rowCount} relações tenant_users deletadas`);
    } catch (error) {
      console.log('⚠️  Tabela tenant_users não existe');
    }

    // 6. Finalmente, deletar o tenant
    console.log('\n🔧 Deletando tenant...');
    const result = await db.query(`DELETE FROM tenants WHERE id = $1 RETURNING name`, [tenantPadrao]);
    
    if (result.rows.length > 0) {
      console.log(`✅ Tenant "${result.rows[0].name}" deletado com sucesso!\n`);
    } else {
      console.log('⚠️  Tenant não encontrado\n');
    }

    // Verificar tenants restantes
    const tenantsRestantes = await db.query(`
      SELECT id, name, slug, status FROM tenants ORDER BY created_at ASC
    `);

    console.log(`🏢 Tenants restantes: ${tenantsRestantes.rows.length}\n`);
    tenantsRestantes.rows.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name} (${t.slug}) - ${t.status}`);
      console.log(`      ID: ${t.id}\n`);
    });

    console.log('✅ Operação concluída!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Faça logout e login novamente');
    console.log('   2. Selecione "Secretaria de Benevides"');
    console.log('   3. Todos os seus dados estarão lá!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

forceDeleteTenantPadrao();
