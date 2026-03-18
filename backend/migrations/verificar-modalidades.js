const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verificarModalidades() {
  try {
    console.log('🔍 Verificando modalidades no banco de dados...\n');

    // Listar todas as modalidades
    const result = await pool.query(`
      SELECT 
        id,
        nome,
        descricao,
        codigo_financeiro,
        ativo,
        created_at
      FROM modalidades
      ORDER BY nome
    `);

    console.log(`📊 Total de modalidades: ${result.rows.length}\n`);

    if (result.rows.length === 0) {
      console.log('⚠️  Nenhuma modalidade encontrada no banco de dados!');
      console.log('💡 Você precisa cadastrar modalidades antes de criar cardápios.\n');
    } else {
      console.log('📋 Modalidades cadastradas:\n');
      result.rows.forEach((modalidade, index) => {
        console.log(`${index + 1}. ${modalidade.nome}`);
        console.log(`   ID: ${modalidade.id}`);
        console.log(`   Status: ${modalidade.ativo ? '✅ Ativa' : '❌ Inativa'}`);
        if (modalidade.descricao) {
          console.log(`   Descrição: ${modalidade.descricao}`);
        }
        if (modalidade.codigo_financeiro) {
          console.log(`   Código Financeiro: ${modalidade.codigo_financeiro}`);
        }
        console.log('');
      });

      const ativas = result.rows.filter(m => m.ativo).length;
      const inativas = result.rows.filter(m => !m.ativo).length;
      
      console.log(`\n📈 Resumo:`);
      console.log(`   ✅ Ativas: ${ativas}`);
      console.log(`   ❌ Inativas: ${inativas}`);
    }

  } catch (error) {
    console.error('❌ Erro ao verificar modalidades:', error);
  } finally {
    await pool.end();
  }
}

verificarModalidades();
