const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'alimentacao_escolar',
  password: 'admin123',
  port: 5432,
});

async function debugSaldoPedido() {
  try {
    console.log('🔍 Verificando dados de Arroz...\n');

    // 1. Verificar contrato_produtos
    const cpResult = await pool.query(`
      SELECT cp.id, p.nome as produto, c.numero as contrato, 
             cp.quantidade_contratada, cp.unidade
      FROM contrato_produtos cp
      JOIN produtos p ON cp.produto_id = p.id
      JOIN contratos c ON cp.contrato_id = c.id
      WHERE p.nome ILIKE '%arroz%' AND cp.ativo = true
      LIMIT 5
    `);
    
    console.log('📦 Contrato Produtos (Arroz):');
    console.table(cpResult.rows);

    if (cpResult.rows.length > 0) {
      const cpId = cpResult.rows[0].id;
      
      // 2. Verificar modalidades
      const modalidadesResult = await pool.query(`
        SELECT cpm.id, cpm.contrato_produto_id, m.nome as modalidade,
               cpm.quantidade_inicial, cpm.quantidade_consumida, 
               cpm.quantidade_disponivel, cpm.ativo
        FROM contrato_produtos_modalidades cpm
        JOIN modalidades m ON cpm.modalidade_id = m.id
        WHERE cpm.contrato_produto_id = $1
      `, [cpId]);
      
      console.log('\n📊 Modalidades para contrato_produto_id', cpId, ':');
      console.table(modalidadesResult.rows);

      // 3. Testar a query do pedido
      const queryPedido = `
        SELECT 
          cp.id as contrato_produto_id,
          p.nome as produto_nome,
          COALESCE(cp.unidade, 'Kg') as unidade,
          cp.quantidade_contratada,
          COALESCE(SUM(cpm.quantidade_disponivel), cp.quantidade_contratada) as saldo_disponivel,
          COUNT(cpm.id) as total_modalidades
        FROM contrato_produtos cp
        JOIN produtos p ON cp.produto_id = p.id
        JOIN contratos c ON cp.contrato_id = c.id
        LEFT JOIN contrato_produtos_modalidades cpm ON cp.id = cpm.contrato_produto_id AND cpm.ativo = true
        WHERE cp.id = $1
        GROUP BY cp.id, p.nome, cp.unidade, cp.quantidade_contratada
      `;
      
      const pedidoResult = await pool.query(queryPedido, [cpId]);
      
      console.log('\n🎯 Query do Pedido (resultado):');
      console.table(pedidoResult.rows);

      // 4. Verificar soma manual
      const somaManual = modalidadesResult.rows.reduce((sum, row) => {
        return sum + parseFloat(row.quantidade_disponivel || 0);
      }, 0);
      
      console.log('\n✅ Soma manual das modalidades:', somaManual);
      console.log('✅ Saldo retornado pela query:', pedidoResult.rows[0]?.saldo_disponivel);
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

debugSaldoPedido();
