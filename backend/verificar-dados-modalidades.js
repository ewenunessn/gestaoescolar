require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function verificarDados() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    console.log('📊 Verificando dados nas tabelas...\n');
    
    // Verificar contratos ativos
    const contratos = await client.query(`
      SELECT COUNT(*) as total FROM contratos WHERE ativo = true AND status = 'ativo'
    `);
    console.log(`✅ Contratos ativos: ${contratos.rows[0].total}`);
    
    // Verificar produtos de contratos
    const contratoProdutos = await client.query(`
      SELECT COUNT(*) as total FROM contrato_produtos WHERE ativo = true
    `);
    console.log(`✅ Produtos de contratos ativos: ${contratoProdutos.rows[0].total}`);
    
    // Verificar modalidades
    const modalidades = await client.query(`
      SELECT COUNT(*) as total FROM modalidades WHERE ativo = true
    `);
    console.log(`✅ Modalidades ativas: ${modalidades.rows[0].total}`);
    
    // Verificar saldos por modalidade
    const saldos = await client.query(`
      SELECT COUNT(*) as total FROM contrato_produtos_modalidades
    `);
    console.log(`✅ Saldos por modalidade cadastrados: ${saldos.rows[0].total}`);
    
    console.log('\n📝 Resumo:');
    if (saldos.rows[0].total === '0') {
      console.log('⚠️  Não há saldos por modalidade cadastrados!');
      console.log('💡 Você precisa cadastrar os saldos iniciais por modalidade na interface.');
      console.log('   Acesse: Saldo Contratos > Modalidades > Cadastrar Saldo');
    } else {
      console.log('✅ Há saldos cadastrados. A view deve funcionar!');
    }

    client.release();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verificarDados();
