#!/usr/bin/env node

/**
 * Script para verificar e corrigir a chave primária da tabela modalidades no NEON
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const NEON_CONFIG = {
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
};

async function fixModalidadesPK() {
  const pool = new Pool(NEON_CONFIG);
  
  try {
    console.log('\n🔍 Verificando estrutura da tabela modalidades no NEON...\n');

    // Verificar se a tabela existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'modalidades'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Tabela modalidades não existe no NEON!');
      process.exit(1);
    }

    // Verificar constraints existentes
    const constraints = await pool.query(`
      SELECT 
        con.conname as constraint_name,
        con.contype as constraint_type,
        pg_get_constraintdef(con.oid) as definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'modalidades'
      AND rel.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `);

    console.log('📋 Constraints existentes:');
    if (constraints.rows.length === 0) {
      console.log('   (nenhuma)');
    } else {
      constraints.rows.forEach(row => {
        console.log(`   - ${row.constraint_name} (${row.constraint_type}): ${row.definition}`);
      });
    }

    // Verificar se já tem PK
    const hasPK = constraints.rows.some(row => row.constraint_type === 'p');

    if (hasPK) {
      console.log('\n✅ Tabela modalidades já possui chave primária!');
    } else {
      console.log('\n⚠️  Tabela modalidades NÃO possui chave primária!');
      console.log('🔧 Adicionando chave primária...');

      // Verificar se a coluna id existe
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'modalidades'
        ORDER BY ordinal_position;
      `);

      console.log('\n📋 Colunas da tabela:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });

      const hasIdColumn = columns.rows.some(col => col.column_name === 'id');

      if (!hasIdColumn) {
        console.log('\n❌ Coluna id não existe! Criando...');
        await pool.query(`
          ALTER TABLE modalidades 
          ADD COLUMN id SERIAL;
        `);
        console.log('✅ Coluna id criada!');
      }

      // Adicionar PK
      await pool.query(`
        ALTER TABLE modalidades 
        ADD CONSTRAINT modalidades_pkey PRIMARY KEY (id);
      `);

      console.log('✅ Chave primária adicionada com sucesso!');
    }

    // Verificar novamente
    const finalCheck = await pool.query(`
      SELECT 
        con.conname as constraint_name,
        con.contype as constraint_type
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'modalidades'
      AND con.contype = 'p'
      AND rel.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `);

    if (finalCheck.rows.length > 0) {
      console.log('\n✅ Verificação final: Chave primária está configurada corretamente!');
    } else {
      console.log('\n❌ Erro: Chave primária não foi configurada!');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

fixModalidadesPK().catch(error => {
  console.error('\n❌ Erro durante a execução:', error);
  process.exit(1);
});
