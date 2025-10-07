// Forçar uso do banco local
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;

require('dotenv').config({ path: '.env.local' });
const db = require('./dist/database');

async function testarAPI() {
  try {
    console.log('🔍 Testando consulta na view_saldo_contratos_itens...\n');
    
    const result = await db.query(`
      SELECT 
        v.*,
        f.nome as fornecedor_nome,
        f.id as fornecedor_id
      FROM view_saldo_contratos_itens v
      JOIN contratos c ON v.contrato_id = c.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Consulta executada com sucesso!\n');
      console.log('📊 Dados retornados:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      console.log('\n📝 Verificando campos importantes:');
      const item = result.rows[0];
      console.log(`   - Produto: ${item.produto_nome}`);
      console.log(`   - Unidade: ${item.produto_unidade || item.unidade}`);
      console.log(`   - Qtd Total: ${item.quantidade_total}`);
      console.log(`   - Qtd Utilizada: ${item.quantidade_utilizada}`);
      console.log(`   - Qtd Disponível: ${item.quantidade_disponivel_real}`);
      console.log(`   - Valor Unitário: ${item.valor_unitario || item.preco_unitario}`);
      console.log(`   - Valor Total Disp: ${item.valor_total_disponivel}`);
      console.log(`   - Status: ${item.status}`);
      console.log(`   - Fornecedor: ${item.fornecedor_nome}`);
    } else {
      console.log('⚠️  Nenhum registro encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testarAPI();
