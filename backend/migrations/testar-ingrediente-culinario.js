const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function testarIngredienteCulinario() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testando "ingrediente culinário"...\n');

    // Teste 1: Inserir com "ingrediente culinário"
    console.log('✅ Teste 1: Inserir com valor "ingrediente culinário"');
    try {
      await client.query(`
        INSERT INTO produtos (nome, tipo_processamento, ativo)
        VALUES ('Teste Ingrediente Culinário', 'ingrediente culinário', false)
      `);
      console.log('   ✓ Sucesso! Valor aceito.\n');
      await client.query(`DELETE FROM produtos WHERE nome = 'Teste Ingrediente Culinário'`);
    } catch (error) {
      console.log(`   ✗ Erro: ${error.message}\n`);
    }

    // Teste 2: Inserir com "Ingrediente Culinário" (maiúscula - deve falhar)
    console.log('❌ Teste 2: Inserir com valor "Ingrediente Culinário" (maiúscula)');
    try {
      await client.query(`
        INSERT INTO produtos (nome, tipo_processamento, ativo)
        VALUES ('Teste Maiúscula', 'Ingrediente Culinário', false)
      `);
      console.log('   ✗ ERRO: Constraint não está funcionando!\n');
      await client.query(`DELETE FROM produtos WHERE nome = 'Teste Maiúscula'`);
    } catch (error) {
      console.log('   ✓ Constraint funcionou! Rejeitou maiúscula.\n');
    }

    // Teste 3: Verificar todos os valores válidos
    console.log('📋 Teste 3: Verificar todos os valores válidos\n');
    const valoresValidos = [
      'in natura',
      'minimamente processado',
      'ingrediente culinário',
      'processado',
      'ultraprocessado'
    ];

    for (const valor of valoresValidos) {
      try {
        await client.query(`
          INSERT INTO produtos (nome, tipo_processamento, ativo)
          VALUES ($1, $2, false)
        `, [`Teste ${valor}`, valor]);
        
        console.log(`   ✅ "${valor}" → Aceito`);
        
        await client.query(`DELETE FROM produtos WHERE nome = $1`, [`Teste ${valor}`]);
      } catch (error) {
        console.log(`   ❌ "${valor}" → Rejeitado: ${error.message}`);
      }
    }

    console.log('\n✅ Testes concluídos!');

  } catch (error) {
    console.error('❌ Erro geral:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
testarIngredienteCulinario().catch(console.error);
