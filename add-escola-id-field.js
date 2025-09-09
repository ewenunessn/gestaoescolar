const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function addEscolaIdField() {
  try {
    console.log('🔧 Adicionando campo escola_id à tabela gas_controle...');
    
    // Verificar se o campo já existe
    const checkField = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'gas_controle' AND column_name = 'escola_id'
    `);
    
    if (checkField.rows.length > 0) {
      console.log('✅ Campo escola_id já existe na tabela!');
      return;
    }
    
    // Adicionar o campo escola_id (sem referência por enquanto)
    await pool.query(`
      ALTER TABLE gas_controle 
      ADD COLUMN escola_id INTEGER
    `);
    
    console.log('✅ Campo escola_id adicionado com sucesso!');
    
    // Verificar a estrutura atualizada
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'gas_controle' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estrutura atualizada da tabela gas_controle:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar campo escola_id:', error.message);
  } finally {
    await pool.end();
  }
}

addEscolaIdField();