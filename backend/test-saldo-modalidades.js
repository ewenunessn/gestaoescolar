const db = require('./dist/database');

async function testSaldoModalidades() {
  try {
    console.log('🔍 Testando query de saldo modalidades...');
    
    // Definir contexto do tenant
    const tenantId = '1cc9b18f-2b7d-412d-bb6d-4b8055e9590f';
    console.log('🏢 Definindo contexto do tenant:', tenantId);
    
    await db.query(`SELECT set_tenant_context($1)`, [tenantId]);
    console.log('✅ Contexto definido');
    
    // Testar query simples de modalidades
    console.log('\n📋 Testando query de modalidades...');
    const modalidadesResult = await db.query(`
      SELECT id, nome, codigo_financeiro, valor_repasse
      FROM modalidades
      WHERE ativo = true
        AND tenant_id = current_setting('app.current_tenant_id')::uuid
      ORDER BY nome
    `);
    console.log('✅ Modalidades encontradas:', modalidadesResult.rows.length);
    
    // Testar query simples de produtos de contratos
    console.log('\n📦 Testando query de produtos de contratos...');
    const produtosResult = await db.query(`
      SELECT
        cp.id, cp.contrato_id, cp.produto_id, cp.preco_unitario,
        c.numero as contrato_numero, c.data_inicio, c.data_fim,
        p.nome as produto_nome, p.unidade,
        f.nome as fornecedor_nome
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE cp.ativo = true 
        AND c.ativo = true 
        AND c.status = 'ativo'
        AND c.tenant_id = current_setting('app.current_tenant_id')::uuid
      ORDER BY c.numero, p.nome
    `);
    console.log('✅ Produtos de contratos encontrados:', produtosResult.rows.length);
    
    // Testar query complexa de saldos
    console.log('\n💰 Testando query de saldos (simplificada)...');
    const saldosResult = await db.query(`
      SELECT DISTINCT p.nome as produto_nome,
             array_agg(DISTINCT cp.id) as contrato_produto_ids
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      JOIN fornecedores f ON c.fornecedor_id = f.id
      WHERE cp.ativo = true
        AND c.ativo = true
        AND c.tenant_id = current_setting('app.current_tenant_id')::uuid
      GROUP BY p.nome
      ORDER BY p.nome
      LIMIT 25 OFFSET 0
    `);
    console.log('✅ Produtos com saldos encontrados:', saldosResult.rows.length);
    
    console.log('\n✅ Todos os testes passaram!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

testSaldoModalidades();
