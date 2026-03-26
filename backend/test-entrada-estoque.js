const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testarEntradaEstoque() {
  console.log('\n🔍 Testando registro de entrada no estoque...\n');

  try {
    // Buscar um produto para teste
    const produtoResult = await pool.query(`
      SELECT p.id, p.nome, p.unidade_medida_id, p.unidade_distribuicao,
             um.id as um_id, um.codigo as um_codigo
      FROM produtos p
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      LIMIT 1
    `);

    if (produtoResult.rows.length === 0) {
      console.log('❌ Nenhum produto encontrado');
      return;
    }

    const produto = produtoResult.rows[0];
    console.log('📦 Produto para teste:', {
      id: produto.id,
      nome: produto.nome,
      unidade_medida_id: produto.unidade_medida_id,
      unidade_distribuicao: produto.unidade_distribuicao,
      um_id: produto.um_id,
      um_codigo: produto.um_codigo
    });

    // Testar a query que busca unidade do produto
    console.log('\n🔍 Testando query de busca de unidade...\n');
    
    const unidadeResult = await pool.query(`
      SELECT COALESCE(um.codigo, p.unidade_distribuicao, 'UN') as unidade
      FROM produtos p
      LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
      WHERE p.id = $1
    `, [produto.id]);

    console.log('✅ Unidade encontrada:', unidadeResult.rows[0]);

    // Simular registro de entrada
    console.log('\n🔍 Simulando registro de entrada...\n');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Buscar unidade do produto
      const prodResult = await client.query(
        `SELECT COALESCE(um.codigo, p.unidade_distribuicao, 'UN') as unidade
         FROM produtos p
         LEFT JOIN unidades_medida um ON p.unidade_medida_id = um.id
         WHERE p.id = $1`,
        [produto.id]
      );

      if (prodResult.rows.length === 0) {
        throw new Error('Produto não encontrado');
      }

      const unidadeProduto = prodResult.rows[0].unidade;
      console.log('📏 Unidade do produto:', unidadeProduto);

      // Buscar ou criar estoque
      const estoqueResult = await client.query(
        'SELECT * FROM estoque_central WHERE produto_id = $1',
        [produto.id]
      );

      let estoqueId;
      if (estoqueResult.rows.length === 0) {
        console.log('📦 Criando novo estoque...');
        const novoEstoque = await client.query(
          'INSERT INTO estoque_central (produto_id) VALUES ($1) RETURNING id',
          [produto.id]
        );
        estoqueId = novoEstoque.rows[0].id;
      } else {
        estoqueId = estoqueResult.rows[0].id;
        console.log('📦 Estoque existente ID:', estoqueId);
      }

      const quantidade = 100;
      const lote = 'TESTE-' + Date.now();
      const dataValidade = '2025-12-31';

      // Criar ou atualizar lote
      console.log('📝 Criando lote...');
      const loteResult = await client.query(
        `INSERT INTO estoque_central_lotes 
         (estoque_central_id, lote, data_fabricacao, data_validade, quantidade, observacao)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (estoque_central_id, lote) 
         DO UPDATE SET 
           quantidade = estoque_central_lotes.quantidade + EXCLUDED.quantidade,
           data_validade = EXCLUDED.data_validade,
           observacao = EXCLUDED.observacao
         RETURNING id`,
        [estoqueId, lote, null, dataValidade, quantidade, 'Teste']
      );

      const loteId = loteResult.rows[0].id;
      console.log('📦 Lote criado ID:', loteId);

      // Registrar movimentação COM UNIDADE
      console.log('📝 Registrando movimentação...');
      const movimentacaoResult = await client.query(
        `INSERT INTO estoque_central_movimentacoes 
         (estoque_central_id, lote_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, 
          motivo, observacao, documento, fornecedor, nota_fiscal, usuario_id, usuario_nome, unidade)
         VALUES ($1, $2, 'entrada', $3, 0, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          estoqueId, loteId, quantidade,
          'Teste de entrada', 'Observação teste', null, 'Fornecedor Teste', null,
          2, 'Teste User', unidadeProduto
        ]
      );

      console.log('✅ Movimentação registrada:', movimentacaoResult.rows[0]);

      await client.query('ROLLBACK'); // Não commitar, apenas testar
      console.log('\n✅ Teste concluído com sucesso! (ROLLBACK executado)\n');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testarEntradaEstoque();
