const { Pool } = require('pg');
require('dotenv').config();

const sqlDropView = `DROP VIEW IF EXISTS vw_comprovantes_completos;`;

const sqlCreateView = `
CREATE VIEW vw_comprovantes_completos AS
SELECT 
  c.id,
  c.numero_comprovante,
  c.escola_id,
  e.nome as escola_nome,
  e.endereco as escola_endereco,
  c.data_entrega,
  c.nome_quem_entregou,
  c.nome_quem_recebeu,
  c.cargo_recebedor,
  c.observacao,
  c.assinatura_base64,
  c.total_itens,
  c.status,
  c.created_at,
  json_agg(
    json_build_object(
      'id', ci.id,
      'produto_nome', ci.produto_nome,
      'quantidade_entregue', ci.quantidade_entregue,
      'unidade', ci.unidade,
      'lote', ci.lote
    ) ORDER BY ci.id
  ) as itens
FROM comprovantes_entrega c
INNER JOIN escolas e ON c.escola_id = e.id
LEFT JOIN comprovante_itens ci ON c.id = ci.comprovante_id
GROUP BY c.id, e.nome, e.endereco;
`;

async function updateView(connectionString, ambiente) {
  const pool = new Pool({
    connectionString,
    ssl: ambiente === 'neon' ? { rejectUnauthorized: false } : undefined
  });

  try {
    console.log(`\n🔄 Atualizando view em ${ambiente.toUpperCase()}...`);
    
    await pool.query(sqlDropView);
    console.log(`   ✓ View antiga removida`);
    
    await pool.query(sqlCreateView);
    console.log(`   ✓ View nova criada`);
    
    console.log(`✅ View atualizada com sucesso em ${ambiente.toUpperCase()}`);
    
    // Testar a view
    const result = await pool.query(`
      SELECT 
        id, 
        numero_comprovante,
        CASE 
          WHEN assinatura_base64 IS NOT NULL THEN 'SIM'
          ELSE 'NÃO'
        END as tem_assinatura
      FROM vw_comprovantes_completos
      LIMIT 3
    `);
    
    console.log(`\n📋 Teste da view (${ambiente}):`);
    result.rows.forEach(r => {
      console.log(`   ${r.numero_comprovante} - Assinatura: ${r.tem_assinatura}`);
    });
    
  } catch (error) {
    console.error(`❌ Erro em ${ambiente}:`, error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🚀 Atualizando view vw_comprovantes_completos...');
  
  // Atualizar local
  if (process.env.DATABASE_URL) {
    await updateView(process.env.DATABASE_URL, 'local');
  } else {
    console.log('⚠️  DATABASE_URL não encontrada, pulando local');
  }
  
  // Atualizar Neon
  if (process.env.POSTGRES_URL) {
    await updateView(process.env.POSTGRES_URL, 'neon');
  } else {
    console.log('⚠️  POSTGRES_URL não encontrada, pulando Neon');
  }
  
  console.log('\n✅ Processo concluído!');
}

main();
