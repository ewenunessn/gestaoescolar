#!/usr/bin/env node
/**
 * Script para adicionar coluna unidade na tabela produtos
 * Aplica em ambos os ambientes: local e Neon
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurações
const LOCAL_URL = process.env.DATABASE_URL || 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar';
const NEON_URL = process.env.POSTGRES_URL;

async function aplicarMigration(connectionString, ambiente) {
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log(`\n🚀 Aplicando migration em ${ambiente}...`);

    const migrationPath = path.join(__dirname, '../src/migrations/20260303_add_unidade_to_produtos.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);

    // Verificar se foi aplicado
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'produtos' AND column_name = 'unidade'
    `);

    if (result.rows.length > 0) {
      console.log(`✅ Coluna 'unidade' adicionada com sucesso em ${ambiente}!`);
      console.log(`   Tipo: ${result.rows[0].data_type}`);
      console.log(`   Default: ${result.rows[0].column_default}`);
    } else {
      console.log(`❌ Erro: Coluna 'unidade' não foi criada em ${ambiente}`);
    }

    // Contar produtos atualizados
    const countResult = await pool.query(`
      SELECT unidade, COUNT(*) as total 
      FROM produtos 
      GROUP BY unidade 
      ORDER BY total DESC
    `);

    console.log(`\n📊 Distribuição de unidades em ${ambiente}:`);
    countResult.rows.forEach(row => {
      console.log(`   ${row.unidade}: ${row.total} produto(s)`);
    });

    await pool.end();
    return true;
  } catch (error) {
    console.error(`❌ Erro ao aplicar migration em ${ambiente}:`, error.message);
    await pool.end();
    return false;
  }
}

async function main() {
  console.log('🔧 Adicionando coluna unidade na tabela produtos\n');
  console.log('=' .repeat(60));

  let sucessoLocal = false;
  let sucessoNeon = false;

  // Aplicar no banco local
  console.log('\n📍 BANCO LOCAL');
  console.log('-'.repeat(60));
  sucessoLocal = await aplicarMigration(LOCAL_URL, 'LOCAL');

  // Aplicar no Neon se configurado
  if (NEON_URL) {
    console.log('\n☁️  BANCO NEON');
    console.log('-'.repeat(60));
    sucessoNeon = await aplicarMigration(NEON_URL, 'NEON');
  } else {
    console.log('\n⚠️  POSTGRES_URL não configurado - pulando Neon');
  }

  // Resumo
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMO');
  console.log('='.repeat(60));
  console.log(`Local: ${sucessoLocal ? '✅ Sucesso' : '❌ Falhou'}`);
  console.log(`Neon:  ${NEON_URL ? (sucessoNeon ? '✅ Sucesso' : '❌ Falhou') : '⏭️  Não configurado'}`);

  const todosOk = sucessoLocal && (!NEON_URL || sucessoNeon);
  process.exit(todosOk ? 0 : 1);
}

main();
