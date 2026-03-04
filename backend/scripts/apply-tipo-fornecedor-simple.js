const db = require('../dist/database');

async function aplicarMigration() {
  console.log('🚀 Aplicando migration: add_tipo_fornecedor\n');

  const sql = `
    -- Adicionar coluna tipo_fornecedor
    ALTER TABLE fornecedores 
    ADD COLUMN IF NOT EXISTS tipo_fornecedor VARCHAR(20) DEFAULT 'empresa' CHECK (tipo_fornecedor IN ('empresa', 'cooperativa', 'individual'));

    -- Atualizar fornecedores existentes (padrão: empresa)
    UPDATE fornecedores 
    SET tipo_fornecedor = 'empresa' 
    WHERE tipo_fornecedor IS NULL;

    -- Criar índice para melhorar performance de consultas por tipo
    CREATE INDEX IF NOT EXISTS idx_fornecedores_tipo ON fornecedores(tipo_fornecedor);
  `;

  try {
    await db.query(sql);
    console.log('✅ Migration aplicada com sucesso!\n');

    // Verificar resultado
    const result = await db.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'fornecedores' AND column_name = 'tipo_fornecedor'
    `);
    
    console.log('🔍 Coluna tipo_fornecedor criada:');
    console.log(result.rows);

    // Verificar fornecedores
    const fornecedores = await db.query(`
      SELECT id, nome, tipo_fornecedor FROM fornecedores LIMIT 5
    `);
    
    console.log('\n📦 Primeiros 5 fornecedores:');
    console.log(fornecedores.rows);

  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message);
  }

  process.exit(0);
}

aplicarMigration();
