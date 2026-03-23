require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function corrigir() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Corrigindo usuário do pedido...\n');
    
    // Atualizar pedido para usar usuário ID 2 (Ewerton Nunes)
    const result = await client.query(`
      UPDATE pedidos 
      SET usuario_criacao_id = 2
      WHERE numero = 'PED-MAR2026000001'
      RETURNING id, numero, usuario_criacao_id
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Pedido atualizado:');
      console.log('   ID:', result.rows[0].id);
      console.log('   Número:', result.rows[0].numero);
      console.log('   Novo Usuario ID:', result.rows[0].usuario_criacao_id);
      console.log('');
      
      // Verificar se agora aparece na listagem
      const listagemResult = await client.query(`
        SELECT
          p.id,
          p.numero,
          p.status,
          p.valor_total,
          u.nome as usuario_criacao_nome,
          COUNT(DISTINCT pi.id) as total_itens,
          STRING_AGG(DISTINCT f.nome, ', ') as fornecedores_nomes
        FROM pedidos p
        JOIN usuarios u ON p.usuario_criacao_id = u.id
        LEFT JOIN pedido_itens pi ON p.id = pi.pedido_id
        LEFT JOIN contrato_produtos cp ON pi.contrato_produto_id = cp.id
        LEFT JOIN contratos c ON cp.contrato_id = c.id
        LEFT JOIN fornecedores f ON c.fornecedor_id = f.id
        WHERE p.numero = 'PED-MAR2026000001'
        GROUP BY p.id, u.nome
      `);
      
      if (listagemResult.rows.length > 0) {
        console.log('✅ Pedido agora aparece na listagem:');
        const p = listagemResult.rows[0];
        console.log('   Número:', p.numero);
        console.log('   Status:', p.status);
        console.log('   Valor:', 'R$', Number(p.valor_total).toFixed(2));
        console.log('   Usuário:', p.usuario_criacao_nome);
        console.log('   Itens:', p.total_itens);
        console.log('   Fornecedores:', p.fornecedores_nomes);
        console.log('');
        console.log('🎉 Pedido corrigido com sucesso! Atualize a página no navegador.');
      } else {
        console.log('❌ Ainda não aparece na listagem');
      }
    } else {
      console.log('❌ Pedido não encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

corrigir();
