require('dotenv').config();
const { Client } = require('pg');

async function syncProdutosSchema() {
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao Neon');

    // Colunas esperadas na tabela produtos
    const expectedColumns = [
      { name: 'id', type: 'SERIAL PRIMARY KEY' },
      { name: 'nome', type: 'VARCHAR(255) NOT NULL' },
      { name: 'unidade', type: 'VARCHAR(50)' },
      { name: 'peso', type: 'DECIMAL(10,2)' },
      { name: 'descricao', type: 'TEXT' },
      { name: 'categoria', type: 'VARCHAR(100)' },
      { name: 'tipo_processamento', type: 'VARCHAR(100)' },
      { name: 'perecivel', type: 'BOOLEAN DEFAULT false' },
      { name: 'ativo', type: 'BOOLEAN DEFAULT true' },
      { name: 'created_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    // Verificar colunas existentes
    const existingColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'produtos'
      ORDER BY ordinal_position
    `);

    const existingColumnNames = existingColumns.rows.map(row => row.column_name);
    console.log('\n📋 Colunas existentes:', existingColumnNames.join(', '));

    // Adicionar colunas faltantes
    for (const col of expectedColumns) {
      if (!existingColumnNames.includes(col.name)) {
        console.log(`\n➕ Adicionando coluna: ${col.name}`);
        try {
          await client.query(`ALTER TABLE produtos ADD COLUMN ${col.name} ${col.type}`);
          console.log(`   ✅ Coluna ${col.name} adicionada`);
        } catch (error) {
          console.log(`   ⚠️  Erro ao adicionar ${col.name}: ${error.message}`);
        }
      }
    }

    // Verificar colunas finais
    const finalColumns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'produtos'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Colunas finais na tabela produtos:');
    finalColumns.rows.forEach(row => {
      const isExpected = expectedColumns.some(c => c.name === row.column_name);
      const marker = isExpected ? '✅' : 'ℹ️ ';
      console.log(`   ${marker} ${row.column_name}`);
    });

    console.log('\n✅ Sincronização concluída!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

syncProdutosSchema().catch(console.error);
