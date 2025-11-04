const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost', 
  database: process.env.DB_NAME || 'alimentacao_escolar',
  password: process.env.DB_PASSWORD || 'admin123',
  port: process.env.DB_PORT || 5432,
  ssl: false
});

async function analyzeDatabase() {
  try {
    console.log('🔍 Analisando estrutura do banco...');
    
    // 1. Verificar estrutura das tabelas
    console.log('\n=== ESTRUTURA DAS TABELAS ===');
    const structureQuery = `
      SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
      FROM information_schema.columns 
      WHERE table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes', 'produtos', 'escolas')
      ORDER BY table_name, ordinal_position;
    `;
    const structure = await pool.query(structureQuery);
    console.table(structure.rows);

    // 2. Verificar foreign keys
    console.log('\n=== FOREIGN KEYS EXISTENTES ===');
    const fkQuery = `
      SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes')
      ORDER BY tc.table_name;
    `;
    const fks = await pool.query(fkQuery);
    console.table(fks.rows);

    // 3. Verificar tenant_id existente
    console.log('\n=== COLUNAS TENANT_ID ===');
    const tenantQuery = `
      SELECT 
          t.table_name,
          CASE WHEN c.column_name IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_tenant_id
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON (
          c.table_name = t.table_name 
          AND c.column_name = 'tenant_id'
      )
      WHERE t.table_name IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes', 'produtos', 'escolas')
      ORDER BY t.table_name;
    `;
    const tenants = await pool.query(tenantQuery);
    console.table(tenants.rows);

    // 4. Verificar escola_id em estoque_lotes
    console.log('\n=== ESCOLA_ID EM ESTOQUE_LOTES ===');
    const escolaIdQuery = `
      SELECT 
          CASE WHEN column_name IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_escola_id
      FROM information_schema.columns 
      WHERE table_name = 'estoque_lotes' AND column_name = 'escola_id';
    `;
    const escolaId = await pool.query(escolaIdQuery);
    console.table(escolaId.rows);

    // 5. Contar registros
    console.log('\n=== CONTAGEM DE REGISTROS ===');
    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico', 'estoque_movimentacoes', 'produtos', 'escolas'];
    for (const table of tables) {
      try {
        const count = await pool.query(`SELECT COUNT(*) as total FROM ${table}`);
        console.log(`${table}: ${count.rows[0].total} registros`);
      } catch (err) {
        console.log(`${table}: ERRO - ${err.message}`);
      }
    }

    // 6. Verificar dependências críticas
    console.log('\n=== DEPENDÊNCIAS CRÍTICAS ===');
    try {
      const depQuery = `
        SELECT 
            COUNT(DISTINCT em.lote_id) as lotes_referenciados,
            COUNT(*) as total_movimentacoes
        FROM estoque_movimentacoes em
        JOIN estoque_lotes el ON el.id = em.lote_id;
      `;
      const deps = await pool.query(depQuery);
      console.table(deps.rows);
    } catch (err) {
      console.log('Erro ao verificar dependências:', err.message);
    }

    // 7. Verificar tenants
    console.log('\n=== TENANTS EXISTENTES ===');
    try {
      const tenantsQuery = `
        SELECT 
            COUNT(*) as total_tenants,
            string_agg(slug, ', ') as slugs_existentes
        FROM tenants;
      `;
      const existingTenants = await pool.query(tenantsQuery);
      console.table(existingTenants.rows);
    } catch (err) {
      console.log('Erro ao verificar tenants:', err.message);
    }

  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeDatabase();