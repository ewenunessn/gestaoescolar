/**
 * Script para adicionar coluna peso na tabela produtos
 * Execute: npx ts-node backend/src/scripts/add-peso-to-produtos.ts
 */

import db from '../database';

async function addPesoToProdutos() {
  try {
    console.log('🔄 Iniciando migração: adicionar coluna peso em produtos...');

    // Verificar se a coluna já existe
    const checkColumn = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'produtos' 
      AND column_name = 'peso'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna peso já existe na tabela produtos');
      return;
    }

    // Adicionar coluna peso
    await db.query(`
      ALTER TABLE produtos 
      ADD COLUMN peso DECIMAL(10,3)
    `);

    console.log('✅ Coluna peso adicionada com sucesso!');

    // Adicionar comentário
    await db.query(`
      COMMENT ON COLUMN produtos.peso IS 'Peso do produto em gramas'
    `);

    // Criar índice
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_produtos_peso ON produtos(peso)
    `);

    console.log('✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    throw error;
  } finally {
    // Conexão gerenciada pelo pool
  }
}

// Executar migração
addPesoToProdutos()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
