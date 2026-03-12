require('dotenv').config();
const { Client } = require('pg');

async function addPesoColumn() {
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao Neon');

    // Verificar se a coluna já existe
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'produtos' 
        AND column_name = 'peso'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('ℹ️  Coluna peso já existe na tabela produtos');
    } else {
      // Adicionar coluna peso
      await client.query(`
        ALTER TABLE produtos 
        ADD COLUMN peso DECIMAL(10,2)
      `);
      console.log('✅ Coluna peso adicionada à tabela produtos');
    }

    // Verificar outras colunas que podem estar faltando
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'produtos'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Colunas atuais na tabela produtos:');
    columns.rows.forEach(row => {
      console.log(`   - ${row.column_name}`);
    });

    console.log('\n✅ Script executado com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addPesoColumn().catch(console.error);
