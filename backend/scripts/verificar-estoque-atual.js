const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL || ''
});

async function verificar() {
  try {
    console.log('Verificando estoque no banco...\n');
    
    const result = await pool.query(`
      SELECT 
        ec.id,
        p.nome as produto,
        ec.quantidade,
        ec.quantidade_reservada,
        ec.quantidade_disponivel
      FROM estoque_central ec
      INNER JOIN produtos p ON p.id = ec.produto_id
      ORDER BY ec.updated_at DESC
      LIMIT 5
    `);
    
    console.log('Últimos 5 produtos no estoque:');
    result.rows.forEach(row => {
      console.log(`\nProduto: ${row.produto}`);
      console.log(`  Quantidade: ${row.quantidade}`);
      console.log(`  Reservada: ${row.quantidade_reservada}`);
      console.log(`  Disponível: ${row.quantidade_disponivel}`);
    });
    
    console.log('\n\nÚltimas movimentações:');
    const mov = await pool.query(`
      SELECT 
        m.tipo,
        m.quantidade,
        m.quantidade_anterior,
        m.quantidade_posterior,
        p.nome as produto,
        m.created_at
      FROM estoque_central_movimentacoes m
      INNER JOIN estoque_central ec ON ec.id = m.estoque_central_id
      INNER JOIN produtos p ON p.id = ec.produto_id
      ORDER BY m.created_at DESC
      LIMIT 10
    `);
    
    mov.rows.forEach(row => {
      console.log(`\n${row.tipo.toUpperCase()}: ${row.produto}`);
      console.log(`  Quantidade: ${row.quantidade}`);
      console.log(`  Anterior: ${row.quantidade_anterior} → Posterior: ${row.quantidade_posterior}`);
      console.log(`  Data: ${new Date(row.created_at).toLocaleString('pt-BR')}`);
    });
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificar();
