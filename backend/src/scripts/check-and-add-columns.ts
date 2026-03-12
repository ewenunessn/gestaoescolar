/**
 * Script para verificar e adicionar colunas marca e peso
 * Execute: npx ts-node backend/src/scripts/check-and-add-columns.ts
 */

import db from '../database';

async function checkAndAddColumns() {
  try {
    console.log('🔍 Verificando estrutura das tabelas...\n');

    // Verificar colunas em produtos
    console.log('📋 Tabela: produtos');
    const produtosColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'produtos'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas existentes:');
    produtosColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const produtosColumnNames = produtosColumns.rows.map(r => r.column_name);
    
    // Adicionar coluna peso em produtos se não existir
    if (!produtosColumnNames.includes('peso')) {
      console.log('\n⚠️  Coluna peso não existe em produtos. Adicionando...');
      await db.query(`ALTER TABLE produtos ADD COLUMN peso DECIMAL(10,3)`);
      console.log('✅ Coluna peso adicionada em produtos');
    } else {
      console.log('\n✅ Coluna peso já existe em produtos');
    }

    // Adicionar coluna unidade em produtos se não existir
    if (!produtosColumnNames.includes('unidade')) {
      console.log('\n⚠️  Coluna unidade não existe em produtos. Adicionando...');
      await db.query(`ALTER TABLE produtos ADD COLUMN unidade VARCHAR(50)`);
      console.log('✅ Coluna unidade adicionada em produtos');
    } else {
      console.log('✅ Coluna unidade já existe em produtos');
    }

    // Verificar colunas em contrato_produtos
    console.log('\n📋 Tabela: contrato_produtos');
    const cpColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contrato_produtos'
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas existentes:');
    cpColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const cpColumnNames = cpColumns.rows.map(r => r.column_name);
    
    // Adicionar coluna marca em contrato_produtos se não existir
    if (!cpColumnNames.includes('marca')) {
      console.log('\n⚠️  Coluna marca não existe em contrato_produtos. Adicionando...');
      await db.query(`ALTER TABLE contrato_produtos ADD COLUMN marca VARCHAR(255)`);
      console.log('✅ Coluna marca adicionada em contrato_produtos');
    } else {
      console.log('\n✅ Coluna marca já existe em contrato_produtos');
    }

    // Adicionar coluna peso em contrato_produtos se não existir
    if (!cpColumnNames.includes('peso')) {
      console.log('\n⚠️  Coluna peso não existe em contrato_produtos. Adicionando...');
      await db.query(`ALTER TABLE contrato_produtos ADD COLUMN peso DECIMAL(10,3)`);
      console.log('✅ Coluna peso adicionada em contrato_produtos');
    } else {
      console.log('✅ Coluna peso já existe em contrato_produtos');
    }

    console.log('\n✅ Verificação concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao verificar/adicionar colunas:', error);
    throw error;
  }
}

// Executar verificação
checkAndAddColumns()
  .then(() => {
    console.log('\n✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
