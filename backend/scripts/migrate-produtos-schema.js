#!/usr/bin/env node

/**
 * Script de migração para refatorar a tabela produtos
 * Adiciona novos campos: estoque_minimo, fator_correcao, tipo_fator_correcao, unidade_distribuicao, peso
 * Remove campos: unidade, fator_divisao, marca (já foram removidos manualmente no Neon)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migração da tabela produtos...\n');

    // Iniciar transação
    await client.query('BEGIN');

    // 1. Verificar se a tabela produtos existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'produtos'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      throw new Error('❌ Tabela produtos não encontrada!');
    }

    console.log('✅ Tabela produtos encontrada');

    // 2. Verificar colunas existentes
    const columnsCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'produtos'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Colunas atuais:');
    columnsCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    const existingColumns = columnsCheck.rows.map(row => row.column_name);

    // 3. Adicionar coluna estoque_minimo se não existir
    if (!existingColumns.includes('estoque_minimo')) {
      console.log('\n➕ Adicionando coluna estoque_minimo...');
      await client.query(`
        ALTER TABLE produtos 
        ADD COLUMN estoque_minimo INTEGER DEFAULT 0;
      `);
      console.log('✅ Coluna estoque_minimo adicionada');
    } else {
      console.log('\n⏭️  Coluna estoque_minimo já existe');
    }

    // 4. Adicionar coluna fator_correcao se não existir
    if (!existingColumns.includes('fator_correcao')) {
      console.log('\n➕ Adicionando coluna fator_correcao...');
      await client.query(`
        ALTER TABLE produtos 
        ADD COLUMN fator_correcao NUMERIC(5, 3) NOT NULL DEFAULT 1.000;
      `);
      console.log('✅ Coluna fator_correcao adicionada');
    } else {
      console.log('\n⏭️  Coluna fator_correcao já existe');
    }

    // 5. Adicionar coluna tipo_fator_correcao se não existir
    if (!existingColumns.includes('tipo_fator_correcao')) {
      console.log('\n➕ Adicionando coluna tipo_fator_correcao...');
      await client.query(`
        ALTER TABLE produtos 
        ADD COLUMN tipo_fator_correcao VARCHAR(20) NOT NULL DEFAULT 'perda';
      `);
      console.log('✅ Coluna tipo_fator_correcao adicionada');
    } else {
      console.log('\n⏭️  Coluna tipo_fator_correcao já existe');
    }

    // 6. Adicionar coluna unidade_distribuicao se não existir
    if (!existingColumns.includes('unidade_distribuicao')) {
      console.log('\n➕ Adicionando coluna unidade_distribuicao...');
      await client.query(`
        ALTER TABLE produtos 
        ADD COLUMN unidade_distribuicao VARCHAR(50);
      `);
      console.log('✅ Coluna unidade_distribuicao adicionada');
    } else {
      console.log('\n⏭️  Coluna unidade_distribuicao já existe');
    }

    // 7. Adicionar coluna peso se não existir
    if (!existingColumns.includes('peso')) {
      console.log('\n➕ Adicionando coluna peso...');
      await client.query(`
        ALTER TABLE produtos 
        ADD COLUMN peso NUMERIC;
      `);
      console.log('✅ Coluna peso adicionada');
    } else {
      console.log('\n⏭️  Coluna peso já existe');
    }

    // 8. Adicionar coluna updated_at se não existir
    if (!existingColumns.includes('updated_at')) {
      console.log('\n➕ Adicionando coluna updated_at...');
      await client.query(`
        ALTER TABLE produtos 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log('✅ Coluna updated_at adicionada');
    } else {
      console.log('\n⏭️  Coluna updated_at já existe');
    }

    // 9. Verificar se colunas antigas ainda existem (devem ter sido removidas manualmente)
    const oldColumns = ['unidade', 'fator_divisao', 'marca'];
    const remainingOldColumns = oldColumns.filter(col => existingColumns.includes(col));
    
    if (remainingOldColumns.length > 0) {
      console.log('\n⚠️  AVISO: As seguintes colunas antigas ainda existem:');
      remainingOldColumns.forEach(col => console.log(`   - ${col}`));
      console.log('\n   Essas colunas devem ser removidas manualmente se não estiverem mais em uso.');
    } else {
      console.log('\n✅ Colunas antigas já foram removidas');
    }

    // Commit da transação
    await client.query('COMMIT');

    // 10. Verificar estrutura final
    const finalColumns = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'produtos'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Estrutura final da tabela produtos:');
    console.log('┌─────────────────────────────┬──────────────────┬─────────────┬──────────────────────────┐');
    console.log('│ Coluna                      │ Tipo             │ Nullable    │ Default                  │');
    console.log('├─────────────────────────────┼──────────────────┼─────────────┼──────────────────────────┤');
    finalColumns.rows.forEach(col => {
      const colName = col.column_name.padEnd(27);
      const dataType = col.data_type.padEnd(16);
      const nullable = col.is_nullable.padEnd(11);
      const defaultVal = (col.column_default || '-').substring(0, 24).padEnd(24);
      console.log(`│ ${colName} │ ${dataType} │ ${nullable} │ ${defaultVal} │`);
    });
    console.log('└─────────────────────────────┴──────────────────┴─────────────┴──────────────────────────┘');

    // 11. Contar produtos
    const countResult = await client.query('SELECT COUNT(*) as total FROM produtos');
    console.log(`\n📊 Total de produtos na tabela: ${countResult.rows[0].total}`);

    console.log('\n✅ Migração concluída com sucesso!\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro durante a migração:', error.message);
    console.error('\n🔄 Rollback executado. Nenhuma alteração foi aplicada.\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar migração
runMigration().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
