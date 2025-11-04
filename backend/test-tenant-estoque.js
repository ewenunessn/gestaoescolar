const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true'
});

async function testTenantEstoque() {
  try {
    console.log('🔄 Testando implementação de tenant no estoque...');
    
    // 1. Verificar se as colunas tenant_id foram adicionadas
    console.log('\n1. Verificando estrutura das tabelas...');
    
    const tables = ['estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'tenant_id'
      `, [table]);
      
      if (result.rows.length > 0) {
        console.log(`✅ ${table}: tenant_id encontrado (${result.rows[0].data_type})`);
      } else {
        console.log(`❌ ${table}: tenant_id NÃO encontrado`);
      }
    }
    
    // 2. Verificar se existem dados com tenant_id
    console.log('\n2. Verificando dados com tenant_id...');
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT COUNT(*) as total, 
               COUNT(tenant_id) as com_tenant_id,
               COUNT(DISTINCT tenant_id) as tenants_distintos
        FROM ${table}
      `);
      
      const { total, com_tenant_id, tenants_distintos } = result.rows[0];
      console.log(`📊 ${table}: ${total} registros, ${com_tenant_id} com tenant_id, ${tenants_distintos} tenants distintos`);
    }
    
    // 3. Verificar se os triggers estão funcionando
    console.log('\n3. Testando triggers...');
    
    // Verificar se existe uma escola para teste
    const escolaResult = await pool.query('SELECT id, tenant_id FROM escolas LIMIT 1');
    if (escolaResult.rows.length === 0) {
      console.log('⚠️ Nenhuma escola encontrada para teste');
      return;
    }
    
    const escola = escolaResult.rows[0];
    console.log(`📍 Usando escola ID: ${escola.id}, tenant_id: ${escola.tenant_id}`);
    
    // Verificar se existe um produto para teste
    const produtoResult = await pool.query('SELECT id FROM produtos LIMIT 1');
    if (produtoResult.rows.length === 0) {
      console.log('⚠️ Nenhum produto encontrado para teste');
      return;
    }
    
    const produto = produtoResult.rows[0];
    console.log(`📦 Usando produto ID: ${produto.id}`);
    
    // Testar inserção com trigger
    console.log('\n4. Testando inserção com trigger...');
    
    try {
      // Inserir um registro de teste no estoque_escolas
      const insertResult = await pool.query(`
        INSERT INTO estoque_escolas (escola_id, produto_id, quantidade_atual)
        VALUES ($1, $2, 999.99)
        RETURNING id, tenant_id
      `, [escola.id, produto.id]);
      
      const novoRegistro = insertResult.rows[0];
      console.log(`✅ Registro inserido com ID: ${novoRegistro.id}, tenant_id: ${novoRegistro.tenant_id}`);
      
      // Limpar o registro de teste
      await pool.query('DELETE FROM estoque_escolas WHERE id = $1', [novoRegistro.id]);
      console.log('🧹 Registro de teste removido');
      
    } catch (error) {
      console.log('❌ Erro ao testar trigger:', error.message);
    }
    
    // 5. Verificar índices
    console.log('\n5. Verificando índices...');
    
    const indexResult = await pool.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('estoque_escolas', 'estoque_lotes', 'estoque_escolas_historico')
        AND indexname LIKE '%tenant%'
      ORDER BY tablename, indexname
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('📈 Índices com tenant encontrados:');
      indexResult.rows.forEach(row => {
        console.log(`  - ${row.tablename}: ${row.indexname}`);
      });
    } else {
      console.log('⚠️ Nenhum índice com tenant encontrado');
    }
    
    console.log('\n✅ Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testTenantEstoque();