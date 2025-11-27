/**
 * Script para corrigir incompatibilidade de tenant entre escola e usuários
 * Move a escola para o tenant onde estão os usuários
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

async function fixEscolaTenantMismatch() {
  try {
    console.log('🔧 Corrigindo incompatibilidade de tenant...\n');

    const escolaId = 84;
    const tenantCorreto = '00000000-0000-0000-0000-000000000000'; // Sistema Principal

    // 1. Verificar escola atual
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
    console.log('   Tenant atual:', escolaData.tenant_id);
    console.log('   Tenant correto:', tenantCorreto);

    if (escolaData.tenant_id === tenantCorreto) {
      console.log('\n✅ A escola já está no tenant correto!');
      return;
    }

    // 2. Verificar se deve aplicar correção
    if (!process.argv.includes('--fix')) {
      console.log('\n⚠️  ATENÇÃO: Este script irá atualizar o tenant_id da escola.');
      console.log('   Para confirmar, execute novamente com o parâmetro --fix');
      console.log('\n📋 Modo de visualização apenas. Use --fix para aplicar as correções.');
      return;
    }

    console.log('\n🔧 Aplicando correção...\n');

    // 3. Atualizar escola
    const updateEscola = await db.query(`
      UPDATE escolas
      SET tenant_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nome, tenant_id
    `, [tenantCorreto, escolaId]);

    console.log('✅ Escola atualizada:');
    console.log(`   - ${updateEscola.rows[0].nome}`);
    console.log(`   - Novo tenant_id: ${updateEscola.rows[0].tenant_id}`);

    // 4. Verificar produtos da escola que também precisam ser atualizados
    const produtosEscola = await db.query(`
      SELECT DISTINCT p.id, p.nome, p.tenant_id
      FROM produtos p
      JOIN estoque_escolas ee ON ee.produto_id = p.id
      WHERE ee.escola_id = $1
        AND p.tenant_id != $2
    `, [escolaId, tenantCorreto]);

    if (produtosEscola.rows.length > 0) {
      console.log(`\n⚠️  Encontrados ${produtosEscola.rows.length} produtos com tenant diferente.`);
      console.log('   Estes produtos também precisam ser atualizados para o mesmo tenant.');
      
      // Atualizar produtos
      const updateProdutos = await db.query(`
        UPDATE produtos p
        SET tenant_id = $1, updated_at = NOW()
        FROM estoque_escolas ee
        WHERE p.id = ee.produto_id
          AND ee.escola_id = $2
          AND p.tenant_id != $1
        RETURNING p.id, p.nome
      `, [tenantCorreto, escolaId]);

      console.log(`\n✅ ${updateProdutos.rows.length} produtos atualizados:`);
      updateProdutos.rows.slice(0, 10).forEach(p => {
        console.log(`   - Produto ${p.id}: ${p.nome}`);
      });
      if (updateProdutos.rows.length > 10) {
        console.log(`   ... e mais ${updateProdutos.rows.length - 10} produtos`);
      }
    }

    // 5. Verificar lotes
    const lotes = await db.query(`
      SELECT COUNT(*) as total
      FROM estoque_lotes el
      WHERE el.escola_id = $1
    `, [escolaId]);

    if (parseInt(lotes.rows[0].total) > 0) {
      console.log(`\n📦 Encontrados ${lotes.rows[0].total} lotes para esta escola.`);
      console.log('   Os lotes herdam o tenant da escola automaticamente via JOIN.');
    }

    console.log('\n✅ Correção aplicada com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Faça logout e login novamente no sistema');
    console.log('   2. Verifique se o tenant_id no localStorage está correto');
    console.log(`   3. O tenant_id deve ser: ${tenantCorreto}`);
    console.log('   4. Tente registrar uma movimentação de estoque novamente');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

fixEscolaTenantMismatch();
