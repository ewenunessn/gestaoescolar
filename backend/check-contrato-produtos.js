const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkContratoProdutos() {
  try {
    const contratoId = 7;
    
    console.log(`\n🔍 Verificando produtos do contrato ${contratoId}...\n`);
    
    // Verificar produtos ativos
    const produtosAtivos = await pool.query(`
      SELECT 
        cp.id,
        cp.produto_id,
        p.nome as produto_nome,
        cp.ativo,
        cp.preco_unitario,
        cp.quantidade_contratada
      FROM contrato_produtos cp
      JOIN produtos p ON cp.produto_id = p.id
      WHERE cp.contrato_id = $1
      ORDER BY cp.ativo DESC, p.nome
    `, [contratoId]);
    
    console.log(`📦 Total de produtos: ${produtosAtivos.rows.length}`);
    console.log(`✅ Produtos ativos: ${produtosAtivos.rows.filter(p => p.ativo).length}`);
    console.log(`❌ Produtos inativos: ${produtosAtivos.rows.filter(p => !p.ativo).length}\n`);
    
    if (produtosAtivos.rows.length > 0) {
      console.log('Lista de produtos:');
      produtosAtivos.rows.forEach(p => {
        console.log(`  - ID: ${p.id} | ${p.produto_nome} | ${p.ativo ? '✅ Ativo' : '❌ Inativo'}`);
      });
    } else {
      console.log('✅ Nenhum produto associado a este contrato.');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

checkContratoProdutos();
