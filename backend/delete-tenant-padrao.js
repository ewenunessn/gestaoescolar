/**
 * Script para deletar o tenant padrão "Sistema Principal"
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

async function deleteTenantPadrao() {
  try {
    console.log('🗑️  Deletando tenant padrão "Sistema Principal"...\n');

    const tenantPadrao = '00000000-0000-0000-0000-000000000000';

    // 1. Verificar se há dados no tenant
    const usuarios = await db.query(`SELECT COUNT(*) as total FROM usuarios WHERE tenant_id = $1`, [tenantPadrao]);
    const escolas = await db.query(`SELECT COUNT(*) as total FROM escolas WHERE tenant_id = $1`, [tenantPadrao]);
    const produtos = await db.query(`SELECT COUNT(*) as total FROM produtos WHERE tenant_id = $1`, [tenantPadrao]);

    console.log('📊 Dados no tenant padrão:');
    console.log(`   Usuários: ${usuarios.rows[0].total}`);
    console.log(`   Escolas: ${escolas.rows[0].total}`);
    console.log(`   Produtos: ${produtos.rows[0].total}\n`);

    if (parseInt(usuarios.rows[0].total) > 0 || 
        parseInt(escolas.rows[0].total) > 0 || 
        parseInt(produtos.rows[0].total) > 0) {
      console.log('❌ Erro: Tenant ainda tem dados!');
      console.log('💡 Execute primeiro: node backend/reorganize-tenants-properly.js');
      return;
    }

    if (!process.argv.includes('--confirm')) {
      console.log('⚠️  ATENÇÃO: Isso irá deletar permanentemente o tenant padrão!');
      console.log('   Para confirmar, execute com --confirm\n');
      return;
    }

    console.log('🔧 Deletando tenant...\n');

    // 2. Deletar registros relacionados primeiro (se houver)
    
    // Deletar tenant_alerts se existir
    try {
      await db.query(`DELETE FROM tenant_alerts WHERE tenant_id = $1`, [tenantPadrao]);
      console.log('✅ Alertas deletados');
    } catch (error) {
      console.log('⚠️  Tabela tenant_alerts não existe ou já está vazia');
    }

    // Deletar tenant_users se existir
    try {
      await db.query(`DELETE FROM tenant_users WHERE tenant_id = $1`, [tenantPadrao]);
      console.log('✅ Relações tenant_users deletadas');
    } catch (error) {
      console.log('⚠️  Tabela tenant_users não existe ou já está vazia');
    }

    // Deletar tenant_settings se existir
    try {
      await db.query(`DELETE FROM tenant_settings WHERE tenant_id = $1`, [tenantPadrao]);
      console.log('✅ Configurações deletadas');
    } catch (error) {
      console.log('⚠️  Tabela tenant_settings não existe ou já está vazia');
    }

    // 3. Deletar o tenant
    const result = await db.query(`DELETE FROM tenants WHERE id = $1 RETURNING name`, [tenantPadrao]);
    
    if (result.rows.length > 0) {
      console.log(`\n✅ Tenant "${result.rows[0].name}" deletado com sucesso!`);
    } else {
      console.log('\n⚠️  Tenant não encontrado (já foi deletado?)');
    }

    // 4. Verificar tenants restantes
    const tenantsRestantes = await db.query(`
      SELECT id, name, slug FROM tenants ORDER BY created_at ASC
    `);

    console.log(`\n🏢 Tenants restantes: ${tenantsRestantes.rows.length}\n`);
    tenantsRestantes.rows.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name} (${t.slug})`);
    });

    console.log('\n✅ Operação concluída!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Faça logout e login novamente no sistema');
    console.log('   2. Selecione o tenant "Secretaria de Benevides"');
    console.log('   3. Verifique se todos os dados estão acessíveis');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

deleteTenantPadrao();
