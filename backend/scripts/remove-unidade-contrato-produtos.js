#!/usr/bin/env node

/**
 * Script para remover coluna unidade de contrato_produtos
 * A unidade agora vem direto da tabela produtos
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configurações de conexão
const LOCAL_CONFIG = {
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar',
  ssl: false
};

const NEON_CONFIG = {
  connectionString: process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
};

async function aplicarMigration(config, ambiente) {
  const pool = new Pool(config);
  
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Aplicando migration em ${ambiente}...`);
    console.log(`${'='.repeat(60)}\n`);

    // Ler arquivo de migration
    const migrationPath = path.join(__dirname, '../src/migrations/20260303_remove_unidade_from_contrato_produtos.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Executar migration
    await pool.query(migrationSQL);

    console.log(`\n✅ Migration aplicada com sucesso em ${ambiente}!\n`);

    // Verificar resultado
    const verificacao = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM contrato_produtos) as total_contrato_produtos,
        (SELECT COUNT(*) FROM produtos WHERE unidade IS NOT NULL) as produtos_com_unidade,
        (SELECT COUNT(*) FROM contrato_produtos_backup_unidade) as registros_backup,
        (SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'contrato_produtos' AND column_name = 'unidade'
        )) as coluna_unidade_existe
    `);

    const stats = verificacao.rows[0];
    
    console.log('📊 Estatísticas:');
    console.log(`   - Contrato-produtos: ${stats.total_contrato_produtos}`);
    console.log(`   - Produtos com unidade: ${stats.produtos_com_unidade}`);
    console.log(`   - Registros em backup: ${stats.registros_backup}`);
    console.log(`   - Coluna unidade existe: ${stats.coluna_unidade_existe ? '❌ SIM (ERRO!)' : '✅ NÃO'}`);

    if (stats.coluna_unidade_existe) {
      throw new Error('Coluna unidade ainda existe em contrato_produtos!');
    }

  } catch (error) {
    console.error(`\n❌ Erro ao aplicar migration em ${ambiente}:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('\n🚀 Iniciando remoção de unidade de contrato_produtos...\n');

  try {
    // Aplicar em LOCAL
    await aplicarMigration(LOCAL_CONFIG, 'LOCAL');

    // Aplicar em NEON
    await aplicarMigration(NEON_CONFIG, 'NEON');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration aplicada com sucesso em AMBOS os ambientes!');
    console.log('='.repeat(60));
    console.log('\n📝 Próximos passos:');
    console.log('   1. Testar queries que usam unidade');
    console.log('   2. Verificar frontend');
    console.log('   3. Atualizar documentação\n');

  } catch (error) {
    console.error('\n❌ Erro durante a execução:', error.message);
    process.exit(1);
  }
}

main();
