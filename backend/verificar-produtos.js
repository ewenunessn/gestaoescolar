const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'alimentacao_escolar',
  user: 'postgres',
  password: 'admin123'
});

async function verificar() {
  try {
    const produtos = await pool.query('SELECT id, nome, unidade FROM produtos LIMIT 10');
    
    console.log('\n📦 Produtos no banco:');
    console.log('═'.repeat(80));
    
    produtos.rows.forEach(p => {
      console.log(`ID: ${p.id} | Nome: ${p.nome} | Unidade: ${p.unidade || '(vazio)'}`);
    });
    
    console.log('═'.repeat(80));
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificar();
