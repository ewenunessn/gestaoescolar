const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkFornecedorContratos() {
  try {
    const fornecedorNome = 'Distribuidora Mesquita';
    
    console.log(`\n🔍 Verificando contratos do fornecedor "${fornecedorNome}"...\n`);
    
    // Buscar fornecedor
    const fornecedor = await pool.query(`
      SELECT id, nome, cnpj, ativo
      FROM fornecedores
      WHERE nome ILIKE $1
    `, [`%${fornecedorNome}%`]);
    
    if (fornecedor.rows.length === 0) {
      console.log('❌ Fornecedor não encontrado');
      await pool.end();
      return;
    }
    
    const fornecedorId = fornecedor.rows[0].id;
    console.log(`✅ Fornecedor encontrado: ID ${fornecedorId} | ${fornecedor.rows[0].nome} | ${fornecedor.rows[0].ativo ? 'Ativo' : 'Inativo'}\n`);
    
    // Verificar contratos
    const contratos = await pool.query(`
      SELECT 
        c.id,
        c.numero,
        c.status,
        c.ativo,
        c.data_inicio,
        c.data_fim,
        COUNT(cp.id) as total_produtos
      FROM contratos c
      LEFT JOIN contrato_produtos cp ON c.id = cp.contrato_id
      WHERE c.fornecedor_id = $1
      GROUP BY c.id
      ORDER BY c.ativo DESC, c.created_at DESC
    `, [fornecedorId]);
    
    console.log(`📦 Total de contratos: ${contratos.rows.length}`);
    console.log(`✅ Contratos ativos: ${contratos.rows.filter(c => c.ativo).length}`);
    console.log(`❌ Contratos inativos: ${contratos.rows.filter(c => !c.ativo).length}\n`);
    
    if (contratos.rows.length > 0) {
      console.log('Lista de contratos:');
      contratos.rows.forEach(c => {
        console.log(`  - ID: ${c.id} | ${c.numero} | Status: ${c.status} | ${c.ativo ? '✅ Ativo' : '❌ Inativo'} | Produtos: ${c.total_produtos}`);
      });
    } else {
      console.log('✅ Nenhum contrato vinculado a este fornecedor.');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    await pool.end();
    process.exit(1);
  }
}

checkFornecedorContratos();
