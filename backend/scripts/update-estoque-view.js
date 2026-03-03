const { Pool } = require('pg');

const localPool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/alimentacao_escolar'
});

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

const updateView = `
DROP VIEW IF EXISTS vw_estoque_central_completo CASCADE;

CREATE VIEW vw_estoque_central_completo AS
SELECT 
  ec.id,
  ec.produto_id,
  p.nome as produto_nome,
  p.unidade,
  p.categoria,
  CAST(ec.quantidade AS NUMERIC) as quantidade,
  CAST(ec.quantidade_reservada AS NUMERIC) as quantidade_reservada,
  CAST(ec.quantidade_disponivel AS NUMERIC) as quantidade_disponivel,
  CAST(COUNT(DISTINCT ecl.id) AS INTEGER) as total_lotes,
  MIN(ecl.data_validade) as proxima_validade,
  ec.created_at,
  ec.updated_at
FROM estoque_central ec
INNER JOIN produtos p ON p.id = ec.produto_id
LEFT JOIN estoque_central_lotes ecl ON ecl.estoque_central_id = ec.id AND ecl.quantidade > 0
GROUP BY ec.id, p.id, p.nome, p.unidade, p.categoria;
`;

async function updateBothDatabases() {
  try {
    console.log('Atualizando view no banco LOCAL...');
    await localPool.query(updateView);
    console.log('✓ View atualizada no banco LOCAL');

    console.log('\nAtualizando view no banco NEON...');
    await neonPool.query(updateView);
    console.log('✓ View atualizada no banco NEON');

    console.log('\n✓ View atualizada em ambos os bancos com sucesso!');
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

updateBothDatabases();
