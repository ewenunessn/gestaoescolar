const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function verificarEstrutura() {
  try {
    await client.connect();
    console.log('🔍 Verificando estrutura das tabelas de refeições...\n');

    // Verificar tabela refeicao_produtos
    console.log('📋 Tabela: refeicao_produtos');
    const refeicaoProdutos = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'refeicao_produtos'
      ORDER BY ordinal_position
    `);
    console.log('Colunas:', refeicaoProdutos.rows);
    console.log('');

    // Verificar tabela refeicao_produto_modalidade
    console.log('📋 Tabela: refeicao_produto_modalidade');
    const refeicaoProdutoModalidade = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'refeicao_produto_modalidade'
      ORDER BY ordinal_position
    `);
    console.log('Colunas:', refeicaoProdutoModalidade.rows);
    console.log('');

    // Verificar tabela refeicao_ingredientes (se existir)
    console.log('📋 Tabela: refeicao_ingredientes');
    const refeicaoIngredientes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'refeicao_ingredientes'
      ORDER BY ordinal_position
    `);
    console.log('Colunas:', refeicaoIngredientes.rows);
    console.log('');

    // Verificar dados de exemplo em refeicao_produtos
    console.log('📊 Exemplo de dados em refeicao_produtos:');
    const exemploProdutos = await client.query(`
      SELECT * FROM refeicao_produtos LIMIT 1
    `);
    if (exemploProdutos.rows.length > 0) {
      console.log('Colunas reais:', Object.keys(exemploProdutos.rows[0]));
      console.log('Exemplo:', exemploProdutos.rows[0]);
    } else {
      console.log('Nenhum dado encontrado');
    }
    console.log('');

    // Verificar dados de exemplo em refeicao_produto_modalidade
    console.log('📊 Exemplo de dados em refeicao_produto_modalidade:');
    const exemploModalidade = await client.query(`
      SELECT * FROM refeicao_produto_modalidade LIMIT 1
    `);
    if (exemploModalidade.rows.length > 0) {
      console.log('Colunas reais:', Object.keys(exemploModalidade.rows[0]));
      console.log('Exemplo:', exemploModalidade.rows[0]);
    } else {
      console.log('Nenhum dado encontrado');
    }

    console.log('\n✅ Verificação concluída!');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    await client.end();
    process.exit(1);
  }
}

verificarEstrutura();
