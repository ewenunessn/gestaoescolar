const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function testarConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testando constraint de tipo_processamento...\n');

    // Teste 1: Valor válido
    console.log('✅ Teste 1: Inserir com valor válido "in natura"');
    try {
      await client.query(`
        INSERT INTO produtos (nome, tipo_processamento, ativo)
        VALUES ('Teste In Natura', 'in natura', false)
      `);
      console.log('   ✓ Sucesso!\n');
      await client.query(`DELETE FROM produtos WHERE nome = 'Teste In Natura'`);
    } catch (error) {
      console.log(`   ✗ Erro: ${error.message}\n`);
    }

    // Teste 2: Valor válido
    console.log('✅ Teste 2: Inserir com valor válido "minimamente processado"');
    try {
      await client.query(`
        INSERT INTO produtos (nome, tipo_processamento, ativo)
        VALUES ('Teste Minimamente', 'minimamente processado', false)
      `);
      console.log('   ✓ Sucesso!\n');
      await client.query(`DELETE FROM produtos WHERE nome = 'Teste Minimamente'`);
    } catch (error) {
      console.log(`   ✗ Erro: ${error.message}\n`);
    }

    // Teste 3: Valor NULL (deve ser aceito)
    console.log('✅ Teste 3: Inserir com valor NULL');
    try {
      await client.query(`
        INSERT INTO produtos (nome, tipo_processamento, ativo)
        VALUES ('Teste NULL', NULL, false)
      `);
      console.log('   ✓ Sucesso!\n');
      await client.query(`DELETE FROM produtos WHERE nome = 'Teste NULL'`);
    } catch (error) {
      console.log(`   ✗ Erro: ${error.message}\n`);
    }

    // Teste 4: Valor inválido (deve falhar)
    console.log('❌ Teste 4: Inserir com valor inválido "Processado" (maiúscula)');
    try {
      await client.query(`
        INSERT INTO produtos (nome, tipo_processamento, ativo)
        VALUES ('Teste Inválido', 'Processado', false)
      `);
      console.log('   ✗ ERRO: Constraint não está funcionando!\n');
      await client.query(`DELETE FROM produtos WHERE nome = 'Teste Inválido'`);
    } catch (error) {
      console.log('   ✓ Constraint funcionou! Erro esperado:\n');
      console.log(`   "${error.message}"\n`);
    }

    // Teste 5: Valor inválido (deve falhar)
    console.log('❌ Teste 5: Inserir com valor inválido "outro valor"');
    try {
      await client.query(`
        INSERT INTO produtos (nome, tipo_processamento, ativo)
        VALUES ('Teste Inválido 2', 'outro valor', false)
      `);
      console.log('   ✗ ERRO: Constraint não está funcionando!\n');
      await client.query(`DELETE FROM produtos WHERE nome = 'Teste Inválido 2'`);
    } catch (error) {
      console.log('   ✓ Constraint funcionou! Erro esperado:\n');
      console.log(`   "${error.message}"\n`);
    }

    console.log('✅ Todos os testes passaram! Constraint está funcionando corretamente.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar
testarConstraint().catch(console.error);
