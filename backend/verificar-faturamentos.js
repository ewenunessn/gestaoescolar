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
    // Verificar faturamentos
    const faturamentos = await pool.query(`
      SELECT id, pedido_id, numero, status, valor_total, created_at
      FROM faturamentos 
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    console.log('\n📊 Faturamentos no banco:');
    console.log('═'.repeat(80));
    
    if (faturamentos.rows.length === 0) {
      console.log('❌ Nenhum faturamento encontrado!');
    } else {
      faturamentos.rows.forEach(f => {
        console.log(`ID: ${f.id} | Pedido: ${f.pedido_id} | Número: ${f.numero} | Status: ${f.status} | Valor: R$ ${f.valor_total}`);
      });
    }
    
    console.log('═'.repeat(80));
    console.log(`\nTotal: ${faturamentos.rows.length} faturamento(s)\n`);
    
    // Verificar itens de faturamento
    const itens = await pool.query(`
      SELECT COUNT(*) as total
      FROM faturamento_itens
    `);
    
    console.log(`📦 Total de itens de faturamento: ${itens.rows[0].total}\n`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificar();
