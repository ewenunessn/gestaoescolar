/**
 * Script para corrigir tenant de TODAS as escolas para o tenant onde estão os usuários
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

async function fixAllEscolasTenant() {
  try {
    console.log('🔧 Corrigindo tenant de todas as escolas...\n');

    const tenantCorreto = '00000000-0000-0000-0000-000000000000'; // Sistema Principal

    // 1. Verificar quantas escolas precisam ser corrigidas
    const escolasParaCorrigir = await db.query(`
      SELECT id, nome, tenant_id
      FROM escolas
      WHERE tenant_id != $1 OR tenant_id IS NULL
      ORDER BY id
    `, [tenantCorreto]);

    console.log(`📊 Escolas que precisam ser corrigidas: ${escolasParaCorrigir.rows.length}`);
    
    if (escolasParaCorrigir.rows.length === 0) {
      console.log('✅ Todas as escolas já estão no tenant correto!');
      return;
    }

    console.log('\nEscolas:');
    escolasParaCorrigir.rows.forEach(e => {
      console.log(`   - ${e.id}: ${e.nome} (tenant atual: ${e.tenant_id || 'NULL'})`);
    });

    // 2. Verificar se deve aplicar correção
    if (!process.argv.includes('--fix')) {
      console.log('\n⚠️  ATENÇÃO: Este script irá atualizar o tenant_id de todas as escolas.');
      console.log(`   Tenant que será usado: Sistema Principal (${tenantCorreto})`);
      console.log('   Para confirmar, execute novamente com o parâmetro --fix');
      console.log('\n📋 Modo de visualização apenas. Use --fix para aplicar as correções.');
      return;
    }

    console.log('\n🔧 Aplicando correções...\n');

    // 3. Atualizar todas as escolas
    const updateEscolas = await db.query(`
      UPDATE escolas
      SET tenant_id = $1, updated_at = NOW()
      WHERE tenant_id != $1 OR tenant_id IS NULL
      RETURNING id, nome, tenant_id
    `, [tenantCorreto]);

    console.log(`✅ ${updateEscolas.rows.length} escolas atualizadas:`);
    updateEscolas.rows.forEach(e => {
      console.log(`   - ${e.id}: ${e.nome}`);
    });

    // 4. Atualizar todos os produtos para o mesmo tenant
    const updateProdutos = await db.query(`
      UPDATE produtos
      SET tenant_id = $1, updated_at = NOW()
      WHERE tenant_id != $1 OR tenant_id IS NULL
      RETURNING id, nome
    `, [tenantCorreto]);

    console.log(`\n✅ ${updateProdutos.rows.length} produtos atualizados`);
    if (updateProdutos.rows.length <= 20) {
      updateProdutos.rows.forEach(p => {
        console.log(`   - ${p.id}: ${p.nome}`);
      });
    } else {
      console.log(`   (Mostrando primeiros 20 de ${updateProdutos.rows.length})`);
      updateProdutos.rows.slice(0, 20).forEach(p => {
        console.log(`   - ${p.id}: ${p.nome}`);
      });
    }

    // 5. Verificar fornecedores
    const updateFornecedores = await db.query(`
      UPDATE fornecedores
      SET tenant_id = $1, updated_at = NOW()
      WHERE tenant_id != $1 OR tenant_id IS NULL
      RETURNING id, nome
    `, [tenantCorreto]);

    if (updateFornecedores.rows.length > 0) {
      console.log(`\n✅ ${updateFornecedores.rows.length} fornecedores atualizados`);
    }

    // 6. Verificar contratos
    const updateContratos = await db.query(`
      UPDATE contratos
      SET tenant_id = $1, updated_at = NOW()
      WHERE tenant_id != $1 OR tenant_id IS NULL
      RETURNING id, numero_contrato
    `, [tenantCorreto]);

    if (updateContratos.rows.length > 0) {
      console.log(`\n✅ ${updateContratos.rows.length} contratos atualizados`);
    }

    console.log('\n✅ Correção aplicada com sucesso!');
    console.log('\n📝 Próximos passos:');
    console.log('   1. Faça logout e login novamente no sistema');
    console.log('   2. Verifique se consegue ver os produtos no estoque');
    console.log('   3. Tente registrar uma movimentação de estoque');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

fixAllEscolasTenant();
