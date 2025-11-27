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

async function fixEstoqueTenantMismatch() {
  try {
    console.log('🔧 Corrigindo tenant_id em estoque_escolas...\n');

    const tenantCorreto = '6b95b81f-8d1f-44b0-912c-68c2fdde9841'; // Secretaria de Benevides
    const tenantErrado = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f'; // Escola de Teste

    // Verificar registros com tenant errado
    const registrosErrados = await db.query(`
      SELECT ee.id, ee.escola_id, ee.produto_id, ee.quantidade_atual, ee.tenant_id,
             e.nome as escola_nome, p.nome as produto_nome
      FROM estoque_escolas ee
      JOIN escolas e ON e.id = ee.escola_id
      JOIN produtos p ON p.id = ee.produto_id
      WHERE ee.tenant_id != e.tenant_id
    `);

    console.log(`📊 Registros com tenant incompatível: ${registrosErrados.rows.length}\n`);

    if (registrosErrados.rows.length === 0) {
      console.log('✅ Nenhum registro com tenant incompatível!');
      return;
    }

    registrosErrados.rows.forEach(r => {
      console.log(`   Estoque ID ${r.id}:`);
      console.log(`   - Escola: ${r.escola_nome} (ID: ${r.escola_id})`);
      console.log(`   - Produto: ${r.produto_nome} (ID: ${r.produto_id})`);
      console.log(`   - Quantidade: ${r.quantidade_atual}`);
      console.log(`   - Tenant atual: ${r.tenant_id}`);
      console.log('');
    });

    if (!process.argv.includes('--fix')) {
      console.log('💡 Execute com --fix para corrigir');
      return;
    }

    console.log('🔧 Corrigindo...\n');

    // Corrigir tenant_id baseado no tenant da escola
    const result = await db.query(`
      UPDATE estoque_escolas ee
      SET tenant_id = e.tenant_id, updated_at = NOW()
      FROM escolas e
      WHERE ee.escola_id = e.id
        AND ee.tenant_id != e.tenant_id
      RETURNING ee.id, ee.escola_id, ee.produto_id
    `);

    console.log(`✅ ${result.rows.length} registros corrigidos!`);
    result.rows.forEach(r => {
      console.log(`   - Estoque ID ${r.id} (Escola ${r.escola_id}, Produto ${r.produto_id})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.end();
  }
}

fixEstoqueTenantMismatch();
