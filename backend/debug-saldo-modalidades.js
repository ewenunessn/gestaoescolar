const db = require('./src/database.ts');

async function debugSaldoModalidades() {
  try {
    console.log('🔍 Verificando dados de saldo por modalidades...\n');

    // 1. Verificar modalidades
    console.log('1. Modalidades cadastradas:');
    const modalidades = await db.query('SELECT id, nome, ativo FROM modalidades ORDER BY nome');
    console.table(modalidades.rows);

    // 2. Verificar contratos ativos
    console.log('\n2. Contratos ativos:');
    const contratos = await db.query(`
      SELECT c.id, c.numero, f.nome as fornecedor, c.ativo 
      FROM contratos c 
      JOIN fornecedores f ON c.fornecedor_id = f.id 
      WHERE c.ativo = true 
      ORDER BY c.numero
    `);
    console.table(contratos.rows);

    // 3. Verificar produtos de contratos
    console.log('\n3. Produtos de contratos:');
    const contratosProdutos = await db.query(`
      SELECT cp.id, c.numero as contrato, p.nome as produto, cp.quantidade_contratada, cp.preco_unitario
      FROM contrato_produtos cp
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      WHERE cp.ativo = true AND c.ativo = true
      ORDER BY c.numero, p.nome
    `);
    console.table(contratosProdutos.rows);

    // 4. Verificar saldos por modalidade
    console.log('\n4. Saldos por modalidade (contrato_produtos_modalidades):');
    const saldosModalidades = await db.query(`
      SELECT 
        cpm.id,
        c.numero as contrato,
        p.nome as produto,
        m.nome as modalidade,
        cpm.quantidade_inicial,
        cpm.quantidade_consumida,
        cpm.quantidade_disponivel,
        cpm.ativo
      FROM contrato_produtos_modalidades cpm
      JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      JOIN modalidades m ON cpm.modalidade_id = m.id
      ORDER BY c.numero, p.nome, m.nome
    `);
    console.table(saldosModalidades.rows);

    // 5. Verificar especificamente CRECHE
    console.log('\n5. Dados específicos da modalidade CRECHE:');
    const crecheData = await db.query(`
      SELECT 
        cpm.id,
        c.numero as contrato,
        p.nome as produto,
        cpm.quantidade_inicial,
        cpm.quantidade_consumida,
        cpm.quantidade_disponivel,
        cpm.ativo
      FROM contrato_produtos_modalidades cpm
      JOIN contrato_produtos cp ON cpm.contrato_produto_id = cp.id
      JOIN contratos c ON cp.contrato_id = c.id
      JOIN produtos p ON cp.produto_id = p.id
      JOIN modalidades m ON cpm.modalidade_id = m.id
      WHERE m.nome = 'CRECHE'
      ORDER BY c.numero, p.nome
    `);
    console.table(crecheData.rows);

    // 6. Verificar se há alunos na modalidade CRECHE
    console.log('\n6. Escolas com modalidade CRECHE:');
    const escolasCreche = await db.query(`
      SELECT 
        e.nome as escola,
        em.quantidade_alunos
      FROM escola_modalidades em
      JOIN escolas e ON em.escola_id = e.id
      JOIN modalidades m ON em.modalidade_id = m.id
      WHERE m.nome = 'CRECHE'
      ORDER BY e.nome
    `);
    console.table(escolasCreche.rows);

    // 7. Total de alunos por modalidade
    console.log('\n7. Total de alunos por modalidade:');
    const totalAlunos = await db.query(`
      SELECT 
        m.nome as modalidade,
        SUM(em.quantidade_alunos) as total_alunos,
        COUNT(em.id) as total_escolas
      FROM escola_modalidades em
      JOIN modalidades m ON em.modalidade_id = m.id
      GROUP BY m.id, m.nome
      ORDER BY m.nome
    `);
    console.table(totalAlunos.rows);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

debugSaldoModalidades();