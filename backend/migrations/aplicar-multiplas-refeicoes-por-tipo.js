const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false });

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔧 Aplicando migration: múltiplas preparações por tipo/dia...');

    // Remover constraint UNIQUE antiga
    await client.query(`
      ALTER TABLE cardapio_refeicoes_dia
      DROP CONSTRAINT IF EXISTS cardapio_refeicoes_dia_cardapio_modalidade_id_dia_tipo_refeicao_key
    `);
    console.log('✅ Constraint UNIQUE antiga removida');

    // Remover CHECK constraint antiga
    await client.query(`
      ALTER TABLE cardapio_refeicoes_dia
      DROP CONSTRAINT IF EXISTS cardapio_refeicoes_dia_tipo_refeicao_check
    `);
    console.log('✅ CHECK constraint antiga removida');

    // Adicionar nova CHECK com tipos genéricos + compatibilidade
    await client.query(`
      ALTER TABLE cardapio_refeicoes_dia
      ADD CONSTRAINT cardapio_refeicoes_dia_tipo_refeicao_check
      CHECK (tipo_refeicao IN ('refeicao', 'lanche', 'cafe_manha', 'ceia', 'almoco', 'jantar', 'lanche_manha', 'lanche_tarde'))
    `);
    console.log('✅ Nova CHECK constraint adicionada');

    // Adicionar UNIQUE apenas para evitar duplicata real (mesma preparação + mesmo tipo + mesmo dia)
    await client.query(`
      ALTER TABLE cardapio_refeicoes_dia
      DROP CONSTRAINT IF EXISTS cardapio_refeicoes_dia_unique_refeicao_dia
    `);
    await client.query(`
      ALTER TABLE cardapio_refeicoes_dia
      ADD CONSTRAINT cardapio_refeicoes_dia_unique_refeicao_dia
      UNIQUE(cardapio_modalidade_id, refeicao_id, dia, tipo_refeicao)
    `);
    console.log('✅ Nova UNIQUE constraint adicionada (por refeição específica)');

    console.log('\n✅ Migration aplicada com sucesso!');
    console.log('   Agora é possível adicionar múltiplas preparações do mesmo tipo no mesmo dia.');
  } catch (e) {
    console.error('❌ Erro:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
