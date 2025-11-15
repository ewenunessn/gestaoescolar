const { Pool } = require('pg');

// URL do Neon (produção)
const connectionString = 'postgresql://neondb_owner:npg_PDfBTKRsi29G@ep-crimson-violet-adf47gue-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkProdutoModalidades() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando dados de produtos e modalidades...\n');
    
    // 1. Verificar produtos
    const produtos = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sem_tenant
      FROM produtos
    `);
    console.log('📊 Produtos:');
    console.log(`   Total: ${produtos.rows[0].total}`);
    console.log(`   Sem tenant_id: ${produtos.rows[0].sem_tenant}\n`);
    
    // 2. Verificar modalidades
    const modalidades = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sem_tenant
      FROM modalidades
    `);
    console.log('📊 Modalidades:');
    console.log(`   Total: ${modalidades.rows[0].total}`);
    console.log(`   Sem tenant_id: ${modalidades.rows[0].sem_tenant}\n`);
    
    // 3. Verificar produto_modalidades
    const produtoModalidades = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sem_tenant
      FROM produto_modalidades
    `);
    console.log('📊 Produto Modalidades (relacionamento):');
    console.log(`   Total: ${produtoModalidades.rows[0].total}`);
    console.log(`   Sem tenant_id: ${produtoModalidades.rows[0].sem_tenant}\n`);
    
    // 4. Verificar contratos
    const contratos = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN tenant_id IS NULL THEN 1 END) as sem_tenant
      FROM contratos
    `);
    console.log('📊 Contratos:');
    console.log(`   Total: ${contratos.rows[0].total}`);
    console.log(`   Sem tenant_id: ${contratos.rows[0].sem_tenant}\n`);
    
    // 5. Verificar contrato_produtos
    const contratoProdutos = await client.query(`
      SELECT COUNT(*) as total
      FROM contrato_produtos
    `);
    console.log('📊 Contrato Produtos:');
    console.log(`   Total: ${contratoProdutos.rows[0].total}\n`);
    
    // 6. Mostrar alguns exemplos
    if (parseInt(produtos.rows[0].total) > 0) {
      const exemplosProdutos = await client.query(`
        SELECT id, nome, tenant_id,
               (SELECT COUNT(*) FROM produto_modalidades WHERE produto_id = produtos.id) as qtd_modalidades
        FROM produtos
        ORDER BY id
        LIMIT 5
      `);
      
      console.log('📋 Exemplos de produtos:');
      exemplosProdutos.rows.forEach(p => {
        console.log(`   - ${p.nome}`);
        console.log(`     ID: ${p.id}`);
        console.log(`     Tenant: ${p.tenant_id || 'SEM TENANT'}`);
        console.log(`     Modalidades: ${p.qtd_modalidades}`);
        console.log('');
      });
    }
    
    if (parseInt(modalidades.rows[0].total) > 0) {
      const exemplosModalidades = await client.query(`
        SELECT id, nome, tenant_id
        FROM modalidades
        ORDER BY id
        LIMIT 5
      `);
      
      console.log('📋 Exemplos de modalidades:');
      exemplosModalidades.rows.forEach(m => {
        console.log(`   - ${m.nome} (ID: ${m.id}, Tenant: ${m.tenant_id || 'SEM TENANT'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkProdutoModalidades()
  .then(() => {
    console.log('\n✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verificação falhou:', error);
    process.exit(1);
  });
